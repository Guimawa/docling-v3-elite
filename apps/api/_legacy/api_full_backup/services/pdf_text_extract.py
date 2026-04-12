"""
Extraction texte depuis la couche native des PDF (PyMuPDF / fitz).
Utilisé pour enrichir le contexte Gemini lorsque le texte est suffisant par page.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def extract_pdf_text_metrics(file_bytes: bytes) -> tuple[str | None, int]:
    """
    Retourne (texte concaténé, nombre de pages).
    Si pymupdf est absent ou échec, (None, 0).
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.debug("pymupdf non installe — extraction texte PDF ignoree")
        return None, 0
    if not file_bytes or not file_bytes.startswith(b"%PDF"):
        return None, 0
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        logger.debug("Ouverture PDF pymupdf: %s", e)
        return None, 0
    try:
        n = doc.page_count
        if n <= 0:
            return None, 0
        parts: list[str] = []
        for i in range(n):
            try:
                parts.append(doc.load_page(i).get_text("text") or "")
            except Exception:
                parts.append("")
        text = "\n".join(parts).strip()
        return (text if text else None, n)
    finally:
        doc.close()
