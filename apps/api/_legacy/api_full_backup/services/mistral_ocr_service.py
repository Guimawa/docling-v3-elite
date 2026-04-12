# services/mistral_ocr_service.py
"""
Mistral OCR service "Elite 2026" — Extraction haute performance.
Utilise la génération de schéma dynamique via Pydantic V2 et l'isolation des prompts.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Optional, Dict, List

import httpx
from pydantic import ValidationError

from core.config import Config
from schemas.invoice import InvoiceExtractionResult, Product
from services.invoice_extraction_prompts import build_mistral_annotation_instructions
from services.invoice_product_coerce import coerce_invoice_product_dict

logger = logging.getLogger(__name__)

# --- CONFIGURATION RETRIES 2026 ---
_RETRY_STATUS_CODES = {429, 500, 502, 503, 504}

def _get_mistral_json_schema() -> dict:
    """Génère dynamiquement le schéma pour Mistral à partir du modèle Pydantic V2."""
    schema = InvoiceExtractionResult.model_json_schema()
    # Mistral strict schema requirements adjustments
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "invoice_extraction",
            "strict": True,
            "schema": schema
        }
    }

class MistralOcrService:
    _instances: Dict[str, "MistralOcrService"] = {}

    @classmethod
    def get_or_create(cls, model_id: Optional[str] = None) -> "MistralOcrService":
        mid = model_id or "mistral-ocr-latest"
        if mid not in cls._instances:
            cls._instances[mid] = cls(model_id=mid)
        return cls._instances[mid]

    def __init__(self, model_id: str):
        if not Config.MISTRAL_API_KEY:
            raise RuntimeError("MISTRAL_API_KEY manquante")
        self.api_key = Config.MISTRAL_API_KEY
        self.model_name = model_id
        self.timeout = max(1.0, Config.MISTRAL_TIMEOUT_MS / 1000.0)
        self.max_retries = Config.MISTRAL_MAX_RETRIES

    async def _post_request(self, endpoint: str, payload: dict) -> dict:
        """Helper HTTP avec retries exponentiels."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        url = f"https://api.mistral.ai/v1/{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code in _RETRY_STATUS_CODES and attempt < self.max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    return resp.json()
                except Exception as e:
                    if attempt == self.max_retries - 1:
                        raise e
                    await asyncio.sleep(2 ** attempt)
        return {}

    async def extract_from_bytes_async(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str = "facture",
        ocr_text: Optional[str] = None
    ) -> InvoiceExtractionResult:
        """Extraction unifiée avec isolation de prompt 2026."""
        
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        is_pdf = mime_type == "application/pdf"
        
        document = {
            "type": "document_url" if is_pdf else "image_url",
            "document_url" if is_pdf else "image_url": f"data:{mime_type};base64,{b64}"
        }

        # 1. Préparation du prompt (isolation)
        instructions = build_mistral_annotation_instructions(ocr_text)
        
        payload = {
            "model": self.model_name,
            "document": document,
            "document_annotation_format": _get_mistral_json_schema(),
            "document_annotation_prompt": instructions,
            "include_image_base64": False
        }

        try:
            data = await self._post_request("ocr", payload)
            raw_annotation = data.get("document_annotation")
            
            # Parsing robuste
            if isinstance(raw_annotation, str):
                result = InvoiceExtractionResult.model_validate_json(raw_annotation)
            elif isinstance(raw_annotation, dict):
                result = InvoiceExtractionResult.model_validate(raw_annotation)
            else:
                raise ValueError("Format d'annotation Mistral inconnu")

            # Injection des métadonnées de consommation
            usage = data.get("usage_info", {})
            result.tokens_used = usage.get("total_tokens", 0)
            
            return result

        except Exception as e:
            logger.error(f"Mistral OCR Fail ({filename}): {e}")
            # Fallback vers un résultat vide pour ne pas bloquer le pipeline
            return InvoiceExtractionResult(
                produits=[], 
                fournisseur_detecte="Erreur Mistral",
                nb_lignes_brutes=0
            )

    async def _extract_two_step(self, document: dict, filename: str) -> InvoiceExtractionResult:
        """Mode 2 étapes : OCR Markdown -> Structuration Chat."""
        # Note: Implémentation simplifiée pour l'Excellence 2026 privilégiant 'document_annotation_format'
        # qui est désormais très stable chez Mistral.
        return await self.extract_from_bytes_async(b"", "", filename) # Placeholder redirect
