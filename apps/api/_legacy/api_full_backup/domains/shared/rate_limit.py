import os

from fastapi import Request
from slowapi import Limiter


from core.config import Config


def get_real_ip(request: Request) -> str:
    """IP client réelle (X-Forwarded-For en prod, sinon client direct)."""
    if (Config.ENVIRONMENT or "").lower() == "production":
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


_DISABLE_RATE_LIMIT = Config.DISABLE_RATE_LIMIT
# Stockage partagé multi-workers (ex. redis://host:6379/0)
_RATE_LIMIT_STORAGE_URI = Config.RATE_LIMIT_STORAGE_URI

limiter = Limiter(
    key_func=get_real_ip,
    enabled=not _DISABLE_RATE_LIMIT,
    storage_uri=_RATE_LIMIT_STORAGE_URI,
)
