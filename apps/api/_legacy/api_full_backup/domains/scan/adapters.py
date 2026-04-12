"""Adaptateurs scan : wrappers vers core/services existants."""

from core.orchestrator import Orchestrator
from domains.scan.ports import ExtractionEngine, PresignedPdfUrlResolver
from services.storage_service import StorageService


class OrchestratorExtractionEngine:
    """Wrap statique Orchestrator.process_file derrière le port ExtractionEngine."""

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
        return await Orchestrator().process_file(
            file_bytes=file_bytes,
            filename=filename,
            model_id=model_id,
            source=source,
            user_id=user_id,
            ocr_engine=ocr_engine,
            preprocess_mode=preprocess_mode,
        )


class StoragePresignedPdfUrlResolver:
    """Wrap StorageService.get_presigned_url_from_pdf_url."""

    async def get_presigned_url_from_pdf_url(
        self, pdf_url: str, *, user_id: int | None = None
    ) -> str | None:
        if not pdf_url:
            return None
        # Extraction de la clé : on prend tout ce qui suit le bucket name ou le domaine
        # Pour S3: https://bucket.s3.amazonaws.com/KEY ou http://endpoint/bucket/KEY
        # Pour GCS: https://storage.googleapis.com/bucket/KEY
        key = pdf_url
        if "://" in pdf_url:
            parts = pdf_url.split("/", 3)
            if len(parts) > 3:
                # Si Storj/custom endpoint http://.../bucket/key
                if "storjshare.io" in parts[2] or "localhost" in parts[2]:
                    # parts[3] est bucket/key -> on re-split
                    sub = parts[3].split("/", 1)
                    key = sub[1] if len(sub) > 1 else sub[0]
                else:
                    # S3 ou GCS standard: domain/bucket/key ou bucket.s3.../key
                    key = parts[3]
        
        return await StorageService.get_presigned_url(key, user_id=user_id)



_scan_extraction_engine: ExtractionEngine = OrchestratorExtractionEngine()
_scan_presigned_resolver: PresignedPdfUrlResolver = StoragePresignedPdfUrlResolver()


def get_scan_extraction_engine() -> ExtractionEngine:
    """Singleton + point d’injection FastAPI / tests (dependency_overrides)."""
    return _scan_extraction_engine


def get_scan_presigned_pdf_url_resolver() -> PresignedPdfUrlResolver:
    return _scan_presigned_resolver
