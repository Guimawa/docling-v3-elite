"""
Configuration globale des tests — zéro mock.
Fixtures réelles : serveur, DB, utilisateur, client authentifié.

FREE_ACCESS_MODE : la plupart des tests utilisent ``ensure_server_running``
(invité activé → catalogue sans JWT). Les tests d'auth stricte utilisent
``ensure_server_strict_auth`` (deuxième processus uvicorn, FREE_ACCESS_MODE=false)
pour obtenir 401 sur ``GET /api/v1/auth/me`` sans token — sans skip.
"""

import os
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from collections.abc import Generator

import httpx
import pytest
from faker import Faker

from tests.skip_reasons import (
    AUTH_LOGIN_500,
    AUTH_REGISTER_500,
    DB_HEALTH_503,
    DB_PSYCOPG2_MISSING,
    DB_URL_MISSING,
    SRV_EMBEDDED_FAILED,
    SRV_TEST_BASE_URL_UNREACHABLE,
)

# JWT_SECRET requis pour les tests auth (auth_service)
os.environ.setdefault("JWT_SECRET", "test-secret-32-chars-minimum-for-pytest")

# Charger .env.test si présent (racine projet ou apps/api)
_env_test_root = os.path.join(os.path.dirname(__file__), "..", "..", ".env.test")
_env_test_api = os.path.join(os.path.dirname(__file__), "..", ".env.test")
if os.path.exists(_env_test_root):
    from dotenv import load_dotenv

    load_dotenv(_env_test_root)
elif os.path.exists(_env_test_api):
    from dotenv import load_dotenv

    load_dotenv(_env_test_api)

# Fallback : `.env` à la racine du monorepo (même DATABASE_URL qu’en dev local / alembic)
_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_env_mono = os.path.join(_repo_root, ".env")
if not (os.getenv("DATABASE_URL") or "").strip() and os.path.isfile(_env_mono):
    from dotenv import load_dotenv

    load_dotenv(_env_mono)

# Variables d'environnement de test
TEST_BASE_URL = os.getenv("TEST_BASE_URL", "").strip()
TEST_FRONTEND_URL = os.getenv("TEST_FRONTEND_URL", "http://localhost:5173")
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")

fake = Faker("fr_FR")


# ─── Serveur accessible ───────────────────────────────────────────────────────
def _is_api_ready(base_url: str) -> bool:
    try:
        resp = httpx.get(f"{base_url}/health", timeout=2)
        return resp.status_code == 200
    except Exception:
        return False


def _pick_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _read_text_tail(path: str, max_chars: int = 2500) -> str:
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()[-max_chars:]
    except OSError:
        return ""


def _unlink_quiet(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass


def _spawn_embedded_uvicorn(*, free_access: bool) -> Generator[str]:
    """Démarre uvicorn local ; ``free_access`` contrôle FREE_ACCESS_MODE."""
    port = _pick_free_port()
    base_url = f"http://127.0.0.1:{port}"
    api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env = os.environ.copy()
    # Forcer un contexte « dev + Gemini » : le .env parent n’est pas écrasé par
    # ``_ensure_env_value`` si la clé existe déjà — ex. ``ENVIRONMENT=production``,
    # ``DEFAULT_AI_MODEL=mistral-*`` sans clé, ``GOOGLE_OAUTH_ENABLED=true`` sans
    # secrets → ``validate_startup()`` fait ``sys.exit(1)`` et uvicorn sort en code 3.
    env["ENVIRONMENT"] = "development"
    env["FREE_ACCESS_MODE"] = "true" if free_access else "false"
    env["DISABLE_RATE_LIMIT"] = "true"
    env["GOOGLE_OAUTH_ENABLED"] = "false"
    env["DEFAULT_AI_MODEL"] = "gemini-3.1-pro-preview"
    env["JWT_SECRET"] = "test-secret-32-chars-minimum-for-pytest"
    env["JWT_REFRESH_SECRET"] = "test-refresh-secret-32-chars-minimum"
    env["GEMINI_API_KEY"] = "test-gemini-key"

    # L’API lit ``DATABASE_URL`` ; aligner sur ``TEST_DATABASE_URL`` si seul celui-ci est défini.
    if not (env.get("DATABASE_URL") or "").strip():
        td = (env.get("TEST_DATABASE_URL") or "").strip()
        if td:
            env["DATABASE_URL"] = td
    if not (env.get("DATABASE_URL") or "").strip():
        pytest.skip(DB_URL_MISSING, allow_module_level=True)

    # Même interpréteur que la session pytest (souvent ``uv run pytest`` depuis apps/api) :
    # évite ``uv run`` avec un ``VIRTUAL_ENV`` racine monorepo / conda qui ne matche pas
    # ``apps/api/.venv`` (warning uv + sortie immédiate du sous-processus sur Windows).
    stderr_path = os.path.join(
        tempfile.gettempdir(),
        f"docling-pytest-uvicorn-{port}-{os.getpid()}.log",
    )
    ferr = open(stderr_path, "w", encoding="utf-8", errors="replace")
    try:
        proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ],
            cwd=api_dir,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=ferr,
        )
    finally:
        ferr.close()

    def _fail_embedded(msg: str) -> None:
        tail = _read_text_tail(stderr_path)
        _unlink_quiet(stderr_path)
        extra = f"\n--- stderr uvicorn ---\n{tail}" if tail.strip() else ""
        pytest.skip(msg + extra, allow_module_level=True)

    # Attente /health : 200 → OK ; 503 → skip tout de suite (DB down, inutile de boucler 25× le timeout httpx).
    # Sinon (serveur pas encore prêt) : court délai entre essais ; ~35 s plafond.
    deadline = time.monotonic() + 45.0
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            _fail_embedded(
                f"{SRV_EMBEDDED_FAILED} (uvicorn terminé, code={proc.returncode}, {base_url})"
            )
        try:
            resp = httpx.get(f"{base_url}/health", timeout=1.5)
            if resp.status_code == 200:
                try:
                    yield base_url
                finally:
                    proc.terminate()
                    try:
                        proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                    _unlink_quiet(stderr_path)
                return
            if resp.status_code == 503:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                _fail_embedded(f"{DB_HEALTH_503} ({base_url})")
        except (httpx.ConnectError, httpx.ReadTimeout, httpx.TimeoutException):
            pass
        except httpx.HTTPError:
            pass
        time.sleep(0.45)

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    _fail_embedded(f"{SRV_EMBEDDED_FAILED} ({base_url})")


@pytest.fixture(scope="session")
def ensure_server_running() -> Generator[str]:
    """
    Serveur avec invité FREE_ACCESS (catalogue / routes sans JWT en dev).
    Si TEST_BASE_URL est défini et joignable, il est utilisé à la place.
    """
    if TEST_BASE_URL:
        if _is_api_ready(TEST_BASE_URL):
            yield TEST_BASE_URL
            return
        pytest.skip(
            f"{SRV_TEST_BASE_URL_UNREACHABLE} ({TEST_BASE_URL})",
            allow_module_level=True,
        )
        return

    yield from _spawn_embedded_uvicorn(free_access=True)


@pytest.fixture(scope="session")
def ensure_server_strict_auth() -> Generator[str]:
    """
    Serveur dédié auth stricte (FREE_ACCESS_MODE=false).
    Toujours un processus local — indépendant de TEST_BASE_URL.
    """
    yield from _spawn_embedded_uvicorn(free_access=False)


# ─── Connexion DB réelle ──────────────────────────────────────────────────────
@pytest.fixture(scope="function")
def real_db_connection() -> Generator:
    """
    Connexion réelle à la base de données de test.
    Utilise psycopg2 (sync) pour compatibilité avec les fixtures.
    """
    if not TEST_DATABASE_URL:
        pytest.skip(DB_URL_MISSING)
    try:
        import psycopg2
    except ModuleNotFoundError:
        pytest.skip(DB_PSYCOPG2_MISSING)
    conn = None
    try:
        conn = psycopg2.connect(TEST_DATABASE_URL)
        conn.autocommit = False
        yield conn
        conn.rollback()
    finally:
        if conn:
            conn.close()


# ─── Utilisateur unique (Faker) ───────────────────────────────────────────────
@pytest.fixture(scope="function")
def unique_user() -> dict:
    """Génère un utilisateur unique et réaliste pour chaque test."""
    import random
    import secrets

    pwd = f"Test@{secrets.token_hex(8)}!{random.randint(100, 999)}"
    return {
        "email": f"test_{uuid.uuid4().hex[:8]}@{fake.domain_name()}",
        "password": pwd,
        "name": fake.first_name(),
    }


# ─── Client HTTP authentifié ──────────────────────────────────────────────────
@pytest.fixture(scope="function")
def authenticated_client(
    ensure_server_running: str,
    unique_user: dict,
) -> Generator:
    """
    Client HTTP réel avec session authentifiée.
    Inscription + login réels via Form data (pas JSON).
    """
    base_url = ensure_server_running
    client = httpx.Client(base_url=base_url, timeout=30)

    # Inscription réelle (Form data)
    reg_resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    if reg_resp.status_code == 500:
        pytest.skip(AUTH_REGISTER_500)
    # Peut être 200 (nouveau) ou 409 si email déjà utilisé (rare avec uuid)
    if reg_resp.status_code not in (200, 409):
        pytest.fail(f"Register échoué : {reg_resp.status_code} {reg_resp.text}")

    # Connexion réelle (Form data)
    login_resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
        },
    )
    if login_resp.status_code == 500:
        pytest.skip(AUTH_LOGIN_500)
    assert login_resp.status_code == 200, f"Login échoué : {login_resp.text}"
    payload = login_resp.json()
    token = payload.get("token")
    # API actuelle basée cookies httpOnly : pas de token en JSON.
    # On génère un Bearer de test pour éviter les checks CSRF cookie-only
    # sur les endpoints mutating durant les tests.
    if not token:
        from services.auth_service import create_token

        token = create_token(
            user_id=int(payload["user_id"]),
            email=payload["email"],
            role=payload.get("role", "user"),
        )
    client.headers["Authorization"] = f"Bearer {token}"

    yield client, unique_user
    client.close()


# ─── Client HTTP non authentifié ──────────────────────────────────────────────
@pytest.fixture(scope="function")
def http_client(ensure_server_running: str) -> Generator:
    """Client HTTP simple sans auth."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    yield client
    client.close()


@pytest.fixture(scope="function")
def http_client_strict(ensure_server_strict_auth: str) -> Generator:
    """Client HTTP sans auth — base ``ensure_server_strict_auth`` (401 sans JWT sur /me)."""
    client = httpx.Client(base_url=ensure_server_strict_auth, timeout=30)
    yield client
    client.close()


# ─── Produit Faker pour batch ─────────────────────────────────────────────────
@pytest.fixture(scope="function")
def sample_products() -> list[dict]:
    """Liste de produits réalistes générés par Faker."""
    products = []
    for _ in range(3):
        prix = round(fake.random.uniform(5.0, 150.0), 2)
        remise = round(fake.random.uniform(0, 15), 1)
        prix_remise = round(prix * (1 - remise / 100), 2)
        products.append(
            {
                "fournisseur": fake.company()[:50],
                "designation_raw": fake.catch_phrase()[:100],
                "designation_fr": fake.catch_phrase()[:100],
                "famille": "Maçonnerie",
                "unite": "unité",
                "prix_brut_ht": prix,
                "remise_pct": remise,
                "prix_remise_ht": prix_remise,
                "prix_ttc_iva21": round(prix_remise * 1.21, 2),
                "confidence": "high",
            }
        )
    return products
