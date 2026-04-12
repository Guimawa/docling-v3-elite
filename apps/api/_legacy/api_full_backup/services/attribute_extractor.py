# services/attribute_extractor.py
"""
Extraction attributs BTP "Elite 2026" — Gemini en PRIMAIRE (SDK V1 async), Mistral en fallback.
Utilise l'isolation stricte des données pour prévenir les injections de prompt.
"""

import logging
import os
from typing import Annotated, List, Optional

from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from core.config import Config

logger = logging.getLogger(__name__)

# --- SCHÉMAS PYDANTIC V2 ---

class MissingQuestion(BaseModel):
    key: str = Field(description="Clé technique de l'attribut")
    question: str = Field(description="Question claire pour l'utilisateur")
    options: List[str] = Field(description="3-7 options suggérées")

class AttributeExtractionResult(BaseModel):
    sous_famille: Optional[str] = None
    type_produit: Optional[str] = None
    variante: Optional[str] = None
    dimension: Optional[str] = None
    longueur: Optional[str] = None
    conditionnement: Optional[str] = None
    questions_manquantes: List[MissingQuestion] = Field(default_factory=list)

# --- CONFIGURATION PROMPTS ---

SYSTEM_PROMPT = """Expert matériaux BTP. Ton rôle est d'extraire les attributs structurés d'une désignation produit.

RÈGLES CRITIQUES :
1. Retourne null pour tout attribut absent ou NON APPLICABLE.
2. questions_manquantes : ne pose des questions que si c'est PERTINENT pour le type de produit.
   - Raccord → angle, diamètre.
   - Tube → diamètre/section, longueur.
   - Sac/bidon → poids/volume.
3. Ne jamais demander ce qui est déjà visible dans la désignation.
4. Options : 3-7 max, ultra-pertinentes.
"""

# --- MOTEURS D'EXTRACTION ---

async def _gemini(designation: str, famille: str, fournisseur: str) -> AttributeExtractionResult:
    """Extraction via SDK google-genai (Async Natif)."""
    client = genai.Client(api_key=Config.GEMINI_API_KEY)
    
    # Isolation des données pour prévenir l'injection
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(f"Désignation: {designation}"),
                types.Part.from_text(f"Famille: {famille}"),
                types.Part.from_text(f"Fournisseur: {fournisseur}"),
            ]
        )
    ]
    
    generate_config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=AttributeExtractionResult,
        temperature=0,
        max_output_tokens=1000,
    )
    
    response = await client.models.generate_content(
        model=Config.GEMINI_MODEL_ID, # Utilise le modèle centralisé
        contents=contents,
        config=generate_config
    )
    
    return AttributeExtractionResult.model_validate_json(response.text)

async def _mistral(designation: str, famille: str, fournisseur: str) -> AttributeExtractionResult:
    """Fallback Mistral AI."""
    from mistralai import Mistral
    import json

    client = Mistral(api_key=os.environ.get("MISTRAL_API_KEY"))
    prompt = f"Désignation: {designation}\nFamille: {famille}\nFournisseur: {fournisseur}"
    
    response = await client.chat.complete_async(
        model="mistral-small-latest",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "AttributeExtraction",
                "schema": AttributeExtractionResult.model_json_schema(),
                "strict": True
            },
        },
        temperature=0,
    )
    
    raw_text = response.choices[0].message.content
    return AttributeExtractionResult.model_validate_json(raw_text)

# --- INTERFACE PUBLIQUE ---

async def extract_attributes(designation: str, famille: str, fournisseur: str = "") -> dict:
    """
    Interface unifiée avec résilience 2026.
    Retourne: { "found": {...}, "questions": [...] }
    """
    result = None
    
    # Tentative avec Gemini (Primaire) puis Mistral (Fallback)
    for engine_name, engine_fn in [("gemini", _gemini), ("mistral", _mistral)]:
        try:
            result = await engine_fn(designation, famille, fournisseur)
            logger.info(f"[attrs] {engine_name} OK — {designation[:40]}...")
            break
        except Exception as e:
            logger.warning(f"[attrs] {engine_name} failed: {e}")

    if not result:
        return {"found": {}, "questions": []}

    # Formatage de sortie compatible pour le frontend
    found = result.model_dump(exclude={"questions_manquantes"}, exclude_none=True)
    questions = [q.model_dump() for q in result.questions_manquantes]

    return {
        "found": found,
        "questions": questions
    }
