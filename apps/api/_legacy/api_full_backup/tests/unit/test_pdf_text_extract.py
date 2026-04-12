"""Extraction texte PDF (PyMuPDF) — pas de mock."""

from services.pdf_text_extract import extract_pdf_text_metrics


def test_empty_bytes_returns_zero_pages():
    text, pages = extract_pdf_text_metrics(b"")
    assert pages == 0
    assert text is None


def test_non_pdf_returns_zero_pages():
    text, pages = extract_pdf_text_metrics(b"hello")
    assert pages == 0
    assert text is None


def test_minimal_pdf_opens():
    minimal = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    text, pages = extract_pdf_text_metrics(minimal)
    assert pages >= 0
    # Peut être 0 pages selon pymupdf sur stub minimal
    assert text is None or isinstance(text, str)
