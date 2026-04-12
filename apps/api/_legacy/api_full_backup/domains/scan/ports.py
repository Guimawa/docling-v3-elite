"""Ports (Protocols) du domaine scan — inversion de dépendances légère."""

from typing import Protocol


class ExtractionEngine(Protocol):
    """Moteur d'extraction facture (impl. typique : Orchestrator.process_file)."""

    async def process_file(
        self,
        file_bytes: bytes,
        filename: str,
        *,
        model_id: str,
        source: str,
        user_id: int | None = None,
        ocr_engine: str = "standard",
        preprocess_mode: str = "basic",
    ) -> dict:
        """Retourne le dict métier (success, products, error, …)."""
        ...

class PresignedPdfUrlResolver(Protocol):
    """Résolveur d'URL pré-signée à partir d'une URL de stockage persistée."""

    async def get_presigned_url_from_pdf_url(
        self, pdf_url: str, *, user_id: int | None = None
    ) -> str | None:
        """Déduit la clé et génère une URL temporaire."""
        ...
