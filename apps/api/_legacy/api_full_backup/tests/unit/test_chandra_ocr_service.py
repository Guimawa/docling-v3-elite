from __future__ import annotations

import pytest

from services.chandra_ocr_service import ChandraOcrService


@pytest.mark.asyncio
async def test_chandra_service_parses_document_annotation_json() -> None:
    svc = object.__new__(ChandraOcrService)
    svc.model_name = "chandra-ocr-2"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.base_url = "http://localhost:8081"
    svc.api_key = ""

    async def fake_request(_payload):
        return {
            "document_annotation": (
                '{"fournisseur_detecte":"BigMat","numero_facture":"C-42","date_facture":"2026-04-03",'
                '"langue_detectee":"fr","nb_lignes_brutes":1,"produits":[{"fournisseur":"BigMat",'
                '"designation_raw":"SABLE 0/4","designation_fr":"Sable 0/4","famille":"Maçonnerie",'
                '"unite":"sac","prix_brut_ht":8.0,"remise_pct":0.0,"prix_remise_ht":8.0,'
                '"prix_ttc_iva21":9.68,"numero_facture":"C-42","date_facture":"2026-04-03",'
                '"confidence":"high"}]}'
            ),
            "usage_info": {"input_tokens": 10, "output_tokens": 5},
        }

    svc._request_with_retries = fake_request
    result = await svc.extract_from_bytes_async(
        file_bytes=b"%PDF-1.4\n%%EOF\n",
        mime_type="application/pdf",
        filename="facture.pdf",
    )

    assert result.fournisseur_detecte == "BigMat"
    assert result.numero_facture == "C-42"
    assert len(result.produits) == 1
    assert result.produits[0].designation_fr == "Sable 0/4"
    assert result.tokens_used == 15


@pytest.mark.asyncio
async def test_chandra_service_handles_missing_annotation() -> None:
    svc = object.__new__(ChandraOcrService)
    svc.model_name = "chandra-ocr-2"
    svc.timeout_s = 5.0
    svc.max_retries = 1
    svc.base_url = "http://localhost:8081"
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
