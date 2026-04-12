import logging
import os

import sentry_sdk

from core.config import Config
from domains.shared.request_context import request_id_var

_ENV = os.getenv("ENVIRONMENT", "development")
_SENTRY_DSN = os.getenv("SENTRY_DSN", "")


def _before_send(event: dict, hint: dict) -> dict | None:
    req = event.get("request", {})
    headers = req.get("headers", {})
    for sensitive in ("Authorization", "Cookie", "X-Auth-Token", "Set-Cookie"):
        headers.pop(sensitive, None)
        headers.pop(sensitive.lower(), None)
    user = event.get("user", {})
    user.pop("ip_address", None)
    user.pop("email", None)
    req_id = request_id_var.get("")
    if req_id:
        event.setdefault("tags", {})["request_id"] = req_id
    return event


def init_sentry() -> None:
    if _SENTRY_DSN:
        sentry_sdk.init(
            dsn=_SENTRY_DSN,
            traces_sample_rate=0.1,
            environment=Config.ENVIRONMENT,
            release=f"docling-agent@{Config.APP_VERSION}",
            send_default_pii=False,
            max_request_body_size="never",
            before_send=_before_send,
        )
    elif _ENV == "production":
        logging.getLogger(__name__).warning(
            "SENTRY_DSN non configuré en production — monitoring des erreurs désactivé"
        )
