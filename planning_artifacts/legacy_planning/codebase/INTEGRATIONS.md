# External Integrations

**Analysis Date:** 2026-03-17

## APIs & External Services

**AI & Text Processing:**
- Gemini AI (Google) - Multilingue OCR extraction (FR/ES/CA)
  - SDK: `google-genai>=1.64,<2`
  - Auth env var: `GEMINI_API_KEY`
  - Models available: `gemini-3-flash-preview` (default, cost: $0.10/1M tokens), `gemini-3.1-pro-preview` ($2.50/1M), `gemini-2.5-flash` ($0.30/1M)
  - Features: Structured Output (response_schema), multiline support, 3min timeout for long invoices
  - Fallback: Regex parsing if response_schema unsupported
  - Retry: Automatic on rate limit (429)

**Bytez API (Optional):**
- 100k+ model library unified API
  - SDK: Custom via httpx
  - Auth env var: `BYTEZ_API_KEY` (optional, docs at docs.bytez.com)
  - Not currently active in code

**Service-to-Service Auth:**
- Pronto (external artisan platform) → Docling API calls
  - Auth: X-Service-Key header
  - Config: Comma-separated keys in `SERVICE_API_KEYS` env var
  - CORS: `PRONTO_URL` env var (allowlist Pronto frontend origin)
  - Implementation: `apps/api/main.py` auth dependency (line 94-99)

## Data Storage

**Databases:**
- PostgreSQL (Neon) - Cloud-hosted, connection pooling via `-pooler` endpoint
  - Connection: `DATABASE_URL` env var (postgresql://...)
  - Client: asyncpg 0.31+ (async native, no blocking)
  - Pool: min 2, max 10 connections
  - Migrations: Alembic a001–a008 (`apps/api/migrations/versions/`)
  - Schema: users, produits (with unique constraint: designation_raw+fournisseur+user_id), factures, prix_communautaires, jobs (async task queue)

**File Storage:**
- Storj S3 (S3-compatible, decentralized)
  - Bucket: `docling-factures` (env var: `STORJ_BUCKET`)
  - Auth: Access key + Secret key (`STORJ_ACCESS_KEY`, `STORJ_SECRET_KEY`)
  - Endpoint: `https://gateway.storjshare.io` (env var: `STORJ_ENDPOINT`)
  - Client: boto3 1.40+ (S3-compatible, works with R2, MinIO too)
  - Upload: Presigned URLs with 7-day expiry (security: no direct key in frontend)
  - Key format: `YYYY/MM/hash8_filename` (organized by date)
  - Implementation: `apps/api/services/storage_service.py`

**Local File Watching:**
- Docling_Factures/ folder (watchdog-monitored)
  - Path: `./Docling_Factures` (configurable via `WATCHDOG_FOLDER` env var)
  - Subdirs: `Traitees/` (processed), `Erreurs/` (failed)
  - Enabled: `WATCHDOG_ENABLED` env var (default: true)
  - Service: `apps/api/services/watchdog_service.py` (async file monitor)

**Caching:**
- In-memory (Gemini client cache per model)
  - GeminiService singleton: `_gemini_cache` dict in `apps/api/services/gemini_service.py`
  - No Redis or external cache (stateless backend)

## Authentication & Identity

**Auth Provider:**
- Custom JWT + Argon2id (no external OAuth)
  - Implementation: `apps/api/services/auth_service.py`
  - Token signing: PyJWT 2.12+ with HS256 algorithm
  - Expiry: 24 hours (configurable via `JWT_EXPIRY_HOURS` env var)
  - Storage: httpOnly cookie (name: `docling-token`)
  - Password hashing: Argon2id (time_cost=3, memory_cost=65536, parallelism=2)
  - Backward compatibility: Legacy PBKDF2 hashes auto-rehashed to Argon2id on login

**Token Flow:**
1. User registers: POST `/api/v1/auth/register` → hash password, create user, issue JWT
2. User login: POST `/api/v1/auth/login` → verify password, issue JWT in httpOnly cookie
3. API calls: Cookie sent automatically (axios `withCredentials: true`)
4. Fallback headers: Authorization Bearer or X-Service-Key (for service-to-service)
5. Logout: POST `/api/v1/auth/logout` → clear cookie

**Rate Limiting:**
- slowapi 0.1+ (key: remote IP address)
- Per-endpoint limits (if configured in main.py)

## Monitoring & Observability

**Error Tracking:**
- Sentry.io (optional, per-environment)
  - SDK: sentry-sdk[fastapi] 2.53+
  - Config env var: `SENTRY_DSN`
  - Sampling: 10% trace sample rate (0.1)
  - Environment: Pulled from `ENVIRONMENT` env var (production/development)
  - Frontend: @sentry/react 10.40.0 (if VITE_SENTRY_DSN set)
  - Init check: Warning logged if SENTRY_DSN missing in production

**Logging:**
- Backend: Python logging (uvicorn default, configurable)
- Frontend: Browser console (development)

**Metrics:**
- Backend: Custom metrics in endpoints (response times, token costs, etc.)
- Frontend: web-vitals 4.2.4 (Core Web Vitals: LCP, FID, CLS)

## CI/CD & Deployment

**Hosting:**
- Backend: Render.com (Docker-based, free tier)
  - Config: `render.yaml` (branch: main)
  - Runtime: Python 3.11 via Dockerfile
  - Env vars: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, PWA_URL, SENTRY_DSN (sync=false = manual)
  - Build: Docker image, multi-stage (builder + runtime)
  - Health check: `/health` endpoint (30s interval, 10s timeout)

- Frontend: Netlify (static site, auto-deploy from Git)
  - Build: `pnpm build` (Vite output → dist/)
  - Deploy: Push to main → auto-build/deploy

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`)
  - ci.yml: Lint, test, build checks
  - deploy.yml: Conditional deployment to Render/Netlify
  - Excluded from repo: Workflow YAML not committed (per CLAUDE.md)

**Database Migration:**
- Alembic 1.18+ (version control for schema)
  - Versions: a001 (baseline) → a008 (community pricing)
  - Location: `apps/api/migrations/versions/`
  - Init: Run automatically on Render startup (or manual via `alembic upgrade head`)

## Environment Configuration

**Required env vars (startup validation):**
- `GEMINI_API_KEY` - Gemini API key (fails startup if missing)
- `DATABASE_URL` - PostgreSQL connection string (must start with "postgresql://")
- `JWT_SECRET` - Min 32 characters for HS256 signing (fails if <32 chars)
- `PWA_URL` - Frontend URL (added to CORS allowlist)

**Optional env vars:**
- `STORJ_ACCESS_KEY`, `STORJ_SECRET_KEY` - Omit to disable S3 storage
- `SENTRY_DSN` - Omit to skip error tracking
- `BYTEZ_API_KEY` - Omit (alternative AI provider, not active)
- `COMMUNITY_SALT` - Salt for hashing community price base
- `SERVICE_API_KEYS` - Comma-separated keys for Pronto integration
- `PRONTO_URL` - Pronto frontend origin for CORS

**Frontend env vars (build-time, VITE_):**
- `VITE_API_URL` - Backend API base URL (required in production)
- `VITE_AUTH_REQUIRED` - Enforce login (default: false)
- `VITE_SENTRY_DSN` - Frontend error tracking
- `VITE_TVA_RATE` - VAT rate for calculations (default: 0.21 for IVA Spain/Portugal)

**Secrets location:**
- `.env` file (repo root) - Git-ignored, never committed
- Render dashboard: Env vars with sync=false (manual input only)
- Netlify dashboard: Build env vars (VITE_API_URL, VITE_SENTRY_DSN)

## Webhooks & Callbacks

**Incoming Webhooks:**
- None currently configured
- Potential: Sentry event webhook (optional, not used)

**Outgoing Webhooks:**
- None currently configured
- Potential: Pronto callback endpoints (future integration)

---

*Integration audit: 2026-03-17*
