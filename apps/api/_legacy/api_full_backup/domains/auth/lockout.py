"""Verrouillage anti brute-force sur /login.

En production multi-instance (ex. Cloud Run), définir ``LOGIN_LOCKOUT_REDIS_URL`` pour un
compteur **partagé** entre les workers. Sans Redis, repli **mémoire process** : efficace en
dev mono-processus, mais les compteurs ne sont **pas** synchronisés entre instances.
"""

import hashlib
import json
import os
import time
from typing import Any

from fastapi import HTTPException

_LOGIN_MAX_FAILURES = 5
_LOGIN_LOCKOUT_SECONDS = 15 * 60
_login_failures: dict[str, tuple[int, float]] = {}

_LOGIN_LOCKOUT_REDIS_URL = (os.getenv("LOGIN_LOCKOUT_REDIS_URL") or "").strip()
_redis: Any = None


def _email_key(email: str) -> str:
    h = hashlib.sha256(email.lower().strip().encode()).hexdigest()
    return f"docling:login_lockout:{h}"


def _redis_conn() -> Any:
    global _redis
    if _redis is not None:
        return _redis
    if not _LOGIN_LOCKOUT_REDIS_URL:
        return None
    try:
        import redis
    except ImportError as e:
        raise RuntimeError(
            "LOGIN_LOCKOUT_REDIS_URL est défini mais le paquet 'redis' est absent. "
            "Installez l'extra du projet : uv sync --extra redis"
        ) from e
    _redis = redis.Redis.from_url(_LOGIN_LOCKOUT_REDIS_URL, decode_responses=True)
    return _redis


def check_login_lockout(email: str) -> None:
    r = _redis_conn()
    if r is None:
        _check_login_lockout_memory(email)
        return
    key = _email_key(email)
    raw = r.get(key)
    if raw is None:
        return
    data = json.loads(raw)
    count, first_fail_ts = int(data["count"]), float(data["first"])
    if count >= _LOGIN_MAX_FAILURES:
        elapsed = time.time() - first_fail_ts
        remaining = _LOGIN_LOCKOUT_SECONDS - elapsed
        if remaining > 0:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Compte temporairement verrouillé. Réessayez dans "
                    f"{int(remaining // 60) + 1} min."
                ),
            )
        r.delete(key)


def _check_login_lockout_memory(email: str) -> None:
    entry = _login_failures.get(email)
    if entry is None:
        return
    count, first_fail_ts = entry
    if count >= _LOGIN_MAX_FAILURES:
        elapsed = time.time() - first_fail_ts
        remaining = _LOGIN_LOCKOUT_SECONDS - elapsed
        if remaining > 0:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Compte temporairement verrouillé. Réessayez dans "
                    f"{int(remaining // 60) + 1} min."
                ),
            )
        del _login_failures[email]


def record_login_failure(email: str) -> None:
    r = _redis_conn()
    if r is None:
        _record_login_failure_memory(email)
        return
    key = _email_key(email)
    now = time.time()
    raw = r.get(key)
    if raw is None:
        r.setex(key, _LOGIN_LOCKOUT_SECONDS, json.dumps({"count": 1, "first": now}))
        return
    data = json.loads(raw)
    first = float(data["first"])
    if now - first >= _LOGIN_LOCKOUT_SECONDS:
        r.setex(key, _LOGIN_LOCKOUT_SECONDS, json.dumps({"count": 1, "first": now}))
        return
    data["count"] = int(data["count"]) + 1
    ttl = max(1, int(_LOGIN_LOCKOUT_SECONDS - (now - first)))
    r.setex(key, ttl, json.dumps(data))


def _record_login_failure_memory(email: str) -> None:
    entry = _login_failures.get(email)
    if entry is None:
        _login_failures[email] = (1, time.time())
    else:
        count, ts = entry
        _login_failures[email] = (count + 1, ts)


def clear_login_failures(email: str) -> None:
    r = _redis_conn()
    if r is None:
        _login_failures.pop(email, None)
        return
    r.delete(_email_key(email))


def failure_count(email: str) -> int:
    r = _redis_conn()
    if r is None:
        entry = _login_failures.get(email)
        return entry[0] if entry else 0
    raw = r.get(_email_key(email))
    if raw is None:
        return 0
    return int(json.loads(raw)["count"])
