import hashlib
import json
import logging
import mimetypes
import os
import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from core.config import Config
from core.db_manager import DBManager
from domains.scan import extraction as ext
from domains.scan.adapters import (
    get_scan_extraction_engine,
    get_scan_presigned_pdf_url_resolver,
)
from domains.scan.ports import ExtractionEngine, PresignedPdfUrlResolver
from domains.shared.dependencies import require_active_subscription, require_user_id
from domains.shared.rate_limit import limiter
from domains.shared.request_context import request_id_var
from services.storage_service import StorageService
from utils.serializers import serialize_row

logger = logging.getLogger(__name__)

class InvoiceProcessRequest(BaseModel):
    model: str = Field(default="gemini-3.1-pro-preview")
    source: str = Field(default="pc", pattern="^(pc|mobile|watchdog)$")
    ocr_engine: str = Field(default="standard")
    preprocess_mode: str = Field(default="basic")

def _scan_execution_mode() -> str:
    return (Config.SCAN_JOB_EXECUTION or "inline").strip().lower()

router = APIRouter(prefix="/api/v1", tags=["scan"])

@router.post("/invoices/process")
@limiter.limit("20/minute")
async def process_invoice(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    payload: InvoiceProcessRequest = Depends(),
    user_id: int = Depends(require_active_subscription),
    extraction_engine: ExtractionEngine = Depends(get_scan_extraction_engine),
):
    model = payload.model
    source = payload.source

    if model not in Config.MODELS_DISPONIBLES:
        raise HTTPException(
            status_code=400,
            detail=f"Modèle invalide. Acceptés : {', '.join(sorted(Config.MODELS_DISPONIBLES))}",
        )
    
    filename = file.filename or "facture"
    ext_l = os.path.splitext(filename)[1].lower()
    if ext_l not in ext.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Extension non autorisée. Acceptées : {', '.join(sorted(ext.ALLOWED_EXTENSIONS))}",
        )

    # Lecture sécurisée du contenu
    chunks: list[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(ext.CHUNK_SIZE)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > ext.UPLOAD_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 50 Mo)")
        chunks.append(chunk)

    file_bytes = b"".join(chunks)
    if not file_bytes:
        raise HTTPException(status_code=415, detail="Fichier vide")

    # Déduplication
    await ext.dedup_cleanup()
    dedup_hash = ext.dedup_key(filename, len(file_bytes), user_id)
    existing = await ext.dedup_get(dedup_hash)
    if existing:
        existing_job_id, _ = existing
        row = await DBManager.get_job(existing_job_id, user_id=user_id)
        return JSONResponse(
            status_code=200,
            content={
                "job_id": existing_job_id,
                "status": row["status"] if row else "processing",
                "deduplicated": True,
            },
        )

    job_id = str(uuid.uuid4())
    await ext.dedup_set(dedup_hash, job_id, user_id=user_id)

    # Exécution
    if _scan_execution_mode() == "queue":
        storage_key = await StorageService.upload_pending_job_file(
            job_id, file_bytes, filename, 
            content_type=file.content_type, user_id=user_id,
        )
        await DBManager.create_job(
            job_id, "pending", user_id=user_id,
            input_storage_key=storage_key, input_filename=filename,
            model_id=model, job_source=source,
            ocr_engine=payload.ocr_engine, preprocess_mode=payload.preprocess_mode
        )
        return JSONResponse(status_code=202, content={"job_id": job_id, "status": "pending"})

    await DBManager.create_job(
        job_id, "processing", user_id=user_id, 
        ocr_engine=payload.ocr_engine, preprocess_mode=payload.preprocess_mode
    )
    background_tasks.add_task(
        ext.run_extraction, job_id, file_bytes, filename,
        model, source, user_id, 
        ocr_engine=payload.ocr_engine,
        preprocess_mode=payload.preprocess_mode,
        engine=extraction_engine
    )
    return JSONResponse(status_code=202, content={"job_id": job_id, "status": "processing"})

@router.get("/invoices/status/{job_id}")
async def get_job_status(job_id: str, user_id: int = Depends(require_user_id)):
    job = await DBManager.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return job

@router.get("/invoices/status/{job_id}/stream")
async def stream_job_status(job_id: str, user_id: int = Depends(require_user_id)):
    async def event_gen():
        watcher = ext.JobWatcher(job_id)
        last_payload = None
        async with watcher.listen():
            while True:
                job = await DBManager.get_job(job_id, user_id=user_id)
                if not job: break
                payload = {"status": job["status"], "result": job.get("result"), "error": job.get("error")}
                dumped = json.dumps(payload, default=str)
                if dumped != last_payload:
                    yield f"data: {dumped}\n\n"
                    last_payload = dumped
                if job["status"] in ("completed", "error"): break
                await watcher.wait_for_update(timeout=30.0)
    return StreamingResponse(event_gen(), media_type="text/event-stream")

@router.get("/history")
async def get_history(limit: int = 50, user_id: int = Depends(require_user_id)):
    rows = await DBManager.get_factures_history(limit=min(limit, 200), user_id=user_id)
    return {"history": [serialize_row(r) for r in rows], "total": len(rows)}

@router.get("/history/{facture_id}/pdf")
async def get_facture_pdf_url(
    facture_id: int,
    user_id: int = Depends(require_user_id),
    pdf_url_resolver: PresignedPdfUrlResolver = Depends(get_scan_presigned_pdf_url_resolver),
):
    try:
        # Restriction Freemium : On vérifie l'abonnement même si FREE_ACCESS_MODE=true
        pool = await DBManager.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT subscription_status::text as status FROM users WHERE id = $1::bigint",
                user_id
            )
        
        status = (row["status"] or "").strip().lower() if row else ""
        if status not in ("active", "trialing"):
            raise HTTPException(
                status_code=402,
                detail="Le téléchargement PDF est réservé aux abonnés. (Freemium Lock)"
            )

        pdf_url = await DBManager.get_facture_pdf_url(facture_id, user_id=user_id)
        if not pdf_url:
            raise HTTPException(status_code=404, detail="PDF introuvable")
        
        presigned = await pdf_url_resolver.get_presigned_url_from_pdf_url(pdf_url, user_id=user_id)
        return {"url": presigned, "expires_in": 3600}
    except HTTPException: raise
    except Exception as err:
        logger.error("Erreur get_facture_pdf_url: %s", err)
        raise HTTPException(status_code=500, detail="Erreur interne")
