"""Normalisation dict → Product avant validation Pydantic."""

from services.invoice_product_coerce import coerce_invoice_product_dict


def test_coerce_fills_fr_from_raw() -> None:
    d = coerce_invoice_product_dict(
        {"designation_raw": "  Ciment 25kg  ", "prix_remise_ht": 5.0},
        fournisseur_fallback="BigMat",
    )
    assert d is not None
    assert d["fournisseur"] == "BigMat"
    assert d["designation_fr"] == "Ciment 25kg"
    assert d["designation_raw"] == "Ciment 25kg"


def test_coerce_fills_raw_from_fr() -> None:
    d = coerce_invoice_product_dict(
        {"designation_fr": "Mortier"},
        fournisseur_fallback="Inconnu",
    )
    assert d is not None
    assert d["designation_raw"] == "Mortier"
    assert d["designation_fr"] == "Mortier"


def test_coerce_non_dict_returns_none() -> None:
    assert coerce_invoice_product_dict(None) is None
    assert coerce_invoice_product_dict("x") is None
