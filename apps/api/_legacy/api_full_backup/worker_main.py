"""
Worker CLI — traite les jobs scan en statut pending (file PostgreSQL + stockage objet).

Usage (depuis apps/api) : uv run python worker_main.py
Variables : SCAN_JOB_EXECUTION=queue, stockage S3 ou GCS configuré, DATABASE_URL.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from core.config import Config
from core.db_manager import DBManager
from domains.scan import extraction as ext
from domains.scan.adapters import get_scan_extraction_engine
from services.storage_service import StorageService

logger = logging.getLogger(__name__)


def _spawn_cloud_run_health_server() -> None:
    """Cloud Run attend un processus qui écoute sur PORT ; le worker n'est pas HTTP sinon."""
    port_raw = os.environ.get("PORT", "").strip()
    if not port_raw:
        return
    try:
        port = int(port_raw)
    except ValueError:
        return

    class _HealthHandler(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *args: object) -> None:
            logger.debug(fmt, *args)

        def do_GET(self) -> None:  # noqa: N802
            if self.path in ("/health", "/"):
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"ok")
            else:
                self.send_response(404)
                self.end_headers()

    def _run() -> None:
        server = HTTPServer(("0.0.0.0", port), _HealthHandler)
        server.serve_forever()

    threading.Thread(target=_run, name="worker-health", daemon=True).start()
    logger.info("Health HTTP écoute sur 0.0.0.0:%s (Cloud Run)", port)


async def _process_claimed_job(job: dict) -> None:
    job_id = job["job_id"]
    key = job.get("input_storage_key")
    if not key:
        await DBManager.update_job(
            job_id,
            "error",
            result=None,
            error="Clé stockage manquante pour ce job.",
        )
        return

    data = await asyncio.to_thread(StorageService.download_bytes_by_key, key)
    if not data:
        await DBManager.update_job(
            job_id,
            "error",
            result=None,
            error="Impossible de télécharger le fichier depuis le stockage.",
        )
        return

    try:
        await ext.run_extraction(
            job_id,
            data,
            job["input_filename"],
            job["model_id"],
            job["job_source"],
            job["user_id"],
            ocr_engine=job.get("ocr_engine", "standard"),
            preprocess_mode=job.get("preprocess_mode", "basic"),
            engine=get_scan_extraction_engine(),
        )
    finally:
        await asyncio.to_thread(StorageService.delete_object_by_key, key)


async def _worker_loop() -> None:
    poll_s = max(0.1, Config.WORKER_POLL_INTERVAL_MS / 1000.0)
    conc = max(1, Config.WORKER_CONCURRENCY)
    sem = asyncio.Semaphore(conc)
    pending: set[asyncio.Task[None]] = set()

    async def _run_one(j: dict) -> None:
        async with sem:
            await _process_claimed_job(j)

    while True:
        while len(pending) < conc:
            job = await DBManager.claim_next_job()
            if not job:
                break
            t = asyncio.create_task(_run_one(job))
            pending.add(t)
            t.add_done_callback(pending.discard)

        if not pending:
            await asyncio.sleep(poll_s)
            continue

        await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)


async def amain() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    Config.validate()
    if (Config.SCAN_JOB_EXECUTION or "inline").strip().lower() != "queue":
        logger.error("WORKER : définir SCAN_JOB_EXECUTION=queue pour lancer le worker.")
        sys.exit(2)
    if not StorageService.is_configured():
        logger.error("WORKER : stockage objet requis (S3/Storj ou GCS selon STORAGE_BACKEND).")
        sys.exit(2)
    await DBManager.get_pool()
    _spawn_cloud_run_health_server()
    logger.info(
        "Worker scan démarré (concurrence=%s, poll=%sms)",
        Config.WORKER_CONCURRENCY,
        Config.WORKER_POLL_INTERVAL_MS,
    )
    await _worker_loop()


def main() -> None:
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        logger.info("Worker arrêté (KeyboardInterrupt)")


if __name__ == "__main__":
    main()
