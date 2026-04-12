# 🐍 03 — AUDIT BACKEND 2026
# Python 3.12+ · FastAPI 0.115+ · Pydantic v2 · asyncpg · Ruff · structlog
# Sévérité maximale — Patterns 2026 obligatoires

---

## MÉTHODE D'ANALYSE 2026

```
Pour chaque fichier backend :

1. Afficher : "=== LECTURE [fichier] : N lignes ==="
2. Analyser : imports, classes, fonctions, type hints
3. Citer les numéros de lignes pour chaque observation
4. Classifier : 🔴 FATAL / 🟠 CRITIQUE / 🟡 MAJEUR / 🔵 MINEUR / 🆕 UPGRADE 2026
5. Fournir le code corrigé COMPLET si problème 🔴 ou 🟠
6. Signaler les patterns 2026 manquants : lifespan(), httpx, structlog, Pydantic v2
7. Score /10

FORMAT FICHE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 [chemin/fichier.py]
📊 [N] lignes lues | Python 3.12+ | Score : X/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VÉRIFICATION RUFF (lancer avant analyse) :
  ruff check [fichier.py] --select=ALL
  → Lister chaque erreur par ligne

VÉRIFICATION MYPY :
  mypy [fichier.py] --strict
  → Lister chaque erreur de type

[ANALYSE LIGNE PAR LIGNE]
[PROBLÈMES DÉTECTÉS]
[CORRECTIONS CODE COMPLET]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## B1 — api.py

```
VÉRIFICATIONS 2026 PRIORITAIRES :

□ lifespan() context manager (PAS @app.on_event — LEGACY depuis FastAPI 0.103) ?
□ Routers séparés par domaine (éviter un api.py monolithique > 200 lignes) ?
□ Exception handlers globaux avec structlog ?
□ Middleware de sécurité (TrustedHost, HTTPS redirect en prod) ?
□ FastAPI(lifespan=lifespan, title=..., version=...) ?
□ Dependency Injection : Annotated[Settings, Depends(get_settings)] ?
□ HTTPException avec ProblemDetail (RFC 9457) pour les erreurs structurées ?

PATTERN LIFESPAN OBLIGATOIRE EN 2026 :
  \`\`\`python
  from contextlib import asynccontextmanager
  from fastapi import FastAPI

  @asynccontextmanager
  async def lifespan(app: FastAPI):
      # Startup
      await db_manager.init_pool()
      if settings.watchdog_enabled:
          watchdog.start()
      logger.info("app_started", version=settings.version, env=settings.environment)
      yield
      # Shutdown (TOUJOURS exécuté, même en cas d'erreur)
      await db_manager.close_pool()
      watchdog.stop()
      logger.info("app_stopped")

  app = FastAPI(
      lifespan=lifespan,
      title="Docling Agent API",
      version="4.0.0",
      docs_url="/docs" if settings.is_dev else None,  # Désactiver en prod !
      redoc_url="/redoc" if settings.is_dev else None,
  )
  \`\`\`

VÉRIFICATIONS PAR ENDPOINT :
  □ Auth       : Depends(get_current_user) avec Annotated ?
  □ Input      : Corps validé Pydantic v2, query params Annotated ?
  □ Output     : response_model= avec schéma de réponse dédié ?
  □ Erreurs    : HTTPException avec codes HTTP corrects ?
  □ Logging    : structlog.contextvars.bind_contextvars(request_id=...) ?
  □ N+1        : Aucune requête DB dans une boucle ?
  □ Taille     : Endpoint > 30 lignes → extraire la logique dans un service ?

DEPENDENCY INJECTION PATTERN 2026 :
  \`\`\`python
  from typing import Annotated
  from fastapi import Depends

  CurrentUser = Annotated[User, Depends(get_current_user)]
  DBPool = Annotated[asyncpg.Pool, Depends(get_pool)]

  @router.get("/catalogue")
  async def get_catalogue(
      user: CurrentUser,
      pool: DBPool,
      page: Annotated[int, Query(ge=1)] = 1,
      limit: Annotated[int, Query(ge=1, le=100)] = 50,
  ) -> CatalogueResponse:
      ...
  \`\`\`
```

### Grille d'analyse api.py

| Endpoint | Méthode | lifespan OK | Annotated DI | response_model | structlog | Score | Problèmes 2026 |
|----------|---------|-------------|-------------|---------------|----------|-------|----------------|
| /health | GET | — | — | HealthResponse | | /10 | |
| /register | POST | — | | | | /10 | |
| /login | POST | — | | | | /10 | |
| /process | POST | — | | | | /10 | |
| /catalogue | GET | — | | | | /10 | |
| [AGENT: tous les endpoints] | | | | | | | |

---

## B2 — backend/core/config.py

```
PYDANTIC V2 OBLIGATOIRE EN 2026 :

PATTERN LEGACY (❌) :
  class Settings(BaseSettings):
      class Config:
          env_file = ".env"

PATTERN 2026 (✅) :
  from pydantic_settings import BaseSettings, SettingsConfigDict
  from pydantic import field_validator, model_validator

  class Settings(BaseSettings):
      model_config = SettingsConfigDict(
          env_file=".env",
          env_file_encoding="utf-8",
          case_sensitive=False,
          extra="forbid",  # Fail sur variable inconnue
          validate_default=True,
      )

      jwt_secret: SecretStr  # SecretStr masqué dans les logs !
      database_url: PostgresDsn  # Validation automatique du format
      gemini_api_key: SecretStr
      environment: Literal["development", "staging", "production"] = "production"

      @field_validator("jwt_secret")
      @classmethod
      def validate_jwt_secret(cls, v: SecretStr) -> SecretStr:
          if len(v.get_secret_value()) < 32:
              raise ValueError("JWT_SECRET must be at least 32 characters")
          return v

      @property
      def is_dev(self) -> bool:
          return self.environment == "development"

      @property
      def is_prod(self) -> bool:
          return self.environment == "production"

  # Singleton thread-safe avec lru_cache
  from functools import lru_cache

  @lru_cache(maxsize=1)
  def get_settings() -> Settings:
      return Settings()

VÉRIFICATIONS :
  □ SecretStr pour JWT_SECRET et GEMINI_API_KEY (masqué dans les logs) ?
  □ PostgresDsn pour DATABASE_URL (validation format automatique) ?
  □ Literal["development","staging","production"] pour ENVIRONMENT ?
  □ extra="forbid" pour détecter les variables inconnues ?
  □ @lru_cache singleton pour éviter de recharger les vars à chaque requête ?
  □ Pas de valeurs par défaut dangereuses (pas de jwt_secret="changeme") ?
```

### Fiche config.py

| Champ | Type Pydantic v2 | Validator | SecretStr ? | Extra="forbid" | Problème |
|-------|-----------------|-----------|------------|---------------|---------|
| jwt_secret | SecretStr | len >= 32 | OUI/NON | OUI/NON | |
| database_url | PostgresDsn | auto | — | | |
| gemini_api_key | SecretStr | non vide | OUI/NON | | |
| environment | Literal[...] | auto | — | | |
| [AGENT: tous les champs] | | | | | |

---

## B3 — backend/core/db_manager.py

```
ASYNCPG 2026 — PATTERNS MODERNES :

POOL CONFIGURATION CORRECTE :
  \`\`\`python
  import asyncpg
  from typing import AsyncGenerator

  async def init_pool(settings: Settings) -> asyncpg.Pool:
      return await asyncpg.create_pool(
          dsn=str(settings.database_url),
          min_size=2,
          max_size=20,
          max_inactive_connection_lifetime=300,
          command_timeout=30,
          server_settings={
              "application_name": "docling-agent",
              "jit": "off",  # JIT off pour les requêtes courtes
          },
      )

  # Dependency injection propre
  async def get_pool() -> AsyncGenerator[asyncpg.Pool, None]:
      async with app.state.pool.acquire() as conn:
          yield conn
  \`\`\`

REQUÊTES PARAMÉTRÉES — VÉRIFICATION STRICTE :
  □ Jamais de f-string avec de l'input utilisateur dans une requête SQL
  □ $1, $2... uniquement pour les paramètres
  □ ILIKE : terme passé en $N (pas concaténé dans la string)

PATTERN N+1 → EVITER :
  ❌ for product_id in ids:
         product = await conn.fetchrow("SELECT ... WHERE id = $1", product_id)

  ✅ products = await conn.fetch(
         "SELECT ... WHERE id = ANY($1::int[])", ids
     )

TRANSACTIONS CORRECTES :
  ✅ async with pool.acquire() as conn:
         async with conn.transaction():
             await conn.execute(...)
             await conn.execute(...)
             # Rollback automatique si exception

VÉRIFICATIONS :
  □ Pool initialisé dans lifespan() (pas en global module) ?
  □ Requêtes avec ANY($1::type[]) pour les IN clauses (pas de N+1) ?
  □ context managers pour les transactions (async with conn.transaction()) ?
  □ _escape_like() pour sanitiser les wildcards ILIKE ?
  □ Pagination cursor-based (pas OFFSET pour les grandes tables) ?
  □ Type annotations asyncpg.Pool, asyncpg.Record, asyncpg.Connection ?
```

### Grille méthodes db_manager.py

| Méthode | Lignes | Paramétré | ANY[] | Transaction | Type hints | Score | Problème 2026 |
|---------|--------|-----------|-------|-------------|-----------|-------|---------------|
| [AGENT: toutes les méthodes] | | | | | | | |

---

## B4 — backend/core/orchestrator.py

```
PATTERNS ASYNC 2026 :

ASYNCIO CONCURRENT CORRECT :
  \`\`\`python
  import asyncio
  from typing import Any

  async def process_invoice(job_id: str, file_path: str) -> dict[str, Any]:
      # Paralléliser les étapes indépendantes
      extraction_task = asyncio.create_task(extract_data(file_path))
      metadata_task = asyncio.create_task(get_file_metadata(file_path))

      # Timeout global sur l'ensemble
      async with asyncio.timeout(120):  # Python 3.11+ : asyncio.timeout()
          extraction, metadata = await asyncio.gather(
              extraction_task, metadata_task,
              return_exceptions=True,  # Ne pas fail si une sous-tâche échoue
          )

      # Vérifier les exceptions retournées
      if isinstance(extraction, Exception):
          logger.error("extraction_failed", job_id=job_id, error=str(extraction))
          raise ...
  \`\`\`

  □ asyncio.timeout() (Python 3.11+) plutôt que asyncio.wait_for() ?
  □ return_exceptions=True dans asyncio.gather() pour gérer les erreurs partielles ?
  □ asyncio.TaskGroup (Python 3.11+) pour des tâches structurées ?
  □ Fallback Gemini → Factur-X implémenté et testé ?
  □ Status du job mis à jour AVANT et APRÈS chaque étape critique ?
  □ structlog avec contexte (job_id, user_id, file_hash) à chaque log ?

TASKGROUP PATTERN (Python 3.11+) :
  \`\`\`python
  async with asyncio.TaskGroup() as tg:
      task1 = tg.create_task(extract_gemini(file))
      task2 = tg.create_task(validate_facturx(file))
  # Si une tâche échoue → ExceptionGroup levée avec toutes les erreurs
  \`\`\`
```

---

## B5 — backend/schemas/invoice.py

```
PYDANTIC V2 — VÉRIFICATIONS COMPLÈTES :

  □ model_config = ConfigDict(...)  (pas class Config)
  □ @model_validator(mode="after") pour la cohérence inter-champs
  □ @field_validator("champ", mode="before") pour la transformation
  □ Annotated[float, Field(ge=0, decimal_places=2)] pour les prix
  □ BatchSaveRequest : max 500 items (protection DoS)
  □ Schémas de réponse séparés (ProductResponse sans champs internes)
  □ model_json_schema() fonctionnel pour OpenAPI

PATTERN COMPLET 2026 :
  \`\`\`python
  from decimal import Decimal
  from typing import Annotated
  from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

  class Product(BaseModel):
      model_config = ConfigDict(
          str_strip_whitespace=True,
          str_max_length=1000,
          validate_assignment=True,
          json_schema_extra={
              "example": {
                  "designation_fr": "Ciment Portland CEM I 52.5",
                  "prix_unitaire_ht": 12.50,
              }
          }
      )

      designation_fr: Annotated[str, Field(min_length=1, max_length=500)]
      prix_unitaire_ht: Annotated[Decimal, Field(ge=0, decimal_places=4)]
      quantite: Annotated[float, Field(gt=0)] | None = None
      fournisseur: Annotated[str, Field(max_length=200)] | None = None

      @field_validator("designation_fr", mode="before")
      @classmethod
      def clean_designation(cls, v: str) -> str:
          return " ".join(v.split())  # Normalise les espaces

  class BatchSaveRequest(BaseModel):
      products: Annotated[list[Product], Field(min_length=1, max_length=500)]
      job_id: str
  \`\`\`
```

---

## B6 — backend/services/auth_service.py

```
SÉCURITÉ CRYPTO 2026 — CRITIQUE :

JWT ASYMÉTRIQUE RS256 (MIEUX QUE HS256) :
  \`\`\`python
  # Génération des clés (une fois, au déploiement) :
  # openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
  # openssl rsa -pubout -in private_key.pem -out public_key.pem

  import jwt
  from pathlib import Path

  def create_access_token(user_id: int, settings: Settings) -> str:
      payload = {
          "sub": str(user_id),
          "iat": datetime.now(UTC),
          "exp": datetime.now(UTC) + timedelta(hours=settings.jwt_expiry_hours),
          "jti": secrets.token_urlsafe(16),  # JWT ID unique (révocation)
      }
      return jwt.encode(
          payload,
          settings.jwt_private_key.get_secret_value(),
          algorithm="RS256",
      )

  def verify_token(token: str, settings: Settings) -> dict:
      return jwt.decode(
          token,
          settings.jwt_public_key,
          algorithms=["RS256"],  # Jamais ["HS256", "RS256"] — choisir UN algo
          options={"verify_exp": True, "verify_iat": True},
      )
  \`\`\`

ARGON2ID (STANDARD 2026) :
  \`\`\`python
  from argon2 import PasswordHasher
  from argon2.exceptions import VerifyMismatchError

  # Paramètres OWASP 2024 pour argon2id :
  ph = PasswordHasher(
      time_cost=3,         # Au moins 3 itérations
      memory_cost=65536,   # 64 MB (augmenter si la machine le permet)
      parallelism=4,
      hash_len=32,
      salt_len=16,
      encoding="utf-8",
      type=argon2.Type.ID,  # argon2id (pas argon2i !)
  )

  def verify_password(plain: str, hashed: str, conn: asyncpg.Connection) -> bool:
      try:
          ph.verify(hashed, plain)
          # Rehash automatique si les paramètres ont changé
          if ph.check_needs_rehash(hashed):
              new_hash = ph.hash(plain)
              await update_password_hash(conn, new_hash)
          return True
      except VerifyMismatchError:
          return False
  \`\`\`

VÉRIFICATIONS :
  □ RS256 (asymétrique) ou au minimum HS256 avec secret >= 32 chars ?
  □ argon2id avec paramètres OWASP 2024 ?
  □ jti (JWT ID) pour la révocation de tokens ?
  □ Token blacklist en cache (Redis ou table DB) ?
  □ Timing-safe comparison avec hmac.compare_digest() ?
  □ Refresh token rotation implémentée ?
  □ PASSKEYS/WebAuthn envisagés pour l'avenir ?
```

---

## B7 — backend/services/gemini_service.py

```
APPELS LLM 2026 — PATTERNS MODERNES :

HTTPX + TIMEOUT + RETRY :
  \`\`\`python
  import httpx
  from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

  @retry(
      stop=stop_after_attempt(3),
      wait=wait_exponential(multiplier=1, min=1, max=10),
      retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
      reraise=True,
  )
  async def call_gemini_with_retry(client: httpx.AsyncClient, payload: dict) -> dict:
      response = await client.post(
          GEMINI_URL,
          json=payload,
          timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0),
      )
      response.raise_for_status()
      return response.json()
  \`\`\`

RESPONSE_SCHEMA STRICT (protection prompt injection) :
  \`\`\`python
  # Le schéma force le modèle à répondre en JSON structuré
  # → Protège contre les sorties arbitraires (prompt injection)
  generation_config = {
      "response_mime_type": "application/json",
      "response_schema": {
          "type": "object",
          "properties": {
              "products": {
                  "type": "array",
                  "items": {"$ref": "#/$defs/Product"}
              }
          },
          "required": ["products"],
          "additionalProperties": false,  # Bloque les clés inattendues
      }
  }
  \`\`\`

VÉRIFICATIONS :
  □ httpx.AsyncClient (jamais requests en async) ?
  □ tenacity pour les retries avec backoff exponentiel ?
  □ asyncio.timeout() sur l'appel global ?
  □ response_schema strict (additionalProperties: false) ?
  □ Circuit breaker (circuit-breaker-lib ou implémentation custom) ?
  □ Modèle configurable via settings (pas hardcodé) ?
  □ Taille d'image validée avant envoi (< 10Mo pour Gemini) ?
  □ Hash du fichier pour détecter les appels redondants (cache) ?
  □ Quota tracking : alerte si > 80% du quota mensuel atteint ?
  □ JAMAIS de données sensibles loggées (contenu facture, clé API) ?
```

---

## B8 — backend/services/watchdog_service.py

```
WATCHDOG 2026 — THREAD SAFETY :

  □ watchdog 4.0+ avec Observer thread-safe ?
  □ Debounce : délai avant traitement (éviter double trigger sur fichier en cours d'écriture) ?
  □ Validation chemin (path traversal) :
    \`\`\`python
    from pathlib import Path

    def safe_path(filename: str, base_dir: Path) -> Path:
        resolved = (base_dir / Path(filename).name).resolve()
        if not str(resolved).startswith(str(base_dir.resolve())):
            raise ValueError(f"Path traversal detected: {filename}")
        return resolved
    \`\`\`
  □ Filtre type MIME réel (python-magic, pas seulement l'extension) ?
  □ Arrêt propre via asyncio.Event() signal dans le lifespan() ?
  □ Métriques : nombre de fichiers traités, erreurs, temps moyen ?
```

---

## B9 — backend/services/storage_service.py

```
STOCKAGE OBJET 2026 :

  □ aiobotocore ou boto3 avec run_in_executor (jamais boto3 sync en async) ?
  □ Timeout httpx sur les uploads S3 ?
  □ Retry avec backoff sur les erreurs réseau ?
  □ Validation type MIME avec python-magic AVANT l'upload ?
  □ Noms de fichiers : uuid4() + extension sanitisée (jamais le nom original) ?
    \`\`\`python
    import uuid
    from pathlib import Path

    def secure_filename(original: str) -> str:
        suffix = Path(original).suffix.lower()
        allowed = {".pdf", ".png", ".jpg", ".jpeg", ".tiff"}
        if suffix not in allowed:
            raise ValueError(f"Extension non autorisée: {suffix}")
        return f"{uuid.uuid4()}{suffix}"
    \`\`\`
  □ Presigned URLs avec expiration <= 15 minutes ?
  □ Bucket : accès public désactivé, policy minimale ?
  □ Cleanup fichiers temp dans finally (pas seulement en cas de succès) ?
  □ Credentials jamais loggées (SecretStr dans settings) ?
```

---

## B10 — Logging avec structlog 2026

```
STRUCTLOG — PATTERN OBLIGATOIRE (remplace logging.getLogger) :

  \`\`\`python
  # setup_logging.py
  import structlog
  import logging

  def configure_logging(settings: Settings) -> None:
      processors = [
          structlog.contextvars.merge_contextvars,
          structlog.stdlib.add_log_level,
          structlog.stdlib.add_logger_name,
          structlog.processors.TimeStamper(fmt="iso"),
          structlog.processors.StackInfoRenderer(),
      ]

      if settings.is_dev:
          processors.append(structlog.dev.ConsoleRenderer())
      else:
          processors.append(structlog.processors.JSONRenderer())  # JSON en prod

      structlog.configure(
          processors=processors,
          wrapper_class=structlog.make_filtering_bound_logger(
              logging.DEBUG if settings.is_dev else logging.INFO
          ),
          context_class=dict,
          logger_factory=structlog.PrintLoggerFactory(),
      )

  # Usage dans les fichiers :
  import structlog
  logger = structlog.get_logger(__name__)

  # Ajouter le contexte de requête (dans un middleware) :
  structlog.contextvars.bind_contextvars(
      request_id=request.headers.get("x-request-id", str(uuid4())),
      user_id=user.id,
      endpoint=request.url.path,
  )
  \`\`\`

VÉRIFICATIONS :
  □ structlog installé et configuré ?
  □ JSON en production, console colorée en dev ?
  □ request_id propagé dans tous les logs d'une requête ?
  □ Jamais de password/token dans les logs ?
  □ Niveaux corrects (DEBUG pour dev, INFO+ pour prod) ?
```

---

## B11 — requirements.txt / pyproject.toml

```bash
# Audit complet des dépendances
uv run pip-audit --format=json | python3 -m json.tool
uv pip list --outdated 2>/dev/null || pip list --outdated

# Vérifier les versions cibles 2026
python3 -c "
import pkg_resources
targets = {
    'fastapi': '>=0.115',
    'pydantic': '>=2.7',
    'pydantic-settings': '>=2.3',
    'asyncpg': '>=0.30',
    'httpx': '>=0.27',
    'structlog': '>=24.0',
    'argon2-cffi': '>=23.0',
    'PyJWT': '>=2.8',
    'alembic': '>=1.13',
    'pytest': '>=8.0',
    'pytest-asyncio': '>=0.24',
    'ruff': '>=0.5',
}
for pkg, version in targets.items():
    try:
        v = pkg_resources.get_distribution(pkg).version
        print(f'✅ {pkg}=={v}')
    except:
        print(f'❌ {pkg} ABSENT')
"
```

### Tableau requirements.txt complet

| Package | Version actuelle | Version cible 2026 | CVE pip-audit | Statut | Action |
|---------|-----------------|-------------------|--------------|--------|--------|
| fastapi | | >= 0.115 | | ✅/🆕/❌ | |
| pydantic | | >= 2.7 | | ✅/🆕/❌ | |
| asyncpg | | >= 0.30 | | | |
| httpx | | >= 0.27 | | | |
| structlog | | >= 24.0 | | | |
| argon2-cffi | | >= 23.0 | | | |
| PyJWT | | >= 2.8 | | | |
| ruff | | >= 0.5 (dev) | | | |
| mypy | | >= 1.10 (dev) | | | |
| pytest | | >= 8.0 (dev) | | | |
| pytest-asyncio | | >= 0.24 (dev) | | | |
| [AGENT: TOUS les packages] | | | | | |

---

## B12 — ANALYSE CROISÉE BACKEND 2026

```bash
# Ruff check complet
ruff check . --select=ALL --output-format=grouped 2>&1 | tee /tmp/ruff_report.txt
echo "Total erreurs Ruff : $(grep -c 'error\|warning' /tmp/ruff_report.txt)"

# Mypy strict
mypy backend/ api.py --strict 2>&1 | tee /tmp/mypy_report.txt
echo "Total erreurs mypy : $(grep -c 'error:' /tmp/mypy_report.txt)"

# Bandit sécurité
bandit -r backend/ api.py -f json 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
for issue in d.get('results', []):
    sev = issue['issue_severity']
    if sev in ['HIGH', 'MEDIUM']:
        print(f\"{sev} [{issue['test_id']}] {issue['filename']}:{issue['line_number']} {issue['issue_text']}\")
"

# Code mort
vulture backend/ api.py --min-confidence=80 2>/dev/null | head -20

# Complexité cyclomatique
ruff check . --select=C90 --format=text 2>/dev/null
```

### Checklist globale backend 2026

| Critère | ✅/❌ | Détails |
|---------|-------|---------|
| Python 3.12+ | | |
| FastAPI lifespan() | | |
| Pydantic v2 partout | | |
| httpx (jamais requests) | | |
| structlog configuré | | |
| Type hints 100% | | |
| Ruff 0 erreur | | |
| Mypy strict 0 erreur | | |
| Bandit 0 HIGH/MEDIUM | | |
| Aucun @app.on_event | | |
| Aucune f-string SQL | | |

---

## SCORECARD BACKEND

| Fichier | Score /10 | 🔴 | 🟠 | 🟡 | 🆕 Upgrade |
|---------|-----------|----|----|-----|-----------|
| api.py | | | | | |
| config.py | | | | | |
| db_manager.py | | | | | |
| orchestrator.py | | | | | |
| invoice.py | | | | | |
| auth_service.py | | | | | |
| gemini_service.py | | | | | |
| watchdog_service.py | | | | | |
| storage_service.py | | | | | |
| serializers.py | | | | | |
| **MOYENNE** | X/10 | | | | |

---

## ✅ GATE B — BACKEND 2026

```bash
# 1. Import sans erreur
python -c "import api; print('✅ Import OK')"

# 2. Ruff : 0 erreur
ruff check . && echo "✅ Ruff OK" || echo "❌ Ruff FAIL"

# 3. Mypy : 0 erreur critique
mypy backend/ api.py --strict 2>&1 | grep -c "error:" | \
  xargs -I{} test {} -eq 0 && echo "✅ mypy OK" || echo "❌ mypy FAIL"

# 4. Tests pytest
pytest tests/ -v --tb=short --asyncio-mode=auto 2>&1 | tail -20
echo "Tests fail : $(pytest tests/ -q 2>&1 | grep -c FAILED)"
# → 0 FAILED

# 5. Couverture > 80%
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=80

# 6. Sécurité deps
uv run pip-audit 2>&1 | grep -cE "VULNERABLE|critical|high" || echo "0 CVE"

# 7. Bandit sécurité
bandit -r backend/ api.py -ll -q && echo "✅ Bandit OK"

# 8. Lifespan (pas @app.on_event)
grep -rn "@app.on_event" api.py backend/ && echo "❌ LEGACY détecté" \
  || echo "✅ Pas de @app.on_event"

PASS si :
  → 0 problème 🔴
  → 0 problème 🟠
  → Ruff 0 erreur
  → Mypy 0 erreur critique
  → pytest 0 fail
  → Couverture > 80%
  → 0 CVE critique/haute
  → Pas de @app.on_event (lifespan uniquement)

STATUS : [ ] PASS  [ ] FAIL
```