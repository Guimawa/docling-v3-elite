"""
Messages de skip pytest — source unique pour éviter la dérive des libellés.

Catégories (voir docs/TESTS-BACKEND-SKIPS.md) :
  SRV  — serveur embarqué / TEST_BASE_URL
  DB   — DATABASE_URL / TEST_DATABASE_URL
  MIG  — migrations a012 / a015
  AUTH — register/login 500 (environnement)
  ISO  — tests isolation (sécurité)
  STO  — Storj / stockage
  EXT  — Gemini / services externes
  E2E  — Playwright / serveur absent / RUN_E2E
"""

# ─── Serveur API ─────────────────────────────────────────────────────────────
SRV_EMBEDDED_FAILED = "Le serveur n'est pas accessible. Échec du démarrage auto de l'API de test."
SRV_TEST_BASE_URL_UNREACHABLE = "TEST_BASE_URL est défini mais inaccessible."
SRV_E2E_NOT_AVAILABLE = "Serveur API non joignable (E2E)."
SRV_E2E_LEGACY = "Server not available"  # libellé historique E2E (garder pour greps CI)
SRV_FRONTEND_E2E_UNAVAILABLE = "Frontend E2E non joignable (TEST_FRONTEND_URL)."


def frontend_e2e_http_error(url: str, status: int) -> str:
    return f"Frontend indisponible sur {url} (HTTP {status})."


def frontend_e2e_unreachable(url: str) -> str:
    return f"Frontend indisponible sur {url} (non joignable)."


SRV_PLAYWRIGHT_UNAVAILABLE = "Playwright/Chromium non disponible."


def playwright_unavailable(exc: Exception) -> str:
    return f"Playwright/Chromium non disponible : {exc}"


# ─── Base de données ─────────────────────────────────────────────────────────
DB_URL_MISSING = "TEST_DATABASE_URL ou DATABASE_URL non défini."
DB_URL_MISSING_SHORT = "DATABASE_URL non définie."
DB_HEALTH_503 = "GET /health renvoie 503 — base injoignable (vérifier DATABASE_URL, réseau, Neon)."
DB_PSYCOPG2_MISSING = "psycopg2-binary absent — installer les deps dev API (ex. uv sync --extra dev) pour tests DB réels."

# ─── Migrations ──────────────────────────────────────────────────────────────
MIG_A012_OAUTH = "Migration a012 (oauth_google_states) non appliquée sur cette base."
MIG_A012_OAUTH_SHORT = "Migration a012 non appliquée sur cette base."
MIG_A015_JOBS = "Schéma jobs (a015) non appliqué sur cette base."

# ─── Auth HTTP (tests API) ───────────────────────────────────────────────────
AUTH_REGISTER_500 = "Endpoint /api/v1/auth/register renvoie 500 dans cet environnement de test."
AUTH_LOGIN_500 = "Endpoint /api/v1/auth/login renvoie 500 dans cet environnement de test."
AUTH_REGISTER_500_SHORT = "/api/v1/auth/register renvoie 500 dans cet environnement de test."
AUTH_LOGIN_NO_TOKEN = "Token indisponible dans la réponse login pour ce test."


# ─── Isolation (sécurité) ────────────────────────────────────────────────────
def iso_register_unavailable(status: int) -> str:
    return f"Register indisponible pour test isolation ({status})."


def iso_login_unavailable(status: int) -> str:
    return f"Login indisponible pour test isolation ({status})."


ISO_TOKEN1_MISSING = "Token user1 indisponible pour test isolation."
ISO_TOKEN2_MISSING = "Token user2 indisponible pour test isolation."

# ─── Stockage ─────────────────────────────────────────────────────────────────
STO_ENV_INCOMPLETE = (
    "Storj non configuré — définir STORJ_ACCESS_KEY, STORJ_SECRET_KEY, STORJ_BUCKET"
)


def sto_not_configured(detail: str) -> str:
    return f"Storj non configuré pour tests intégration ({detail})."


STO_UPLOAD_UNAVAILABLE = "Upload Storj indisponible dans cet environnement."

# ─── Gemini / externe ───────────────────────────────────────────────────────
EXT_GEMINI_KEY_MISSING = "GEMINI_API_KEY absente (renseigner le .env racine du repo)."
EXT_GEMINI_KEY_SKIP_COST = "GEMINI_API_KEY non défini — skip pour éviter coûts"
EXT_GOLDEN_GEMINI_OFF = "Définir RUN_GOLDEN_GEMINI=1 pour un appel API Gemini réel (coût tokens)."
EXT_GEMINI_PARTIAL_LINES = "Modèle n'a extrait qu'une ligne — à analyser, pas un échec dur."


def ext_gemini_partial_lines_count(n: int) -> str:
    return f"Modèle n'a extrait qu'une ligne ({n}) — à analyser, pas un échec dur."


def ext_gemini_skip(reason: str) -> str:
    return reason


# ─── E2E désactivés ───────────────────────────────────────────────────────────
E2E_DISABLED = "E2E désactivés (définir RUN_E2E=true)."

# ─── Auth avancé E2E ─────────────────────────────────────────────────────────
AUTH_E2E_REGISTER_429 = "/api/v1/auth/register limité (429) dans cet environnement."
AUTH_E2E_LOGIN_429 = "/api/v1/auth/login limité (429) dans cet environnement."
AUTH_E2E_FREE_ACCESS = "API en mode accès libre (FREE_ACCESS_MODE) : /me sans token autorisé."


def auth_e2e_register_fail(status: int, body: str) -> str:
    return f"/api/v1/auth/register indisponible ({status}): {body[:200]}"


def auth_e2e_login_fail(status: int, body: str) -> str:
    return f"/api/v1/auth/login indisponible ({status}): {body[:200]}"


# ─── Catalogue ────────────────────────────────────────────────────────────────
CAT_PAGINATION_UNAVAILABLE = "Pagination cursor indisponible dans cet environnement de test."
