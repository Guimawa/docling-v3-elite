"""Shared serialization utilities for asyncpg Record → JSON-safe structures."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any


def _serialize_val(v: Any) -> Any:
    """
    Convertit les types asyncpg / PostgreSQL en valeurs compatibles JSON.

    - ``Decimal`` → ``str`` (précision financière ; le front peut utiliser Decimal.js).
    - ``date`` / ``datetime`` → ISO string.
    - ``UUID`` → string.
    - ``dict`` / ``list`` / ``tuple`` → parcours récursif.
    """
    if v is None:
        return None
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, bool):
        return v
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return str(v)
    if isinstance(v, dict):
        return {k: _serialize_val(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_serialize_val(x) for x in v]
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return v
    if isinstance(v, str):
        return v
    if hasattr(v, "isoformat") and callable(getattr(v, "isoformat", None)):
        return v.isoformat()
    if hasattr(v, "__float__") and not isinstance(v, (int, float, bool, Decimal)):
        return float(v)
    return v


def serialize_row(row: dict[str, Any] | None) -> dict[str, Any]:
    """Copie du dict avec valeurs JSON-safe (sans muter l'entrée). Gère JSON imbriqués."""
    return {k: _serialize_val(v) for k, v in (row or {}).items()}
