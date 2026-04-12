import json
import re
import unicodedata
from datetime import date, datetime
from typing import Any


def _escape_like(term: str) -> str:
    """Echappe % et _ pour usage dans ILIKE (PostgreSQL)."""
    if not term:
        return term
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Convertit en float sans lever d'exception."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s.upper() in ("N/A", "NA", "-", ""):
        return default
    s = re.sub(r"[€$£\s]", "", s)
    s = s.replace(",", ".")
    try:
        return float(s)
    except (ValueError, TypeError):
        return default


def _parse_date(val: Any) -> date | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _normalize_text_key(val: Any) -> str:
    s = str(val or "").strip().lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def _product_key(product: dict) -> str:
    designation = product.get("designation_fr") or product.get("designation_raw") or ""
    fournisseur = product.get("fournisseur") or ""
    unite = product.get("unite") or "unite"
    key = f"{_normalize_text_key(fournisseur)}::{_normalize_text_key(designation)}::{_normalize_text_key(unite)}"
    return key[:300]


def _encode_geohash(lat: float, lng: float, precision: int = 6) -> str:
    alphabet = "0123456789bcdefghjkmnpqrstuvwxyz"
    lat_interval = [-90.0, 90.0]
    lng_interval = [-180.0, 180.0]
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True
    while len(geohash) < precision:
        if even:
            mid = (lng_interval[0] + lng_interval[1]) / 2
            if lng > mid:
                ch |= bits[bit]
                lng_interval[0] = mid
            else:
                lng_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if lat > mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(alphabet[ch])
            bit = 0
            ch = 0
    return "".join(geohash)


_CITY_GEO_MAP: dict[str, tuple[str, float, float]] = {
    "barcelona": ("ES", 41.3874, 2.1686),
    "girona": ("ES", 41.9794, 2.8214),
    "tarragona": ("ES", 41.1189, 1.2445),
    "lleida": ("ES", 41.6176, 0.6200),
    "perpignan": ("FR", 42.6887, 2.8948),
    "montpellier": ("FR", 43.6111, 3.8767),
    "toulouse": ("FR", 43.6047, 1.4442),
}


def _infer_supplier_geo(
    fournisseur: str,
) -> tuple[str | None, str | None, float | None, float | None, str | None, str | None]:
    norm = _normalize_text_key(fournisseur)
    for city_key, (country, lat, lng) in _CITY_GEO_MAP.items():
        if city_key in norm:
            return city_key.title(), country, lat, lng, _encode_geohash(lat, lng), "medium"
    return None, None, None, None, None, "low"


def _product_attributes_dict(product: dict) -> dict:
    raw = product.get("attributes")
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw) if raw.strip() else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _product_attributes_json_param(product: dict) -> str:
    """JSON texte pour asyncpg : obligatoire pour les lots ``unnest(..., $n::jsonb[])`` (pas de dict dans un array)."""
    return json.dumps(_product_attributes_dict(product), ensure_ascii=False)


def _optional_conseille_vente(product: dict) -> float | None:
    """NULL si absent / non renseigné — ne pas écraser le catalogue au scan."""
    if "prix_conseille_vente" not in product:
        return None
    v = product.get("prix_conseille_vente")
    if v is None:
        return None
    f = _safe_float(v, default=0.0)
    return None if f <= 0 else f


def _upsert_params(product: dict, source: str, user_id: int | None) -> tuple:
    city, country, lat, lng, geohash, geo_confidence = _infer_supplier_geo(
        str(product.get("fournisseur", ""))
    )
    return (
        user_id,
        _product_key(product),
        product.get("fournisseur", ""),
        product.get("designation_raw", ""),
        product.get("designation_fr", ""),
        product.get("famille", "Autre"),
        product.get("unite", "unité"),
        _safe_float(product.get("prix_brut_ht")),
        _safe_float(product.get("remise_pct")),
        _safe_float(product.get("prix_remise_ht")),
        _safe_float(product.get("prix_ttc_iva21")),
        _safe_float(product.get("prix_ttc_remise")),
        _safe_float(product.get("prix_ttc_non_remise")),
        _optional_conseille_vente(product),
        product.get("numero_facture"),
        _parse_date(product.get("date_facture")),
        product.get("confidence", "high"),
        source,
        city,
        country,
        lat,
        lng,
        geohash,
        geo_confidence,
        _product_attributes_json_param(product),
    )
