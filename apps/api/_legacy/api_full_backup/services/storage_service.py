"""
StorageService - Docling Agent v3
Upload/download S3-compatible (Storj, R2, MinIO) ou GCS (google-cloud-storage).
Utilise boto3 avec endpoint configurable pour le mode s3.
"""

import hashlib
import logging
from datetime import UTC, datetime

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from core.config import Config

logger = logging.getLogger(__name__)

_PENDING_PREFIX = "pending"


def _safe_filename(name: str) -> str:
    base = (name or "file").split("/")[-1].split("\\")[-1]
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in base) or "file"


class StorageService:
    _client = None
    _gcs_client = None

    @classmethod
    def _backend(cls) -> str:
        return (Config.STORAGE_BACKEND or "s3").strip().lower()

    @classmethod
    async def _get_client_for_user(cls, user_id: int | None = None):
        """Récupère le client S3 (Souverain/Perso ou Global/Managed)."""
        config_to_use = {
            "endpoint": Config.STORJ_ENDPOINT,
            "access": Config.STORJ_ACCESS_KEY,
            "secret": Config.STORJ_SECRET_KEY,
            "bucket": Config.STORJ_BUCKET,
        }

        if user_id:
            pool = await DBManager.get_pool()
            async with pool.acquire() as conn:
                user = await conn.fetchrow(
                    "SELECT storage_type, storage_config FROM users WHERE id = $1", user_id
                )
                if user and user["storage_type"] == "personal":
                    import json
                    u_cfg = json.loads(user["storage_config"] or "{}")
                    # On n'écrase que si l'utilisateur a fourni des clés valides
                    if u_cfg.get("access_key") and u_cfg.get("secret_key"):
                        config_to_use.update({
                            "endpoint": u_cfg.get("endpoint", Config.STORJ_ENDPOINT),
                            "access": u_cfg["access_key"],
                            "secret": u_cfg["secret_key"],
                            "bucket": u_cfg.get("bucket", Config.STORJ_BUCKET),
                        })
                        logger.debug("Sovereign Storage: usage du cloud perso (user_id=%s)", user_id)

        if not config_to_use["access"] or not config_to_use["secret"]:
            return None, None

        client = boto3.client(
            "s3",
            endpoint_url=config_to_use["endpoint"],
            aws_access_key_id=config_to_use["access"],
            aws_secret_access_key=config_to_use["secret"],
        )
        return client, config_to_use["bucket"]

    @classmethod
    def _get_gcs_bucket(cls):
        bname = (Config.GCS_BUCKET or "").strip()
        if not bname:
            return None
        try:
            from google.cloud import storage as gcs_storage  # type: ignore[import-untyped]
        except ImportError as e:
            raise RuntimeError(
                "google-cloud-storage requis pour STORAGE_BACKEND=gcs (uv add google-cloud-storage)"
            ) from e
        if cls._gcs_client is None:
            cls._gcs_client = gcs_storage.Client()
        return cls._gcs_client.bucket(bname)

    @classmethod
    def is_configured(cls) -> bool:
        if cls._backend() == "gcs":
            return bool((Config.GCS_BUCKET or "").strip())
        return bool(Config.STORJ_ACCESS_KEY and Config.STORJ_SECRET_KEY)

    @classmethod
    async def upload_file(
        cls,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/pdf",
        *,
        user_id: int | None = None,
    ) -> str | None:
        """
        Upload un fichier vers le bucket (S3 perso ou Managed).
        Retourne l'URL publique ou None.
        """
        if cls._backend() == "gcs" and not user_id: # GCS n'est dispo qu'en mode Managed pour l'instant
            return cls._gcs_upload_catalog(file_bytes, filename, content_type)

        client, bucket_name = await cls._get_client_for_user(user_id)
        if client is None:
            logger.debug("Stockage cloud non configure pour user_id=%s, upload ignore", user_id)
            return None

        file_hash = hashlib.md5(file_bytes).hexdigest()[:8]
        now = datetime.now(UTC)
        safe_name = _safe_filename(filename)
        key = f"{now.strftime('%Y/%m')}/{file_hash}_{safe_name}"

        try:
            await asyncio.to_thread(
                client.put_object,
                Bucket=bucket_name,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            # Construction de l'URL (si S3 standard ou Storj)
            url = f"https://{bucket_name}.s3.amazonaws.com/{key}" # Fallback URL
            if "storj" in str(client.meta.endpoint_url):
                url = f"{client.meta.endpoint_url}/{bucket_name}/{key}"
            
            logger.info("Fichier uploade -> %s (user_id=%s)", key.split("/")[-1], user_id)
            return url

        except (ClientError, NoCredentialsError) as e:
            logger.error("Erreur upload S3 (user_id=%s) : %s", user_id, type(e).__name__)
            return None

    @classmethod
    def _gcs_upload_catalog(cls, file_bytes: bytes, filename: str, content_type: str) -> str | None:
        bucket = cls._get_gcs_bucket()
        if bucket is None:
            logger.debug("GCS non configure, upload ignore")
            return None
        file_hash = hashlib.md5(file_bytes).hexdigest()[:8]
        now = datetime.now(UTC)
        safe_name = _safe_filename(filename)
        key = f"{now.strftime('%Y/%m')}/{file_hash}_{safe_name}"
        try:
            blob = bucket.blob(key)
            blob.upload_from_string(file_bytes, content_type=content_type)
            url = f"https://storage.googleapis.com/{bucket.name}/{key}"
            logger.info("Fichier uploade GCS -> .../%s", key.split("/")[-1])
            return url
        except Exception as e:
            logger.error("Erreur upload GCS : %s", type(e).__name__)
            return None

    @classmethod
    async def upload_pending_job_file(
        cls,
        job_id: str,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/pdf",
        *,
        user_id: int | None = None,
    ) -> str | None:
        """Stockage temporaire pour la file d'attente scan (Managed ou Perso)."""
        safe = _safe_filename(filename)
        user_seg = "anon" if user_id is None else str(int(user_id))
        key = f"{_PENDING_PREFIX}/{user_seg}/{job_id}/{safe}"
        
        if cls._backend() == "gcs" and not user_id:
            bucket = cls._get_gcs_bucket()
            if bucket is None: return None
            try:
                blob = bucket.blob(key)
                await asyncio.to_thread(blob.upload_from_string, file_bytes, content_type=content_type)
                return key
            except Exception as e:
                logger.error("Erreur upload pending GCS : %s", type(e).__name__)
                return None

        client, bucket_name = await cls._get_client_for_user(user_id)
        if client is None:
            return None
        try:
            await asyncio.to_thread(
                client.put_object,
                Bucket=bucket_name,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            return key
        except (ClientError, NoCredentialsError) as e:
            logger.error("Erreur upload pending S3 (user_id=%s) : %s", user_id, type(e).__name__)
            return None

    @classmethod
    async def download_bytes_by_key(cls, key: str, user_id: int | None = None) -> bytes | None:
        if not key:
            return None
        if cls._backend() == "gcs" and not user_id:
            bucket = cls._get_gcs_bucket()
            if bucket is None: return None
            try:
                blob = bucket.blob(key)
                return await asyncio.to_thread(blob.download_as_bytes)
            except Exception as e:
                logger.error("Erreur download GCS key=%s : %s", key, type(e).__name__)
                return None

        client, bucket_name = await cls._get_client_for_user(user_id)
        if client is None:
            return None
        try:
            resp = await asyncio.to_thread(client.get_object, Bucket=bucket_name, Key=key)
            return resp["Body"].read()
        except (ClientError, NoCredentialsError) as e:
            logger.error("Erreur download S3 (user_id=%s) : %s", user_id, type(e).__name__)
            return None

    @classmethod
    async def delete_object_by_key(cls, key: str, user_id: int | None = None) -> bool:
        if not key:
            return False
        if cls._backend() == "gcs" and not user_id:
            bucket = cls._get_gcs_bucket()
            if bucket is None: return False
            try:
                await asyncio.to_thread(bucket.blob(key).delete)
                return True
            except Exception as e:
                logger.warning("Suppression GCS key=%s : %s", key, type(e).__name__)
                return False

        client, bucket_name = await cls._get_client_for_user(user_id)
        if client is None:
            return False
        try:
            await asyncio.to_thread(client.delete_object, Bucket=bucket_name, Key=key)
            return True
        except (ClientError, NoCredentialsError) as e:
            logger.warning("Suppression S3 (user_id=%s) key=%s : %s", user_id, key, type(e).__name__)
            return False


    @classmethod
    async def get_presigned_url(cls, key: str, expires_in: int = 3600, user_id: int | None = None) -> str | None:
        """Genere une URL pre-signee (Managed ou Perso)."""
        client, bucket_name = await cls._get_client_for_user(user_id)
        if client is None:
            return None
        expires_in = max(60, min(expires_in, 3600))
        try:
            return await asyncio.to_thread(
                client.generate_presigned_url,
                "get_object",
                Params={"Bucket": bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            logger.error("Erreur presigned URL (user_id=%s) : %s", user_id, type(e).__name__)
            return None
