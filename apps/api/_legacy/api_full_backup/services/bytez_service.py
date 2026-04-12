"""
BytezService — API unifiée 100k+ modèles (docs.bytez.com)
- Document Question Answering : extraction factures
- Image-to-Text / Chat multimodal : fallback Gemini
"""

import asyncio
import base64
import json
import logging
import re
import types
from typing import Union, get_args, get_origin

import httpx

from core.config import Config
from schemas.invoice import InvoiceExtractionResult, Product
from services.invoice_extraction_prompts import DOCLING_BTP_SUFFIX
from services.invoice_product_coerce import coerce_invoice_product_dict

logger = logging.getLogger(__name__)

BYTEZ_BASE = "https://api.bytez.com/models/v2"
BYTEZ_HTTP_ATTEMPTS = 3
BYTEZ_BACKOFF_SEC = (1.0, 2.0, 4.0)

# Modèle doc-QA Bytez : l’identifiant officiel contient « Awnser » (faute d’orthographe côté auteur / registre Bytez), pas une typo locale.
DEFAULT_BYTEZ_DOC_QA_MODEL = "cloudqi/CQI_Visual_Question_Awnser_PT_v0"


def _json_snippet_likely_truncated(snippet: str) -> bool:
    """Heuristique : accolade non fermée ou chaîne non terminée → réponse probablement coupée."""
    depth = 0
    in_str = False
    escape = False
    for c in snippet:
        if escape:
            escape = False
            continue
        if in_str:
            if c == "\\":
                escape = True
                continue
            if c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
    return depth != 0 or in_str


def _default_json_value_for_field(annotation: object) -> object:
    """Valeur JSON minimale pour un champ du modèle (prompt Bytez)."""
    origin = get_origin(annotation)
    if origin is Union or origin is types.UnionType:
        args = [a for a in get_args(annotation) if a is not type(None)]
        if args:
            return _default_json_value_for_field(args[0])
    if annotation is float:
        return 0.0
    if annotation is int:
        return 0
    if annotation is str:
        return ""
    return ""


def _product_example_dict() -> dict[str, object]:
    d = {}
    for name, field in Product.model_fields.items():
        if name == "prix_conseille_vente":
            continue
        d[name] = _default_json_value_for_field(field.annotation)
    d["confidence"] = "high"
    d["famille"] = ""
    return d


def _build_bytez_extraction_prompt() -> str:
    """Prompt d’extraction : structure JSON alignée sur les champs Pydantic (sans dupliquer la liste des familles)."""
    root_keys = ("fournisseur_detecte", "numero_facture", "date_facture", "langue_detectee")
    root: dict[str, object] = {k: ("fr" if k == "langue_detectee" else "") for k in root_keys}
    root["produits"] = [_product_example_dict()]
    example = json.dumps(root, ensure_ascii=False)
    familles = (
        "Armature, Cloison, Plomberie, Électricité, Menuiserie, Carrelage, Isolation, "
        "Peinture, Outillage, Maçonnerie, Terrassement, Autre."
    )
    return (
        "Extraie TOUTES les lignes produit de cette facture BTP.\n"
        "Retourne UNIQUEMENT un JSON valide avec cette structure exacte:\n"
        f"{example}\n"
        f"Familles BTP: {familles}\n\n" + DOCLING_BTP_SUFFIX.strip()
    )


async def _bytez_request(
    model_id: str,
    payload: dict,
    *,
    provider_key: str | None = None,
    timeout: float = 120.0,
) -> dict:
    """Appel HTTP POST vers Bytez API avec retry (429, 503, erreurs transport httpx)."""
    key = Config.BYTEZ_API_KEY
    if not key:
        raise RuntimeError("BYTEZ_API_KEY manquante dans .env")
    url = f"{BYTEZ_BASE}/{model_id}"
    headers = {
        "Authorization": key,
        "Content-Type": "application/json",
    }
    if provider_key and "google/" in model_id:
        headers["provider-key"] = provider_key

    last_error: BaseException | None = None
    for attempt in range(BYTEZ_HTTP_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in (429, 503) and attempt < BYTEZ_HTTP_ATTEMPTS - 1:
                wait = BYTEZ_BACKOFF_SEC[attempt]
                logger.warning(
                    "Bytez HTTP %s, retry %s/%s après %.0fs",
                    resp.status_code,
                    attempt + 1,
                    BYTEZ_HTTP_ATTEMPTS,
                    wait,
                )
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            code = e.response.status_code if e.response is not None else 0
            if code in (429, 503) and attempt < BYTEZ_HTTP_ATTEMPTS - 1:
                wait = BYTEZ_BACKOFF_SEC[attempt]
                logger.warning(
                    "Bytez HTTPStatusError %s, retry %s/%s après %.0fs",
                    code,
                    attempt + 1,
                    BYTEZ_HTTP_ATTEMPTS,
                    wait,
                )
                await asyncio.sleep(wait)
                continue
            raise
        except httpx.RequestError as e:
            last_error = e
            if attempt < BYTEZ_HTTP_ATTEMPTS - 1:
                wait = BYTEZ_BACKOFF_SEC[attempt]
                logger.warning(
                    "Bytez transport (%s), retry %s/%s après %.0fs",
                    type(e).__name__,
                    attempt + 1,
                    BYTEZ_HTTP_ATTEMPTS,
                    wait,
                )
                await asyncio.sleep(wait)
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("Bytez: aucune tentative n'a abouti")


async def document_qa_extract(
    image_base64: str,
    question: str,
    model_id: str = DEFAULT_BYTEZ_DOC_QA_MODEL,
) -> str | None:
    """
    Document Question Answering — pose une question sur une image de document.
    Retourne la réponse texte ou None en cas d'erreur.
    """
    payload = {
        "question": question,
        "base64": f"data:image/jpeg;base64,{image_base64}",
    }
    try:
        data = await _bytez_request(model_id, payload)
        if data.get("error"):
            logger.warning("Bytez doc-QA error: %s", data["error"])
            return None
        out = data.get("output")
        return str(out) if out is not None else None
    except Exception as e:
        logger.warning("Bytez doc-QA failed: %s", e)
        return None


async def image_chat_extract(
    image_base64: str,
    prompt: str,
    model_id: str = "google/gemma-3-4b-it",
) -> str | None:
    """
    Chat multimodal image+texte — pour extraction structurée.
    Utilise provider-key (GEMINI_API_KEY) si modèle Google.
    """
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image", "base64": image_base64},
                ],
            }
        ],
        "params": {"temperature": 0.1, "max_new_tokens": 4096},
    }
    try:
        provider_key = Config.GEMINI_API_KEY if "google/" in model_id else None
        data = await _bytez_request(model_id, payload, provider_key=provider_key)
        if data.get("error"):
            logger.warning("Bytez image-chat error: %s", data["error"])
            return None
        out = data.get("output")
        if isinstance(out, list) and out:
            msg = out[0]
            out = msg.get("content", msg) if isinstance(msg, dict) else msg
        return str(out) if out is not None else None
    except Exception as e:
        logger.warning("Bytez image-chat failed: %s", e)
        return None


def _parse_json_from_response(text: str) -> dict | None:
    """Extrait un objet JSON de la réponse texte."""
    if not text:
        return None
    json_match = re.search(r"\{[\s\S]*\}", text)
    if not json_match:
        return None
    snippet = json_match.group()
    try:
        return json.loads(snippet)
    except json.JSONDecodeError:
        if _json_snippet_likely_truncated(snippet):
            logger.warning(
                "JSON probablement tronqué (max_new_tokens / réponse coupée)",
            )
        return None


async def extract_invoice_fallback(
    image_bytes: bytes,
    filename: str,
) -> InvoiceExtractionResult | None:
    """
    Fallback Bytez quand Gemini échoue (rate limit, indisponible).
    Utilise document-QA avec questions ciblées ou chat multimodal.
    """
    if not Config.BYTEZ_API_KEY:
        return None
    b64 = base64.b64encode(image_bytes).decode("ascii")
    prompt = _build_bytez_extraction_prompt()
    raw = await image_chat_extract(b64, prompt)
    if not raw:
        logger.info("Bytez image-chat sans réponse brute, fichier=%s", filename)
        raw = await document_qa_extract(
            b64,
            "Liste toutes les lignes produit avec désignation, quantité, prix unitaire HT et prix total. Format JSON.",
        )
    if not raw:
        logger.warning("Bytez fallback: aucune réponse texte, fichier=%s", filename)
        return None
    data = _parse_json_from_response(raw)
    if not data or "produits" not in data:
        logger.warning(
            "Bytez fallback: JSON absent ou sans clé produits, fichier=%s",
            filename,
        )
        return None
    fournisseur_default = data.get("fournisseur_detecte") or "Inconnu"
    produits = []
    for p in data.get("produits", []):
        try:
            coerced = coerce_invoice_product_dict(p, fournisseur_fallback=fournisseur_default)
            if coerced is None:
                continue
            produits.append(Product(**coerced))
        except Exception:
            continue
    if not produits:
        logger.warning("Bytez fallback: aucun produit valide après parsing, fichier=%s", filename)
        return None
    return InvoiceExtractionResult(
        produits=produits,
        fournisseur_detecte=data.get("fournisseur_detecte", ""),
        numero_facture=data.get("numero_facture", ""),
        date_facture=data.get("date_facture", ""),
        langue_detectee=data.get("langue_detectee", "fr"),
        nb_lignes_brutes=len(produits),
        tokens_used=0,
    )
