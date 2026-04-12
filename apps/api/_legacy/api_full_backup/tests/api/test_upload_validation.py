"""
Tests API — validation upload (taille, MIME, fichier vide).
"""


def test_upload_too_large_returns_413(authenticated_client):
    """Upload d'un fichier trop grand (> 50 Mo) → 413 Request Entity Too Large."""
    client, _ = authenticated_client
    big_content = b"x" * (51 * 1024 * 1024)
    files = {"file": ("large.pdf", big_content, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 413


def test_upload_wrong_mime_type(authenticated_client):
    """Upload d'un fichier avec mauvais type MIME → 415 ou 422."""
    client, _ = authenticated_client
    files = {"file": ("script.exe", b"MZ\x00\x00", "application/octet-stream")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code in (415, 422, 400)


def test_upload_empty_file(authenticated_client):
    """Upload d'un fichier vide → rejet (contenu invalide)."""
    client, _ = authenticated_client
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415


def test_upload_forged_mime_pdf_disguised_as_jpeg(authenticated_client):
    """PDF réel avec extension .jpg et MIME image/jpeg (cohérent mais contenu PDF) → 415."""
    client, _ = authenticated_client
    pdf_like = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<</Length 0>>endobj trailer<<>>\n%%EOF\n"
    files = {"file": ("facture.jpg", pdf_like, "image/jpeg")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415
    detail = str(resp.json().get("detail", "")).lower()
    assert "jpeg" in detail and "pdf" in detail


def test_upload_mime_inconsistent_with_extension(authenticated_client):
    """Extension .pdf mais Content-Type image/jpeg (MIME forgé / incohérent) → 415."""
    client, _ = authenticated_client
    pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    files = {"file": ("facture.pdf", pdf_bytes, "image/jpeg")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415


def test_upload_exe_with_pdf_extension(authenticated_client):
    """Binaire PE (.exe) renommé en .pdf → 415 (signature non PDF)."""
    client, _ = authenticated_client
    pe_stub = b"MZ\x00\x00" + b"\x00" * 64
    files = {"file": ("malware.pdf", pe_stub, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415
