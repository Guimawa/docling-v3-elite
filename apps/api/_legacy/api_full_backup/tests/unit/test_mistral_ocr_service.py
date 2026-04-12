from __future__ import annotations

import pytest

from services.mistral_ocr_service import MistralOcrService


@pytest.mark.asyncio
async def test_mistral_service_parses_document_annotation_json() -> None:
    svc = object.__new__(MistralOcrService)
    svc.model_name = "mistral-ocr-latest"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.api_key = "test-key"

    async def fake_request(_payload):
        return {
            "document_annotation": (
                '{"fournisseur_detecte":"BigMat","numero_facture":"F-42","date_facture":"2026-04-03",'
                '"langue_detectee":"fr","nb_lignes_brutes":1,"produits":[{"fournisseur":"BigMat",'
                '"designation_raw":"CIMENT 25KG","designation_fr":"Ciment 25kg","famille":"Maçonnerie",'
                '"unite":"sac","prix_brut_ht":10.0,"remise_pct":10.0,"prix_remise_ht":9.0,'
                '"prix_ttc_remise":10.89,"prix_ttc_non_remise":12.1,"prix_ttc_iva21":10.89,"numero_facture":"F-42","date_facture":"2026-04-03",'
                '"confidence":"high"}]}'
            ),
            "usage_info": {"input_tokens": 100, "output_tokens": 50},
        }

    svc._request_with_retries = fake_request
    result = await svc.extract_from_bytes_async(
        file_bytes=b"%PDF-1.4\n%%EOF\n",
        mime_type="application/pdf",
        filename="facture.pdf",
    )

    assert result.fournisseur_detecte == "BigMat"
    assert result.numero_facture == "F-42"
    assert len(result.produits) == 1
    assert result.produits[0].designation_fr == "Ciment 25kg"
    assert result.tokens_used == 150


@pytest.mark.asyncio
async def test_mistral_service_handles_missing_annotation() -> None:
    svc = object.__new__(MistralOcrService)
    svc.model_name = "mistral-ocr-latest"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.api_key = "test-key"

    async def fake_request(_payload):
        return {"document_annotation": None, "usage_info": {}}

    svc._request_with_retries = fake_request
    result = await svc.extract_from_bytes_async(
        file_bytes=b"\xff\xd8\xff",
        mime_type="image/jpeg",
        filename="facture.jpg",
    )

    assert result.produits == []
    assert result.tokens_used == 0


@pytest.mark.asyncio
async def test_mistral_service_sends_json_schema_annotation_format() -> None:
    svc = object.__new__(MistralOcrService)
    svc.model_name = "mistral-ocr-latest"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.api_key = "test-key"
    captured_payload = {}

    async def fake_request(payload):
        captured_payload.update(payload)
        return {"document_annotation": "{}", "usage_info": {}}

    svc._request_with_retries = fake_request
    await svc.extract_from_bytes_async(
        file_bytes=b"%PDF-1.4\n%%EOF\n",
        mime_type="application/pdf",
        filename="facture.pdf",
    )

    annotation_format = captured_payload.get("document_annotation_format")
    assert isinstance(annotation_format, dict)
    assert annotation_format.get("type") == "json_schema"
    assert "json_schema" in annotation_format
    assert captured_payload.get("table_format") == "html"


@pytest.mark.asyncio
async def test_mistral_two_step_ocr_then_chat(monkeypatch) -> None:
    from core.config import settings

    monkeypatch.setattr(settings, "MISTRAL_OCR_TWO_STEP", True, raising=False)

    svc = object.__new__(MistralOcrService)
    svc.model_name = "mistral-ocr-2512"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.api_key = "test-key"

    async def fake_ocr(payload):
        assert "document_annotation_format" not in payload
        assert payload.get("table_format") == "html"
        return {
            "pages": [{"markdown": "| Article | Prix |\n| CIMENT | 10 |"}],
            "usage_info": {"total_tokens": 20},
        }

    async def fake_chat(payload):
        assert payload.get("model") == "mistral-large-latest"
        assert payload.get("temperature") == 0
        assert payload.get("response_format", {}).get("type") == "json_schema"
        return {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"fournisseur_detecte":"BigMat","numero_facture":"F-1","date_facture":"2026-04-04",'
                            '"langue_detectee":"fr","nb_lignes_brutes":1,"produits":[{"fournisseur":"BigMat",'
                            '"designation_raw":"CIMENT","designation_fr":"Ciment","famille":"Maçonnerie",'
                            '"unite":"sac","prix_brut_ht":10.0,"remise_pct":0.0,"prix_remise_ht":10.0,'
                            '"prix_ttc_remise":12.1,"prix_ttc_non_remise":12.1,"prix_ttc_iva21":12.1,"numero_facture":"F-1","date_facture":"2026-04-04",'
                            '"confidence":"high"}]}'
                        ),
                    },
                },
            ],
            "usage": {"total_tokens": 80},
        }

    svc._request_with_retries = fake_ocr
    svc._chat_completions_with_retries = fake_chat

    result = await svc.extract_from_bytes_async(
        file_bytes=b"%PDF-1.4\n%%EOF\n",
        mime_type="application/pdf",
        filename="facture.pdf",
    )

    assert result.fournisseur_detecte == "BigMat"
    assert len(result.produits) == 1
    assert result.tokens_used == 100
