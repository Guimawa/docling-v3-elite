import asyncio
import hashlib
import logging
import time
from contextlib import asynccontextmanager

from core.config import Config
from core.db_manager import DBManager
from domains.scan.ports import ExtractionEngine
from domains.shared.request_context import request_id_var

logger = logging.getLogger(__name__)

_MAX_UPLOAD_BYTES = 50 * 1024 * 1024
_ALLOWED_MIMES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
_ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
# MIME canonique par extension (cohérence déclarée ↔ nom de fichier)
_EXTENSION_CANONICAL_MIME: dict[str, str] = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
_EXTENSION_TO_KIND: dict[str, str] = {
    ".pdf": "pdf",
    ".jpg": "jpeg",
    ".jpeg": "jpeg",
    ".png": "png",
    ".webp": "webp",
}
_CHUNK_SIZE = 256 * 1024


def sniff_upload_media_kind(data: bytes) -> str | None:
    """Identifie le type réel par signature binaire (PDF / JPEG / PNG / WebP)."""
    if not data:
        return None
    if data[:4] == b"%PDF":
        return "pdf"
    if len(data) >= 3 and data[0:3] == b"\xff\xd8\xff":
        return "jpeg"
    if len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None



# Déduplication Distribuée (PostgreSQL) — Logic Helper
# On ne stocke plus rien en local (_dedup_cache supprimé)

def dedup_key(filename: str, file_size: int, user_id: int | None) -> str:
    """Génère une clé unique pour un fichier."""
    h = hashlib.sha256(f"{filename}-{file_size}-{user_id}".encode()).hexdigest()
    return f"dedup:{h}"

async def dedup_get(key: str) -> str | None:
    """Proxy vers DBManager pour le cache distribué."""
    return await DBManager.dedup_get(key)

async def dedup_set(key: str, job_id: str, user_id: int | None = None) -> None:
    """Proxy vers DBManager pour le cache distribué."""
    await DBManager.dedup_set(key, job_id, user_id)

async def dedup_cleanup() -> None:
    """Proxy vers DBManager pour le nettoyage automatique."""
    await DBManager.dedup_cleanup()

_extraction_semaphore = asyncio.Semaphore(3)


class GeminiCircuitBreaker:
    COOLDOWN_SEC = 60

    def __init__(self, threshold: int = 5):
        self._threshold = threshold
        self._consecutive_errors = 0
        self._open_until: float = 0.0
        self._lock = asyncio.Lock()
        self._last_state_change = time.monotonic()

    def get_state(self) -> dict:
        return {
            "open": self.is_open(),
            "consecutive_errors": self._consecutive_errors,
            "threshold": self._threshold,
            "open_until": self._open_until if self.is_open() else None,
        }

    def is_open(self) -> bool:
        return time.monotonic() < self._open_until

    async def record_success(self) -> None:
        async with self._lock:
            self._consecutive_errors = 0

    async def record_failure(self) -> bool:
        async with self._lock:
            self._consecutive_errors += 1
            if self._consecutive_errors >= self._threshold:
                self._consecutive_errors = 0
                self._open_until = time.monotonic() + self.COOLDOWN_SEC
                return True
            return False

    @property
    def threshold(self) -> int:
        return self._threshold


_gemini_cb = GeminiCircuitBreaker(threshold=5)


def get_gemini_circuit_breaker_state() -> dict:
    """Accès public à l'état du circuit (monitoring/health)."""
    return _gemini_cb.get_state()


def sanitize_job_error(err: Exception, tripped: bool = False) -> str:
    msg = str(err).lower()
    if tripped:
        return "Service d'extraction temporairement indisponible. Réessayez dans quelques minutes."
    if "429" in msg or "resource_exhausted" in msg or "rate" in msg or "quota" in msg:
        return "Quota API dépassé. Réessayez plus tard."
    if "401" in msg or "403" in msg or ("invalid" in msg and "key" in msg) or "api_key" in msg:
        return "Clé API invalide ou inexistante."
    if "timeout" in msg or "timed out" in msg:
        return "Délai d'attente dépassé. Réessayez."
    return "Erreur lors de l'extraction. Réessayez ou contactez le support."


def dedup_key(filename: str, file_size: int, user_id: int | None) -> str:
    raw = f"{filename}:{file_size}:{user_id}"
    return hashlib.sha256(raw.encode()).hexdigest()


def dedup_cleanup() -> None:
    now = time.time()
    expired = [k for k, (_, ts) in _dedup_cache.items() if now - ts > _DEDUP_TTL_SECONDS]
    for k in expired:
        del _dedup_cache[k]


def dedup_get(hash_key: str) -> tuple[str, float] | None:
    return _dedup_cache.get(hash_key)


def dedup_set(hash_key: str, job_id: str) -> None:
    _dedup_cache[hash_key] = (job_id, time.time())


# Constants exportées pour le routeur
UPLOAD_MAX_BYTES = _MAX_UPLOAD_BYTES
ALLOWED_MIMES = _ALLOWED_MIMES
ALLOWED_EXTENSIONS = _ALLOWED_EXTENSIONS
CHUNK_SIZE = _CHUNK_SIZE
EXTENSION_CANONICAL_MIME = _EXTENSION_CANONICAL_MIME
EXTENSION_TO_KIND = _EXTENSION_TO_KIND


def _resolve_extraction_engine(engine: ExtractionEngine | None) -> ExtractionEngine:
    if engine is not None:
        return engine
    from domains.scan.adapters import get_scan_extraction_engine

    return get_scan_extraction_engine()


async def run_extraction(
    job_id: str,
    file_bytes: bytes,
    filename: str,
    model: str,
    source: str,
    user_id: int | None = None,
    *,
    ocr_engine: str = "standard",
    preprocess_mode: str = "basic",
    engine: ExtractionEngine | None = None,
) -> None:
    eng = _resolve_extraction_engine(engine)
    if _gemini_cb.is_open():
        err_msg = sanitize_job_error(Exception("circuit"), tripped=True)
        await DBManager.update_job(job_id, "error", result=None, error=err_msg)
        logger.warning("Circuit ouvert, extraction %s refusée", job_id)
        return

    fallback_model = "gemini-2.5-flash"
    can_fallback_to_gemini = model.startswith("gemini-")

    async with _extraction_semaphore:
        try:
            result = await eng.process_file(
                file_bytes=file_bytes,
                filename=filename,
                model_id=model,
                source=source,
                user_id=user_id,
                ocr_engine=ocr_engine,
                preprocess_mode=preprocess_mode,
            )
            await _gemini_cb.record_success()
            await DBManager.update_job(
                job_id,
                "completed" if result["success"] else "error",
                result=result,
                error=result.get("error"),
            )
        except Exception as e:
            if (
                can_fallback_to_gemini
                and model != fallback_model
                and fallback_model in Config.MODELS_DISPONIBLES
            ):
                try:
                    logger.info(
                        "Retry extraction job=%s file=%s avec fallback %s (primary %s failed: %s: %s)",
                        job_id,
                        filename,
                        fallback_model,
                        model,
                        type(e).__name__,
                        e,
                    )
                    result = await eng.process_file(
                        file_bytes=file_bytes,
                        filename=filename,
                        model_id=fallback_model,
                        source=source,
                        user_id=user_id,
                        ocr_engine=ocr_engine,
                        preprocess_mode=preprocess_mode,
                    )
                    await _gemini_cb.record_success()
                    await DBManager.update_job(
                        job_id,
                        "completed" if result["success"] else "error",
                        result=result,
                        error=result.get("error"),
                    )
                    return
                except Exception as fallback_err:
                    logger.warning(
                        "Fallback %s also failed for job=%s file=%s: %s: %s",
                        fallback_model,
                        job_id,
                        filename,
                        type(fallback_err).__name__,
                        fallback_err,
                    )
            tripped = await _gemini_cb.record_failure()
            if tripped:
                logger.warning(
                    "Circuit-breaker Gemini : %d erreurs consecutives. "
                    "Job marque en erreur, les autres jobs continuent.",
                    _gemini_cb.threshold,
                )
            logger.error(
                "Erreur extraction job=%s file=%s model=%s: %s: %s [%s]",
                job_id,
                filename,
                model,
                type(e).__name__,
                e,
                request_id_var.get(""),
                exc_info=True,
            )
            err_msg = sanitize_job_error(e, tripped=tripped)
            await DBManager.update_job(job_id, "error", result=None, error=err_msg)


class JobWatcher:
    """Consomme les notifications pg_notify pour éviter le polling DB."""

    def __init__(self, job_id: str):
        self.job_id = job_id
        self.queue = asyncio.Queue()

    def _on_notify(self, _conn, _pid, channel, payload):
        if channel == "job_status_changed" and payload == self.job_id:
            logger.debug("JobWatcher hit for job=%s", self.job_id)
            self.queue.put_nowait(payload)

    async def wait_for_update(self, timeout: float = 30.0) -> bool:
        """Attend une notification pour ce job_id. Retourne True si reçu."""
        try:
            await asyncio.wait_for(self.queue.get(), timeout=timeout)
            return True
        except asyncio.TimeoutError:
            return False

    @asynccontextmanager
    async def listen(self):
        """Context manager pour gérer l'enregistrement du listener."""
        pool = await DBManager.get_pool()
        async with pool.acquire() as conn:
            await conn.add_listener("job_status_changed", self._on_notify)
            try:
                yield self
            finally:
                await conn.remove_listener("job_status_changed", self._on_notify)
