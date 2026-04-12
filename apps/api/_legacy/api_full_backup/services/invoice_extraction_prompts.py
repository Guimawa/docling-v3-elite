"""
Shared invoice-extraction prompts — document-intelligence style + Docling product schema.

The pipeline always outputs Docling business JSON (BTP products, ex-VAT / VAT), not a full universal
invoice schema: universal rules steer extraction quality.
"""

# Cross-cutting rules (multilingual documents, quality, anti-hallucination)
UNIVERSAL_INVOICE_RULES = """
CROSS-CUTTING RULES — INVOICE EXTRACTION (expert document intelligence)

1) LANGUAGE — Detect the document language (ISO 639-1: fr, es, ca, en, de, it, pt, etc.) and set
   "langue_detectee". Product labels in "designation_raw" must match the document EXACTLY (do not translate
   printed values). "designation_fr" = concise French translation (max 80 characters).

2) QUALITY — Blurry scan, mobile photo, skewed page: reason visually to read values; if a value is doubtful,
   set confidence "low" for that line. Never invent amounts or lines that are not on the document.

3) LINE SCOPE — One "produits" entry per row of the ARTICLE TABLE only (not aggregate totals, not VAT-only
   lines alone, not stand-alone deposits without line detail, not global shipping without a product line,
   not legal/footer boilerplate).

4) CONSISTENCY — All price fields in the JSON are **unit prices** (catalogue unit / "Preu"), not line totals
   ("Import"). Check Preu × (1−discount) ≈ net unit HT, and unit HT × 1.21 ≈ unit gross TTC. If inconsistent,
   set confidence "low".

5) OUTPUT — A single valid JSON object, no markdown or text outside JSON, matching the API schema (structured
   output).
"""

# Docling-specific instructions (BTP catalogue, families, unit pricing)
DOCLING_BTP_SUFFIX = """
DOCLING CONTEXT — Construction suppliers FR / ES / CA (BigMat, Leroy Merlin ES, etc.).

TASK: Extract EVERY product row from the article table into the JSON array "produits".

BTP FAMILIES (pick the closest; use these exact French labels):
Armature, Cloison, Climatisation, Plomberie, Électricité, Menuiserie, Couverture, Carrelage,
Isolation, Peinture, Outillage, Consommable, Maçonnerie, Terrassement, Autre

PRICE FIELDS — **ALWAYS UNIT PRICES** (do not output quantity; do not put line totals in these fields).

Typical Catalan / Spanish invoice columns (BigMat-style):
- **Preu** = catalogue **unit** price ex-VAT before discount → map to "prix_brut_ht".
- **Dte.** = line discount % (contractor) → "remise_pct".
- **Import** = **line** total ex-VAT after discount (= Quantitat × Preu × (1−Dte/100)) → do **NOT** put it in
  "prix_remise_ht" or "prix_brut_ht". Ignore Import for those fields except as a sanity check.

Required extraction logic:
- "prix_remise_ht" = **unit** ex-VAT after discount = Preu × (1 − remise_pct/100). E.g. Preu 38, Dte 15% → 32.30.
- "prix_ttc_remise" = **unit** gross TTC after discount = prix_remise_ht × 1.21 (21% VAT) if no printed unit TTC
  column; otherwise the printed discounted **unit** TTC.
- "prix_ttc_non_remise" = **unit** gross TTC without discount = prix_brut_ht × 1.21 (or printed catalogue unit TTC).
- "prix_ttc_iva21" = same as "prix_ttc_remise" when VAT is 21%.

- **Quantitat**: you may read it to verify (Import ≈ Quantitat × discounted unit HT), but **do not** emit it in JSON
  (no quantity field in output).

- Do **NOT** swap discounted vs non-discounted TTC: with a discount, discounted unit TTC must be **lower** than
  non-discounted unit TTC.

- Do not confuse **Preu** (unit) and **Import** (line). If you only have Import and Quantitat: discounted unit =
  Import / Quantitat; catalogue unit Preu = discounted_unit / (1 − remise/100). Then fill prix_brut_ht and
  prix_remise_ht as **units**.

- Unreadable amount → 0 and confidence "low".

- Do NOT fill "prix_conseille_vente" (user catalogue only, not OCR).

- Common Spanish line VAT **21%**: ex-VAT → gross TTC = **× 1.21** (use factor **1.21** to sanity-check unit HT).
"""


def build_gemini_system_instruction() -> str:
    """Gemini system instruction: universal rules + Docling BTP suffix."""
    return (
        "You are a supplier-invoice extraction engine (vision + reasoning).\n"
        + UNIVERSAL_INVOICE_RULES.strip()
        + "\n\n"
        + DOCLING_BTP_SUFFIX.strip()
    )


def build_mistral_annotation_user_context(ocr_text: str | None) -> str:
    """Optional noisy local OCR context for Mistral."""
    if not ocr_text:
        return ""
    excerpt = ocr_text[:12000]


def build_mistral_annotation_instructions(ocr_text: str | None = None) -> str:
    """Combined text for document_annotation_prompt (Mistral OCR) or chat system message (two-step)."""
    base = (
        "You extract BTP supplier invoices. Follow the rules below.\n"
        + UNIVERSAL_INVOICE_RULES.strip()
        + "\n\n"
        + DOCLING_BTP_SUFFIX.strip()
        + "\n\n"
        "One 'produits' entry per row of the ARTICLE TABLE only.\n"
        "designation_raw = printed line text (reference/code included); "
        "designation_fr = concise French translation (max 80 characters).\n"
        "Return ONLY a valid JSON object with the annotation schema keys "
        "(fournisseur_detecte, numero_facture, date_facture, langue_detectee, nb_lignes_brutes, produits). "
        "Each product: fournisseur, designation_raw, designation_fr, famille, unite, prix_brut_ht, "
        "remise_pct, prix_remise_ht, prix_ttc_remise, prix_ttc_non_remise, prix_ttc_iva21, "
        "numero_facture, date_facture, confidence.\n"
        "No markdown.\n"
        "Allowed families: Armature, Cloison, Climatisation, Plomberie, Électricité, "
        "Menuiserie, Couverture, Carrelage, Isolation, Peinture, Outillage, Consommable, "
        "Maçonnerie, Terrassement, Autre."
    )
    return base + build_mistral_annotation_user_context(ocr_text)
