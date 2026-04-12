"""
LightOnOCR 2 service — extraction via endpoint self-hosted.

Le backend attend un wrapper HTTP interne compatible avec le payload ci-dessous.
"""

import asyncio
import base64
import json
import logging
import re
from collections.abc import Mapping
from typing import Any

import httpx

from core.config import Config
from schemas.invoice import InvoiceExtractionResult, Product
from services.invoice_extraction_prompts import DOCLING_BTP_SUFFIX
from services.invoice_product_coerce import coerce_invoice_product_dict

logger = logging.getLogger(__name__)

_lighton_cache: dict[str, "LightOnOcrService"] = {}
_RETRY_STATUS_CODES = {429, 500, 502, 503, 504}


def _safe_json_loads(value: str) -> dict[str, Any]:
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", value, re.DOTALL)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


def _usage_tokens(usage_info: Any) -> int:
    if not isinstance(usage_info, Mapping):
        return 0
    total = usage_info.get("total_tokens")
    if isinstance(total, int):
        return total
    return int(
        (usage_info.get("input_tokens") or 0)
        + (usage_info.get("output_tokens") or 0)
        + (usage_info.get("cached_tokens") or 0)
    )


def _build_annotation_prompt(ocr_text: str | None = None) -> str:
    context = ""
    if ocr_text:
        context = (
            "\nContexte OCR local (bruite, a utiliser seulement pour desambiguise):\n"
            + ocr_text[:12000]
        )
    return (
        "Extrais une facture fournisseurs BTP (fr/es/ca). "
        "Retourne UNIQUEMENT un objet JSON valide avec les cles:\n"
        "{"
        '"fournisseur_detecte": string,'
        '"numero_facture": string,'
        '"date_facture": string,'
        '"langue_detectee": "fr"|"es"|"ca",'
        '"nb_lignes_brutes": number,'
        '"produits": ['
        "{"
        '"fournisseur": string,'
        '"designation_raw": string,'
        '"designation_fr": string,'
        '"famille": string,'
        '"unite": string,'
        '"prix_brut_ht": number,'
        '"remise_pct": number,'
        '"prix_remise_ht": number,'
        '"prix_ttc_remise": number,'
        '"prix_ttc_non_remise": number,'
        '"prix_ttc_iva21": number,'
        '"numero_facture": string,'
        '"date_facture": string,'
        '"confidence": "high"|"low"'
        "}"
        "]"
        "}\n"
        "Ne pas inclure de markdown.\n\n" + DOCLING_BTP_SUFFIX.strip() + context
    )


class LightOnOcrService:
    @classmethod
    def get_or_create(cls, model_id: str | None = None) -> "LightOnOcrService":
        key = model_id or "lightonocr-2-1b"
        if key not in _lighton_cache:
            _lighton_cache[key] = cls(model_id=key)
        return _lighton_cache[key]

    def __init__(self, model_id: str = "lightonocr-2-1b"):
        if not Config.LIGHTON_BASE_URL:
            raise RuntimeError("LIGHTON_BASE_URL non configurée")
        self.base_url = Config.LIGHTON_BASE_URL.rstrip("/")
        self.api_key = Config.LIGHTON_API_KEY
        self.model_name = model_id
        self.timeout_s = max(1.0, Config.LIGHTON_TIMEOUT_MS / 1000.0)
        self.max_retries = Config.LIGHTON_MAX_RETRIES

    async def _request_with_retries(self, payload: dict[str, Any]) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        last_error: Exception | None = None
        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            for attempt in range(self.max_retries):
                try:
                    response = await client.post(
                        f"{self.base_url}/v1/ocr",
                        json=payload,
                        headers=headers,
                    )
                    if (
                        response.status_code in _RETRY_STATUS_CODES
                        and attempt + 1 < self.max_retries
                    ):
                        wait = 2 ** (attempt + 1)
                        logger.warning(
                            "LightOn OCR HTTP %s, retry %s/%s apres %ss",
                            response.status_code,
                            attempt + 1,
                            self.max_retries,
                            wait,
                        )
                        await asyncio.sleep(wait)
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return data if isinstance(data, dict) else {}
                except (httpx.HTTPError, httpx.TimeoutException, ValueError) as err:
                    last_error = err
                    if attempt + 1 >= self.max_retries:
                        break
                    wait = 2 ** (attempt + 1)
                    logger.warning(
                        "LightOn OCR erreur %s, retry %s/%s apres %ss",
                        type(err).__name__,
                        attempt + 1,
                        self.max_retries,
                        wait,
                    )
                    await asyncio.sleep(wait)
        raise RuntimeError("LightOn OCR indisponible apres retries") from last_error

    async def extract_from_bytes_async(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str = "facture",
        ocr_text: str | None = None,
    ) -> InvoiceExtractionResult:
        payload = {
            "model": self.model_name,
            "filename": filename,
            "mime_type": mime_type,
            "content_base64": base64.b64encode(file_bytes).decode("utf-8"),
            "document_annotation_prompt": _build_annotation_prompt(ocr_text=ocr_text),
        }
        data = await self._request_with_retries(payload)
        annotation_raw = data.get("document_annotation")
        annotation: dict[str, Any] = {}
        if isinstance(annotation_raw, dict):
            annotation = annotation_raw
        elif isinstance(annotation_raw, str):
            annotation = _safe_json_loads(annotation_raw)

        products: list[Product] = []
        for raw in annotation.get("produits", []):
            try:
                coerced = coerce_invoice_product_dict(
                    raw,
                    fournisseur_fallback=annotation.get("fournisseur_detecte", "Inconnu"),
                )
                if coerced is None:
                    continue
                products.append(Product(**coerced))
            except Exception as err:
                logger.warning("Produit ignore (validation LightOn) %s: %s", filename, err)

        return InvoiceExtractionResult(
            produits=products,
            fournisseur_detecte=annotation.get("fournisseur_detecte"),
            numero_facture=annotation.get("numero_facture"),
            date_facture=annotation.get("date_facture"),
            langue_detectee=annotation.get("langue_detectee", "fr"),
            nb_lignes_brutes=int(annotation.get("nb_lignes_brutes", len(products))),
            tokens_used=_usage_tokens(data.get("usage_info")),
        )
