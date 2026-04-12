# services/dedup_service.py
"""
Detection de doublons produit "Elite 2026".
Fuzzy matching avec optimisation SQL ANY($1) et validation Pydantic V2.
"""

import logging
import re
import unicodedata
from typing import List, Optional, Tuple, Dict
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# --- CONFIGURATION 2026 ---
SEUIL_DESIGNATION = 0.85
SEUIL_FOURNISSEUR = 0.90

# --- SCHÉMAS ---

class DedupScore(BaseModel):
    designation: float
    fournisseur: float

class ProductDedupInput(BaseModel):
    designation_fr: str
    fournisseur: str

class ProductDedupResult(BaseModel):
    is_new: bool
    dup_match_id: Optional[int] = None
    scores: Optional[DedupScore] = None

# --- ALGORITHMES ---

def normalize(text: str) -> str:
    """Normalise une chaine: minuscules, sans accents, sans ponctuation."""
    if not text: return ""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"(?<=\d)(?=[a-z])", " ", text)
    text = re.sub(r"(?<=[a-z])(?=\d)", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def token_similarity(a: str, b: str) -> float:
    """Similarite Jaccard sur les tokens."""
    tok_a = set(normalize(a).split())
    tok_b = set(normalize(b).split())
    if not tok_a and not tok_b: return 1.0
    if not tok_a or not tok_b: return 0.0
    return len(tok_a & tok_b) / max(len(tok_a), len(tok_b))

def levenshtein_sim(a: str, b: str) -> float:
    """Similarite normalisee Levenshtein."""
    na, nb = normalize(a), normalize(b)
    m, n = len(na), len(nb)
    if not m or not n: return 1.0 if m == n else 0.0
    
    # Optimisation espace O(min(m,n))
    if m < n: na, nb, m, n = nb, na, n, m
    prev = list(range(n + 1))
    for i, ca in enumerate(na):
        curr = [i + 1]
        for j, cb in enumerate(nb):
            curr.append(min(curr[j] + 1, prev[j + 1] + 1, prev[j] + (ca != cb)))
        prev = curr
    return 1.0 - prev[n] / max(m, n)

# --- LOGIQUE MÉTIER ---

def check_duplicate(
    designation: str,
    fournisseur: str,
    reference_rows: List[dict]
) -> Tuple[bool, Optional[dict], Optional[DedupScore]]:
    best_match = None
    best_combined = 0.0
    best_scores = None

    for row in reference_rows:
        # Optimisation : Skip si le fournisseur est trop différent (calcul rapide)
        f_score = levenshtein_sim(fournisseur, row.get("fournisseur", ""))
        if f_score < SEUIL_FOURNISSEUR: continue
        
        d_score = max(token_similarity(designation, row.get("designation_fr", "")), 
                      levenshtein_sim(designation, row.get("designation_fr", "")) * 0.8)

        if d_score >= SEUIL_DESIGNATION:
            combined = d_score + f_score
            if combined > best_combined:
                best_match = row
                best_combined = combined
                best_scores = DedupScore(designation=round(d_score, 3), fournisseur=round(f_score, 3))

    return best_match is not None, best_match, best_scores

async def mark_new_products(products: List[dict], conn) -> List[dict]:
    """Version async performante avec SQL ANY($1)."""
    if not products: return []

    fournisseurs = list({p.get("fournisseur") for p in products if p.get("fournisseur")})
    if not fournisseurs:
        return [{**p, "is_new": True} for p in products]

    # SQL Hardening : usage de ANY($1) natif asyncpg
    rows = await conn.fetch(
        "SELECT id, designation_fr, fournisseur FROM produits WHERE fournisseur = ANY($1)",
        fournisseurs
    )
    ref_rows = [dict(r) for r in rows]
    
    enriched = []
    for p in products:
        is_dup, match, scores = check_duplicate(
            p.get("designation_fr", ""), 
            p.get("fournisseur", ""), 
            ref_rows
        )
        enriched.append({
            **p,
            "is_new": not is_dup,
            "_dup_match_id": match["id"] if match else None,
            "_dup_scores": scores.model_dump() if scores else None
        })
    
    return enriched
