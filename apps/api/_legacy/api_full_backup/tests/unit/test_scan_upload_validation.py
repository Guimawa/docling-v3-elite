"""Validation upload scan : MIME, extension, signatures (TestClient, sans serveur)."""

import os

# Avant import du routeur (Limiter lit DISABLE_RATE_LIMIT à l'import).
os.environ.setdefault("DISABLE_RATE_LIMIT", "true")

from fastapi import FastAPI
from fastapi.testclient import TestClient

from domains.scan import extraction as ext
from domains.scan.adapters import get_scan_extraction_engine
from domains.scan.router import router
from domains.shared.dependencies import require_active_subscription
from domains.shared.rate_limit import limiter


def _scan_client() -> TestClient:
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)
    app.dependency_overrides[require_active_subscription] = lambda: 1
    app.dependency_overrides[get_scan_extraction_engine] = lambda: object()
    return TestClient(app)


def test_process_rejects_forged_jpeg_holding_pdf() -> None:
    client = _scan_client()
    pdf_like = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<</Length 0>>endobj trailer<<>>\n%%EOF\n"
    files = {"file": ("facture.jpg", pdf_like, "image/jpeg")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415
    detail = str(resp.json().get("detail", "")).lower()
    assert "jpeg" in detail and "pdf" in detail


def test_process_rejects_pdf_extension_with_jpeg_mime() -> None:
    client = _scan_client()
    pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    files = {"file": ("facture.pdf", pdf_bytes, "image/jpeg")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415
    assert "incohérent" in str(resp.json().get("detail", "")).lower()


def test_process_rejects_pe_stub_as_pdf() -> None:
    client = _scan_client()
    pe_stub = b"MZ\x00\x00" + b"\x00" * 64
    files = {"file": ("x.pdf", pe_stub, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415


def test_process_rejects_empty_upload() -> None:
    client = _scan_client()
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 415


def test_process_accepts_mistral_model_id() -> None:
    client = _scan_client()
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF\n"
    filename = "ok-mistral.pdf"
    files = {"file": (filename, pdf_bytes, "application/pdf")}
    dedup_hash = ext.dedup_key(filename, len(pdf_bytes), 1)
    ext.dedup_set(dedup_hash, "job-mistral")
    data = {"model": "mistral-ocr-latest", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 200


def test_process_accepts_chandra_model_id() -> None:
    client = _scan_client()
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF\n"
    filename = "ok-chandra.pdf"
    files = {"file": (filename, pdf_bytes, "application/pdf")}
    dedup_hash = ext.dedup_key(filename, len(pdf_bytes), 1)
    ext.dedup_set(dedup_hash, "job-chandra")
    data = {"model": "chandra-ocr-2", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 200


def test_process_accepts_lighton_model_id() -> None:
    client = _scan_client()
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF\n"
    filename = "ok-lighton.pdf"
    files = {"file": (filename, pdf_bytes, "application/pdf")}
    dedup_hash = ext.dedup_key(filename, len(pdf_bytes), 1)
    ext.dedup_set(dedup_hash, "job-lighton")
    data = {"model": "lightonocr-2-1b", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 200


def test_process_rejects_unknown_model_id() -> None:
    client = _scan_client()
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF\n"
    files = {"file": ("ok.pdf", pdf_bytes, "application/pdf")}
    data = {"model": "model-inconnu", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 400
