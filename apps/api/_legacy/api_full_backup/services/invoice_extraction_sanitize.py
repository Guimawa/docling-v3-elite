"""
Post-traitement extraction facture : retire lignes « totaux », corrige prix incohérents, dédoublonne.
"""

from __future__ import annotations

import logging
import re

from schemas.invoice import InvoiceExtractionResult, Product

logger = logging.getLogger(__name__)

# TVA 21 % (ES / factures BigMat) — cohérence TTC vs HT ligne
_TVA_MULT = 1.21
_TTC_TOL_EUR = 1.5  # tolérance OCR sur les montants TTC

# Lignes très courtes « synthèse » (évite d'enlever un libellé produit long)
_GARBAGE_SHORT = re.compile(
    r"(?i)^\s*(total|sous[-\s]?total|tva|iva|vat|base\s+imposable)(\s*[\d.:,%€eur\-+])*\s*$",
)


def _is_garbage_line(p: Product) -> bool:
    raw = (p.designation_raw or "").strip()
    fr = (p.designation_fr or "").strip()
    if len(raw) < 2 and len(fr) < 2:
        return True
    for d in (raw, fr):
        if len(d) <= 44 and _GARBAGE_SHORT.match(d):
            return True
    return False


def _repair_ttc_coherence(d: dict) -> None:
    """
    Corrige l’inversion fréquente prix_ttc_remise / prix_ttc_non_remise (colonnes mal lues).

    Invariants : si remise > 0 et brut HT > net HT, le TTC après remise est strictement
    inférieur au TTC « catalogue » (brut × 1,21). Sinon on compare aux valeurs attendues
    depuis brut / net et on échange si la somme des écarts diminue.
    """
    brut = float(d.get("prix_brut_ht") or 0)
    rem = float(d.get("remise_pct") or 0)
    net = float(d.get("prix_remise_ht") or 0)
    ttr = float(d.get("prix_ttc_remise") or 0)
    ttn = float(d.get("prix_ttc_non_remise") or 0)
    iva = float(d.get("prix_ttc_iva21") or 0)

    exp_rem = round(net * _TVA_MULT, 4) if net > 0 else 0.0
    exp_non = round(brut * _TVA_MULT, 4) if brut > 0 else 0.0

    if ttr <= 0 and iva > 0:
        d["prix_ttc_remise"] = iva
        ttr = iva
    if ttr <= 0 and exp_rem > 0:
        d["prix_ttc_remise"] = exp_rem
        ttr = exp_rem
    if ttn <= 0 and exp_non > 0:
        d["prix_ttc_non_remise"] = exp_non
        ttn = exp_non

    def _mark_low() -> None:
        d["confidence"] = "low"

    # Cas typique BigMat : les deux TTC sont remplis mais inversés (643 dans « remisé », 547 dans « sans »)
    if rem > 1e-6 and brut > net + 1e-6 and ttr > 0 and ttn > 0 and ttr > ttn + 0.01:
        d["prix_ttc_remise"], d["prix_ttc_non_remise"] = ttn, ttr
        _mark_low()
        logger.debug(
            "TTC inversés corrigés (remise>0, brut>net mais ttc_remise>ttc_non) brut=%s net=%s",
            brut,
            net,
        )
        ttr, ttn = float(d["prix_ttc_remise"]), float(d["prix_ttc_non_remise"])

    if brut > 0 and net > 0 and ttr > 0 and ttn > 0 and exp_rem > 0 and exp_non > 0:
        direct = abs(ttr - exp_rem) + abs(ttn - exp_non)
        swapped = abs(ttr - exp_non) + abs(ttn - exp_rem)
        if swapped + 0.15 < direct:
            d["prix_ttc_remise"], d["prix_ttc_non_remise"] = ttn, ttr
            _mark_low()
            logger.debug(
                "TTC réassignés par cohérence HT×1,21 (direct=%.2f swapped=%.2f) brut=%s net=%s",
                direct,
                swapped,
                brut,
                net,
            )

    # Un seul TTC renseigné : s’il colle au TTC « catalogue » et pas au net, c’est le mauvais champ
    if rem > 1e-6 and brut > net + 1e-6 and ttr > 0 and ttn <= 0 and exp_rem > 0 and exp_non > 0:
        if abs(ttr - exp_non) <= _TTC_TOL_EUR and abs(ttr - exp_rem) > _TTC_TOL_EUR:
            d["prix_ttc_non_remise"] = ttr
            d["prix_ttc_remise"] = exp_rem
            _mark_low()

    # Relire après corrections ci-dessus
    ttr = float(d.get("prix_ttc_remise") or 0)
    ttn = float(d.get("prix_ttc_non_remise") or 0)

    # Legacy : le modèle ne remplit que « prix_ttc_iva21 » avec le TTC catalogue, recopié en remisé par erreur
    # (les deux champs finissent identiques ≈ brut×1,21 alors que le net×1,21 est plus bas).
    if rem > 1e-6 and brut > net + 1e-6 and exp_rem > 0 and exp_non > 0 and ttr > 0:
        near_non = abs(ttr - exp_non) <= _TTC_TOL_EUR
        far_rem = abs(ttr - exp_rem) > _TTC_TOL_EUR
        dup = ttn > 0 and abs(ttr - ttn) < 0.05
        if (near_non and far_rem) or (dup and near_non and far_rem):
            d["prix_ttc_non_remise"] = round(exp_non, 4)
            d["prix_ttc_remise"] = round(exp_rem, 4)
            d["prix_ttc_iva21"] = round(exp_rem, 4)
            _mark_low()
            logger.debug(
                "TTC remisé recalculé depuis net HT (legacy IVA21=catalogue ou doublon) brut=%s net=%s",
                brut,
                net,
            )


def _repair_prices(p: Product) -> Product:
    """Répare les montants pour des **prix unitaires** (Import / total ligne ne doit pas remplir prix_remise_ht)."""
    d = p.model_dump()
    brut = float(d.get("prix_brut_ht") or 0)
    rem = float(d.get("remise_pct") or 0)
    net = float(d.get("prix_remise_ht") or 0)

    if brut > 0 and rem == 0 and net == 0:
        d["prix_remise_ht"] = round(brut, 4)
        d["confidence"] = "low"

    if brut > 0 and 0 <= rem <= 100:
        expected = round(brut * (1 - rem / 100), 4)
        if net > 0 and expected > 0:
            rel = abs(net - expected) / max(expected, 1e-9)
            if rel > 0.04:
                d["prix_remise_ht"] = expected
                d["confidence"] = "low"
                logger.debug(
                    "prix_remise_ht corrigé (brut=%s rem=%s%% était net=%s → %s)",
                    brut,
                    rem,
                    net,
                    expected,
                )
        elif net <= 0 and expected > 0:
            d["prix_remise_ht"] = expected
            d["confidence"] = "low"

    _repair_ttc_coherence(d)

    return Product(**d)


def _dedupe(products: list[Product]) -> list[Product]:
    seen: set[tuple[str, str, float]] = set()
    out: list[Product] = []
    for p in products:
        key = (
            (p.designation_raw or "").strip().lower()[:200],
            (p.fournisseur or "").strip().lower()[:80],
            round(float(p.prix_remise_ht or 0), 2),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def sanitize_extraction_result(result: InvoiceExtractionResult) -> InvoiceExtractionResult:
    """Filtre bruit, répare arithmétique ligne, dédoublonne."""
    cleaned: list[Product] = []
    for p in result.produits:
        if _is_garbage_line(p):
            logger.debug("ligne extraction ignorée (totaux/TVA): %s", p.designation_raw[:60])
            continue
        try:
            cleaned.append(_repair_prices(p))
        except Exception as e:
            logger.warning(
                "sanitize: ligne ignorée après réparation (revalidation Product): %s — %s",
                (p.designation_raw or "")[:80],
                e,
            )
    cleaned = _dedupe(cleaned)
    return InvoiceExtractionResult(
        produits=cleaned,
        fournisseur_detecte=result.fournisseur_detecte,
        numero_facture=result.numero_facture,
        date_facture=result.date_facture,
        langue_detectee=result.langue_detectee,
        nb_lignes_brutes=result.nb_lignes_brutes,
        tokens_used=result.tokens_used,
    )
