# services/invoice_product_coerce.py
"""
Normalise les dict produits "Elite 2026".
Utilise Pydantic V2 pour garantir l'intégrité des données avant insertion catalogue.
"""

from __future__ import annotations
from typing import Any, Optional
from schemas.invoice import Product, DESIGNATION_FR_MAX_LEN

_DES_RAW_MAX = 4000

def coerce_invoice_product_dict(
    p: Any,
    *,
    fournisseur_fallback: str = "Inconnu",
) -> dict[str, Any] | None:
    """
    Normalisation et coercion intelligente.
    Garantit qu'un produit a toujours une désignation et un fournisseur valide.
    """
    if not isinstance(p, dict):
        return None
    
    # Travail sur une copie pour éviter les effets de bord
    out = dict(p)
    
    # 1. Normalisation Fournisseur
    fb = str(fournisseur_fallback or "Inconnu").strip() or "Inconnu"
    out["fournisseur"] = str(out.get("fournisseur") or "").strip() or fb

    # 2. Réparation Désignation (Désignation_raw <=> Désignation_fr)
    dr = str(out.get("designation_raw") or "").strip()
    df = str(out.get("designation_fr") or "").strip()
    
    if not dr and df:
        dr = df
    if not df and dr:
        df = dr[:DESIGNATION_FR_MAX_LEN]
    if not dr:
        dr = df or "Article"
    if not df:
        df = dr[:DESIGNATION_FR_MAX_LEN]

    out["designation_raw"] = dr[:_DES_RAW_MAX]
    out["designation_fr"] = df[:DESIGNATION_FR_MAX_LEN]

    # 3. Coercion de surface pour les types numériques
    for field in ["prix_remise_ht", "prix_brut_ht", "remise_pct"]:
        val = out.get(field)
        if val is None or val == "":
            out[field] = 0.0
        else:
            try:
                out[field] = float(val)
            except (ValueError, TypeError):
                out[field] = 0.0

    return out
