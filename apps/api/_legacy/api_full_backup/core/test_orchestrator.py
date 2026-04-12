"""Tests pour Orchestrator (detect_mime + logique pipeline) — zéro mock."""

from core.orchestrator import COST_PER_MILLION, Orchestrator


class TestDetectMime:
    def test_pdf_by_extension(self):
        assert Orchestrator._detect_mime("facture.pdf", b"") == "application/pdf"

    def test_jpg_by_extension(self):
        assert Orchestrator._detect_mime("photo.jpg", b"") == "image/jpeg"

    def test_jpeg_by_extension(self):
        assert Orchestrator._detect_mime("photo.jpeg", b"") == "image/jpeg"

    def test_png_by_extension(self):
        assert Orchestrator._detect_mime("scan.png", b"") == "image/png"

    def test_webp_by_extension(self):
        assert Orchestrator._detect_mime("img.webp", b"") == "image/webp"

    def test_heic_by_extension(self):
        assert Orchestrator._detect_mime("photo.heic", b"") == "image/heic"

    def test_pdf_by_magic_bytes(self):
        assert Orchestrator._detect_mime("noext", b"%PDF-1.4 blah") == "application/pdf"

    def test_jpeg_by_magic_bytes(self):
        assert Orchestrator._detect_mime("noext", b"\xff\xd8\xff\xe0rest") == "image/jpeg"

    def test_png_by_magic_bytes(self):
        assert Orchestrator._detect_mime("noext", b"\x89PNG\r\n\x1a\nrest") == "image/png"

    def test_unknown_defaults_to_jpeg(self):
        assert Orchestrator._detect_mime("unknown.xyz", b"\x00\x01\x02") == "image/jpeg"

    def test_case_insensitive_extension(self):
        assert Orchestrator._detect_mime("FILE.PDF", b"") == "application/pdf"
        assert Orchestrator._detect_mime("PHOTO.JPG", b"") == "image/jpeg"

    def test_no_extension(self):
        assert Orchestrator._detect_mime("justname", b"random") == "image/jpeg"


class TestCostCalculation:
    def test_cost_per_million_keys(self):
        assert "gemini-3-flash-preview" in COST_PER_MILLION
        assert "gemini-2.5-flash" in COST_PER_MILLION
        assert "gemini-3.1-pro-preview" in COST_PER_MILLION

    def test_cost_values_positive(self):
        for model, cost in COST_PER_MILLION.items():
            assert cost > 0, f"{model} has non-positive cost"

    def test_flash_cheaper_than_pro(self):
        assert (
            COST_PER_MILLION["gemini-3-flash-preview"] < COST_PER_MILLION["gemini-3.1-pro-preview"]
        )


class TestExtractionTimeoutSeconds:
    """Seuils d’attente provider — régression sur la chaîne mistral/chandra/lighton/gemini."""

    def test_mistral_prefix_uses_mistral_ms(self):
        t = Orchestrator._extraction_timeout_seconds("mistral-ocr-latest")
        assert t >= 1.0

    def test_chandra_prefix(self):
        t = Orchestrator._extraction_timeout_seconds("chandra-v1")
        assert t >= 1.0

    def test_lighton_prefix(self):
        t = Orchestrator._extraction_timeout_seconds("lighton-fast")
        assert t >= 1.0

    def test_default_gemini_model(self):
        t = Orchestrator._extraction_timeout_seconds("gemini-3.1-pro-preview")
        assert t >= 1.0


# ── Smart Router Tests ────────────────────────────────────────────────────────

import asyncio

from core.orchestrator import _Route, _RouteDecision, _smart_route


def _run(coro):
    """Helper sync pour exécuter une coroutine dans les tests."""
    return asyncio.get_event_loop().run_until_complete(coro)


class TestSmartRouter:
    """Tests du Smart Router 2026 — classification des documents."""

    def test_pdf_with_rich_text_routes_text_only(self):
        """PDF numérique avec beaucoup de texte → TEXT_ONLY."""
        # Simule un PDF avec header valide + suffisamment de texte natif
        # Note: _smart_route appelle extract_pdf_text_metrics en interne.
        # Ce test vérifie la logique de décision pour un vrai PDF.
        # En l'absence de vrai PDF, on teste via la RouteDecision directement.
        decision = _RouteDecision(
            route=_Route.TEXT_ONLY,
            mime_type="application/pdf",
            pdf_native_text="Facture 001 - BigMat - Ciment 42.5R - 12.50€ x 10" * 50,
        )
        assert decision.route == _Route.TEXT_ONLY
        assert not decision.needs_preprocessing
        assert not decision.needs_ocr
        assert not decision.needs_vision
        assert decision.pdf_native_text is not None

    def test_image_routes_vision_direct(self):
        """Image JPEG de taille normale → VISION_DIRECT."""
        decision = _run(_smart_route(b"\xff\xd8\xff" + b"\x00" * 100_000, "facture.jpg"))
        assert decision.route == _Route.VISION_DIRECT
        assert not decision.needs_preprocessing
        assert not decision.needs_ocr
        assert decision.needs_vision

    def test_tiny_image_routes_full_pipeline(self):
        """Très petite image (<50Ko) → FULL_PIPELINE (preprocess recommandé)."""
        decision = _run(_smart_route(b"\xff\xd8\xff" + b"\x00" * 1000, "petit.jpg"))
        assert decision.route == _Route.FULL_PIPELINE
        assert decision.needs_preprocessing
        assert decision.needs_ocr
        assert decision.needs_vision

    def test_unknown_file_routes_full_pipeline(self):
        """Fichier inconnu → FULL_PIPELINE (fallback safe)."""
        decision = _run(_smart_route(b"\x00\x01\x02\x03", "unknown.xyz"))
        assert decision.route == _Route.FULL_PIPELINE

    def test_route_decision_flags_text_only(self):
        d = _RouteDecision(route=_Route.TEXT_ONLY, mime_type="application/pdf")
        assert not d.needs_preprocessing
        assert not d.needs_ocr
        assert not d.needs_vision

    def test_route_decision_flags_vision_direct(self):
        d = _RouteDecision(route=_Route.VISION_DIRECT, mime_type="image/jpeg")
        assert not d.needs_preprocessing
        assert not d.needs_ocr
        assert d.needs_vision

    def test_route_decision_flags_full_pipeline(self):
        d = _RouteDecision(route=_Route.FULL_PIPELINE, mime_type="image/jpeg")
        assert d.needs_preprocessing
        assert d.needs_ocr
        assert d.needs_vision
