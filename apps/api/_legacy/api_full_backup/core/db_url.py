"""Normalisation des DSN PostgreSQL pour asyncpg / SQLAlchemy async.

Neon (et libpq) ajoutent souvent ``?sslmode=require&channel_binding=require``.
Si l'on retire seulement ``sslmode=...`` par regex, il reste
``.../neondb&channel_binding=require`` sans ``?`` : asyncpg prend alors un nom
de base invalide (ex. : ``InvalidCatalogNameError``).
"""

from __future__ import annotations

from urllib.parse import urlparse, urlunparse


def strip_postgresql_dsn_query(dsn: str) -> str:
    """Retourne le DSN sans query ni fragment (scheme, netloc, path uniquement)."""
    s = (dsn or "").strip()
    if not s:
        return s
    parsed = urlparse(s)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def neon_or_ssl_required(dsn: str) -> bool:
    """True si la connexion doit utiliser TLS (Neon ou sslmode explicite dans l'URL brute)."""
    return ".neon.tech" in dsn or "sslmode=require" in dsn or "sslmode=verify" in dsn
