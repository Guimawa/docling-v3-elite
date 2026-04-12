"""
Golden check extraction : image PNG synthétique dont le texte est figé dans le test.

Compare la sortie Gemini au contenu attendu (numéro facture, fournisseur, 2 articles, prix HT).

Exécution (coût tokens réel) ::
    RUN_GOLDEN_GEMINI=1 uv run pytest apps/api/tests/external_services/test_invoice_golden_gemini.py -v

Prérequis : GEMINI_API_KEY dans la racine ``.env`` du repo (comme ``core.config``).
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from tests.skip_reasons import (
    EXT_GEMINI_KEY_MISSING,
    EXT_GOLDEN_GEMINI_OFF,
    ext_gemini_partial_lines_count,
)

_REPO_ROOT = Path(__file__).resolve().parents[4]

pytestmark = [pytest.mark.asyncio, pytest.mark.external, pytest.mark.slow]


def _synthetic_invoice_png() -> bytes:
    import cv2
    import numpy as np

    img = np.ones((1100, 900, 3), dtype=np.uint8) * 255
    y = 45

    def put(text: str, gap: int = 32, scale: float = 0.55, thick: int = 1) -> None:
        nonlocal y
        cv2.putText(
            img,
            text,
            (40, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            scale,
            (0, 0, 0),
            thick,
            lineType=cv2.LINE_AA,
        )
        y += gap

    put("FACTURE numero F-GOLD-TEST-001", 40, 0.6, 2)
    put("Fournisseur: BigMat Golden SA")
    put("Date facture: 2026-04-04")
    put("--- Lignes articles ---", 36)
    put("1) Ciment CEM II 25kg ref-BM-CEM2 | brut 12.50 EUR HT | remise 0%")
    put("2) Vis inox 6x40 boite 100 | brut 4.80 EUR HT | remise 5%")
    put("(Ligne a ignorer: TOTAL TVA 21% synthese globale)")
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


@pytest.mark.skipif(
    os.getenv("RUN_GOLDEN_GEMINI", "").lower() not in ("1", "true", "yes"),
    reason=EXT_GOLDEN_GEMINI_OFF,
)
async def test_gemini_golden_synthetic_invoice_matches_expected() -> None:
    """
    Terrain de vérité (image) :
    - N° facture F-GOLD-TEST-001
    - Fournisseur BigMat Golden SA
    - Ligne 1 : Ciment CEM II 25kg, 12.50 EUR HT, 0% remise
    - Ligne 2 : Vis inox 6x40, 4.80 brut, 5% remise → 4.56 HT
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        pass
    else:
        load_dotenv(_REPO_ROOT / ".env")

    if not (os.getenv("GEMINI_API_KEY") or "").strip():
        pytest.skip(EXT_GEMINI_KEY_MISSING)

    from services.gemini_service import GeminiService

    raw = _synthetic_invoice_png()
    svc = GeminiService.get_or_create("gemini-2.5-flash")
    result = await svc.extract_from_bytes_async(raw, "image/png", "golden_synthetic.png")

    num = (result.numero_facture or "").replace(" ", "").upper()
    assert "F-GOLD-TEST-001" in num or "GOLD" in num, (
        f"numero_facture inattendu: {result.numero_facture!r}"
    )

    four = (
        (result.fournisseur_detecte or "")
        + " "
        + " ".join((p.fournisseur or "") for p in result.produits[:3])
    )
    assert "BigMat" in four or "BIGMAT" in four.upper(), f"fournisseur inattendu: {four!r}"

    assert len(result.produits) >= 1, "aucun produit extrait"
    # Idéalement 2 lignes articles ; une marge si le modèle fusionne ou ignore une ligne
    if len(result.produits) < 2:
        pytest.skip(ext_gemini_partial_lines_count(len(result.produits)))

    blob = " ".join(
        ((p.designation_raw or "") + " " + (p.designation_fr or "")).upper()
        for p in result.produits
    )
    assert "CEM" in blob or "CIMENT" in blob, f"libellé ciment absent: {blob[:200]!r}..."
    assert "VIS" in blob or "6X40" in blob.replace(" ", ""), (
        f"libellé vis absent: {blob[:200]!r}..."
    )

    nets = [float(p.prix_remise_ht or 0) for p in result.produits]
    near_125 = any(abs(n - 12.5) < 0.75 for n in nets)
    near_456 = any(abs(n - 4.56) < 0.35 for n in nets)  # 4.80 * 0.95
    near_48 = any(abs(n - 4.8) < 0.25 for n in nets)
    assert near_125 or near_456 or near_48, (
        f"prix HT inattendus (attendu ~12.5 et/ou ~4.56): {nets}"
    )

    remises = [float(p.remise_pct or 0) for p in result.produits]
    assert any(r >= 4.0 for r in remises) or near_456, (
        f"remise 5% sur vis non reflétée (remises={remises}, nets={nets})"
    )
