from __future__ import annotations

import pytest

from services.lighton_ocr_service import LightOnOcrService


@pytest.mark.asyncio
async def test_lighton_service_parses_document_annotation_json() -> None:
    svc = object.__new__(LightOnOcrService)
    svc.model_name = "lightonocr-2-1b"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.base_url = "http://localhost:8082"
    svc.api_key = ""

    async def fake_request(_payload):
        return {
            "document_annotation": (
                '{"fournisseur_detecte":"BigMat","numero_facture":"L-42","date_facture":"2026-04-03",'
                '"langue_detectee":"fr","nb_lignes_brutes":1,"produits":[{"fournisseur":"BigMat",'
                '"designation_raw":"PLAQUE BA13","designation_fr":"Plaque BA13","famille":"Cloison",'
                '"unite":"plaque","prix_brut_ht":4.2,"remise_pct":5.0,"prix_remise_ht":3.99,'
                '"prix_ttc_iva21":4.83,"numero_facture":"L-42","date_facture":"2026-04-03",'
                '"confidence":"high"}]}'
            ),
            "usage_info": {"input_tokens": 12, "output_tokens": 6},
        }

    svc._request_with_retries = fake_request
    result = await svc.extract_from_bytes_async(
        file_bytes=b"%PDF-1.4\n%%EOF\n",
        mime_type="application/pdf",
        filename="facture.pdf",
    )

    assert result.fournisseur_detecte == "BigMat"
    assert result.numero_facture == "L-42"
    assert len(result.produits) == 1
    assert result.produits[0].designation_fr == "Plaque BA13"
    assert result.tokens_used == 18


@pytest.mark.asyncio
async def test_lighton_service_handles_missing_annotation() -> None:
    svc = object.__new__(LightOnOcrService)
    svc.model_name = "lightonocr-2-1b"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.base_url = "http://localhost:8082"
    svc.api_key = ""

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
