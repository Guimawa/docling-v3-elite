"""
Service OCR Tesseract — Docling API.

Extraction best-effort de texte brut depuis images/PDF pour enrichir le contexte Gemini.
Ne bloque jamais le pipeline en cas d'absence de Tesseract ou d'erreur OCR.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

_SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


def _ext_for_filename_or_mime(filename: str, mime_type: str) -> str:
    if "." in filename:
        ext = filename.lower().rsplit(".", 1)[-1]
        if ext:
            return ext
    if mime_type == "application/pdf":
        return "pdf"
    if mime_type == "image/png":
        return "png"
    if mime_type == "image/webp":
        return "webp"
    if mime_type in {"image/heic", "image/heif"}:
        return "heic"
    return "jpg"


def extract_ocr_text(file_bytes: bytes, filename: str, mime_type: str) -> str | None:
    """
    Retourne le texte OCR extrait par Tesseract ou None si indisponible/échec.
    """
    if mime_type not in _SUPPORTED_MIME_TYPES:
        return None

    tesseract_bin = shutil.which("tesseract")
    if not tesseract_bin:
        logger.debug("Tesseract non disponible dans PATH: OCR ignoré pour %s", filename)
        return None

    suffix = f".{_ext_for_filename_or_mime(filename, mime_type)}"
    with tempfile.TemporaryDirectory(prefix="docling-ocr-") as tmp_dir:
        input_path = Path(tmp_dir) / f"input{suffix}"
        output_base = Path(tmp_dir) / "ocr_out"
        input_path.write_bytes(file_bytes)

        cmd = [
            tesseract_bin,
            str(input_path),
            str(output_base),
            "-l",
            "fra+spa+cat+eng",
            "--dpi",
            "300",
        ]
        try:
            proc = subprocess.run(
                cmd,
                check=False,
                capture_output=True,
                text=True,
                timeout=25,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            logger.warning("OCR Tesseract erreur process pour %s: %s", filename, exc)
            return None

        if proc.returncode != 0:
            stderr = (proc.stderr or "").strip()
            logger.debug(
                "OCR Tesseract KO pour %s (code=%s): %s", filename, proc.returncode, stderr[:240]
            )
            return None

        out_txt = output_base.with_suffix(".txt")
        if not out_txt.exists():
            return None

        text = out_txt.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            return None

        logger.debug("OCR Tesseract OK %s (%d chars)", filename, len(text))
        return text
