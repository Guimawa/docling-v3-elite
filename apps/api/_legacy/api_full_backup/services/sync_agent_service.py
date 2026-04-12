# services/sync_agent_service.py
"""
SyncAgentService "Elite 2026" — Surveillance proactive et intelligente du Dossier Magique.
Archivage structuré (A/T/M/J) et entrées/sorties non-bloquantes (Async Threading).
"""

import asyncio
import logging
import shutil
import time
import uuid
import datetime
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from core.config import Config
from core.db_manager import DBManager
from core.orchestrator import Orchestrator
from domains.scan import extraction as scan_ext
from domains.shared import state as guest_state
from services.storage_service import StorageService

logger = logging.getLogger(__name__)

# --- CONFIGURATION 2026 ---
EXTENSIONS_OK = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"}
DEBOUNCE_SECONDS = 2.0

def _get_archive_path(base_folder: Path, success: bool = True) -> Path:
    """Génère un chemin d'archivage PRO : Dossier/(Traitees|Erreurs)/YYYY/Q/MM/DD/"""
    now = datetime.datetime.now()
    quarter = (now.month - 1) // 3 + 1
    root = "Traitees" if success else "Erreurs"
    
    path = base_folder / root / str(now.year) / f"T{quarter}" / f"{now.month:02d}" / f"{now.day:02d}"
    return path

class InvoiceFileHandler(FileSystemEventHandler):
    def __init__(self, model_id: str, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.model_id = model_id
        self.loop = loop
        self._processing = set()

    def on_created(self, event):
        if event.is_directory: return
        path = Path(event.src_path)
        if path.suffix.lower() not in EXTENSIONS_OK: return
        
        # Ignorer les dossiers système d'archivage
        if any(part in ("Traitees", "Erreurs") for part in path.parts):
            return
            
        if str(path) in self._processing: return

        logger.info(f"📂 Sync Agent : nouveau fichier détecté -> {path.name}")
        self._processing.add(str(path))
        asyncio.run_coroutine_threadsafe(self._process_with_resilience(path), self.loop)

    async def _process_with_resilience(self, path: Path):
        """Attente debounce + Traitement + Archivage Structuré."""
        await asyncio.sleep(DEBOUNCE_SECONDS)
        
        try:
            # 1. Vérification existence (Async Threading)
            exists = await asyncio.to_thread(path.exists)
            if not exists: return

            # 2. Lecture (Async Threading)
            file_bytes = await asyncio.to_thread(path.read_bytes)
            
            # 3. Traitement via Orchestrateur
            result = await Orchestrator.process_file(
                file_bytes=file_bytes,
                filename=path.name,
                model_id=self.model_id,
                source="sync_agent"
            )

            # 4. Archivage PRO (Async Threading)
            success = result.get("success", False)
            archive_dir = _get_archive_path(path.parent, success=success)
            await asyncio.to_thread(archive_dir.mkdir, parents=True, exist_ok=True)
            
            dest = archive_dir / path.name
            # Si doublon de nom dans l'archive, on ajoute un suffixe temp
            if await asyncio.to_thread(dest.exists):
                dest = archive_dir / f"{int(time.time())}_{path.name}"
            
            await asyncio.to_thread(shutil.move, str(path), str(dest))
            
            if success:
                logger.info(f"✅ Sync Agent OK : {path.name} archivé dans {archive_dir.relative_to(path.parent)}")
                _update_stats(path.name, "ok", result.get("products_added", 0))
            else:
                logger.error(f"❌ Sync Agent Fail : {path.name} déporté dans {archive_dir.relative_to(path.parent)}")
                _update_stats(path.name, "error", 0)

        except Exception as e:
            logger.error(f"🚨 Sync Agent Error ({path.name}) : {e}")
            _update_stats(path.name, "error", 0)
        finally:
            self._processing.discard(str(path))

# --- STATS & ORCHESTRATION ---

_sync_agent_status = {
    "active": False,
    "folder": Config.SYNC_AGENT_FOLDER,
    "last_file": None,
    "last_status": None,
    "total_processed": 0,
    "total_products": 0,
}

def _update_stats(filename, status, count):
    _sync_agent_status["last_file"] = filename
    _sync_agent_status["last_status"] = status
    if status == "ok":
        _sync_agent_status["total_processed"] += 1
        _sync_agent_status["total_products"] += count

_observer: Observer | None = None

class SyncAgentService:
    @staticmethod
    def start(model_id: str | None = None, loop: asyncio.AbstractEventLoop | None = None) -> None:
        global _observer
        if not Config.SYNC_AGENT_ENABLED: return
        
        # Auto-fallback loop si non fourni (Lifespan pattern)
        if not loop:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.get_event_loop()

        model_id = model_id or Config.DEFAULT_MODEL
        folder = Path(Config.SYNC_AGENT_FOLDER)
        folder.mkdir(parents=True, exist_ok=True)

        handler = InvoiceFileHandler(model_id=model_id, loop=loop)
        _observer = Observer()
        # On évite de s'auto-surveiller récursivement (déjà géré dans le handler mais sécu sup)
        _observer.schedule(handler, str(folder), recursive=False)
        _observer.start()

        _sync_agent_status["active"] = True
        logger.info(f"👁️‍🗨️ Sync Agent PRO actif sur : {folder.resolve()}")

    @staticmethod
    def stop() -> None:
        global _observer
        if _observer:
            _observer.stop()
            _observer.join()
            _observer = None
        _sync_agent_status["active"] = False

    @staticmethod
    def get_status() -> dict:
        return {**_sync_agent_status, "folder_absolute": str(Path(Config.SYNC_AGENT_FOLDER).resolve())}
