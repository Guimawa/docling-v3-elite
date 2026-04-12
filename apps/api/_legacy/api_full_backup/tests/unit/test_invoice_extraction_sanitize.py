"""Tests post-traitement extraction (sans API)."""

from schemas.invoice import InvoiceExtractionResult, Product
from services.invoice_extraction_sanitize import sanitize_extraction_result


def _p(**kw) -> Product:
    base = {
        "fournisseur": "X",
        "designation_raw": "item",
        "designation_fr": "item",
        "prix_brut_ht": 10.0,
        "remise_pct": 0.0,
        "prix_remise_ht": 10.0,
    }
    base.update(kw)
    return Product(**base)


def test_sanitize_drops_short_total_line() -> None:
    r = InvoiceExtractionResult(
        produits=[
            _p(designation_raw="Ciment", designation_fr="Ciment", prix_remise_ht=5.0),
            _p(designation_raw="TVA", designation_fr="TVA", prix_brut_ht=0, prix_remise_ht=0),
        ],
    )
    out = sanitize_extraction_result(r)
    assert len(out.produits) == 1
    assert out.produits[0].designation_raw == "Ciment"


def test_sanitize_repairs_net_from_brut_and_remise() -> None:
    r = InvoiceExtractionResult(
        produits=[
            _p(
                designation_raw="Vis",
                designation_fr="Vis",
                prix_brut_ht=100.0,
                remise_pct=10.0,
                prix_remise_ht=50.0,
            ),
        ],
    )
    out = sanitize_extraction_result(r)
    assert abs(out.produits[0].prix_remise_ht - 90.0) < 0.01
    assert out.produits[0].confidence == "low"


def test_sanitize_fills_net_when_brut_and_zero_remise() -> None:
    r = InvoiceExtractionResult(
        produits=[
            _p(
                designation_raw="Tuyau",
                designation_fr="Tuyau",
                prix_brut_ht=12.5,
                remise_pct=0.0,
                prix_remise_ht=0.0,
            ),
        ],
    )
    out = sanitize_extraction_result(r)
    assert out.produits[0].prix_remise_ht == 12.5


def test_sanitize_fixes_legacy_iva21_when_only_catalogue_ttc_filled() -> None:
    """Modèle remplit surtout prix_ttc_iva21 = brut×1,21 ; Pydantic le copie en remisé — doublon à corriger."""
    r = InvoiceExtractionResult(
        produits=[
            _p(
                designation_raw="Service collecte",
                designation_fr="Service collecte",
                prix_brut_ht=532.0,
                remise_pct=15.0,
                prix_remise_ht=452.2,
                prix_ttc_remise=0.0,
                prix_ttc_non_remise=0.0,
                prix_ttc_iva21=643.72,
            ),
        ],
    )
    out = sanitize_extraction_result(r)
    p = out.produits[0]
    assert abs(p.prix_ttc_remise - 547.16) < 0.05
    assert abs(p.prix_ttc_non_remise - 643.72) < 0.05
    assert p.confidence == "low"


def test_sanitize_swaps_inverted_ttc_when_remise_and_brut_gt_net() -> None:
    """BigMat-type line: OCR puts catalogue TTC in remise field and vice versa."""
    r = InvoiceExtractionResult(
        produits=[
            _p(
                designation_raw="Service collecte",
                designation_fr="Service collecte",
                prix_brut_ht=532.0,
                remise_pct=15.0,
                prix_remise_ht=452.2,
                prix_ttc_remise=643.72,
                prix_ttc_non_remise=547.16,
            ),
        ],
    )
    out = sanitize_extraction_result(r)
    p = out.produits[0]
    assert abs(p.prix_ttc_remise - 547.16) < 0.05
    assert abs(p.prix_ttc_non_remise - 643.72) < 0.05
    assert p.confidence == "low"


def test_sanitize_dedupes_identical_lines() -> None:
    r = InvoiceExtractionResult(
        produits=[
            _p(designation_raw="Same", prix_remise_ht=3.0),
            _p(designation_raw="Same", prix_remise_ht=3.0),
        ],
    )
    out = sanitize_extraction_result(r)
    assert len(out.produits) == 1
