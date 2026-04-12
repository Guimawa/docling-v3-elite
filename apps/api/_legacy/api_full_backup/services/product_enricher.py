# services/product_enricher.py
"""
Enrichissement automatique "Elite 2026" via Gemini + Google Search.
SDK google-genai, isolation des prompts et validation Pydantic V2.
"""

import asyncio
import logging
from typing import Optional

from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from core.config import Config

logger = logging.getLogger(__name__)

# --- SCHÉMAS PYDANTIC V2 ---

class ProductEnrichmentResult(BaseModel):
    photo_url: Optional[str] = Field(None, description="URL directe d'une photo publique")
    description_ia: Optional[str] = Field(None, description="Description courte en français")
    marque: Optional[str] = Field(None, description="Marque fabricant")
    reference_fab: Optional[str] = Field(None, description="Référence fabricant")
    found: bool = Field(False, description="True si info fiable trouvée")

# --- CONFIGURATION PROMPTS ---

ENRICH_PROMPT_BASE = """Tu es un expert en matériaux BTP. Recherche des informations fiables sur ce produit.

INSTRUCTIONS :
1. Trouve une photo (URL directe), une description courte (2-3 phrases), la marque et la référence.
2. Si tu ne trouves pas de données fiables, retourne found=false.
3. Ne jamais inventer de données. Use uniquement Google Search.
"""

# --- LOGIQUE D'ENRICHISSEMENT ---

async def enrich_product(
    designation: str,
    famille: str,
    fournisseur: str,
) -> ProductEnrichmentResult:
    """
    Enrichit un produit via Gemini + Grounding Google Search (Async).
    """
    if not Config.GEMINI_API_KEY:
        return ProductEnrichmentResult(found=False)

    client = genai.Client(api_key=Config.GEMINI_API_KEY)
    
    # Isolation des données pour bloquer l'injection
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(f"Produit : {designation}"),
                types.Part.from_text(f"Famille : {famille}"),
                types.Part.from_text(f"Fournisseur : {fournisseur}"),
            ]
        )
    ]

    generate_config = types.GenerateContentConfig(
        system_instruction=ENRICH_PROMPT_BASE,
        response_mime_type="application/json",
        response_schema=ProductEnrichmentResult,
        temperature=0.1,
        # Activation du Google Search Grounding
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    try:
        response = await client.models.generate_content(
            model=Config.GEMINI_MODEL_ID,
            contents=contents,
            config=generate_config
        )
        return ProductEnrichmentResult.model_validate_json(response.text)
    except Exception as e:
        logger.warning(f"[enrich] Fail for '{designation[:40]}': {e}")
        return ProductEnrichmentResult(found=False)

async def enrich_product_in_db(
    conn, product_id: int, designation: str, famille: str, fournisseur: str
):
    """Enrichissement et mise à jour asynchrone en base."""
    result = await enrich_product(designation, famille, fournisseur)
    if not result.found:
        return

    import json
    await conn.execute(
        """
        UPDATE produits SET
            photo_url      = COALESCE($1, photo_url),
            description_ia = COALESCE($2, description_ia),
            attributes     = attributes || $3::jsonb
        WHERE id = $4
        """,
        result.photo_url,
        result.description_ia,
        json.dumps({
            k: v for k, v in {
                "marque": result.marque,
                "reference_fab": result.reference_fab
            }.items() if v
        }),
        product_id,
    )

async def enrich_batch(conn, limit: int = 20):
    """Job batch performant avec throttling intelligent."""
    rows = await conn.fetch(
        """
        SELECT id, designation_fr, famille, fournisseur
        FROM produits
        WHERE (photo_url IS NULL OR description_ia IS NULL)
        AND designation_fr IS NOT NULL
        ORDER BY created_at DESC
        LIMIT $1
        """,
        limit,
    )

    logger.info(f"[enrich_batch] {len(rows)} produits en attente")

    for row in rows:
        await enrich_product_in_db(
            conn, row["id"], row["designation_fr"], row["famille"] or "", row["fournisseur"] or ""
        )
        await asyncio.sleep(0.5) # Anti rate-limiting
