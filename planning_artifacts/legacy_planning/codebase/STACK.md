# Technology Stack

**Analysis Date:** 2026-03-17

## Languages

**Primary:**
- Python 3.11 - Backend FastAPI API server
- JavaScript (ES2024) - React 19 PWA frontend

**Secondary:**
- SQL (PostgreSQL) - Database queries via asyncpg

## Runtime

**Environment:**
- Python 3.11 (backend) via Docker
- Node.js LTS (frontend build-time only)
- Browser (React PWA, installable on mobile)

**Package Manager:**
- Backend: `uv` (10-100x faster than pip) - `apps/api/pyproject.toml`
- Frontend: `pnpm` workspace - `apps/pwa/package.json`
- Lockfiles: `uv.lock` (backend), `pnpm-lock.yaml` (frontend)

## Frameworks

**Core:**
- FastAPI 0.115+ - HTTP API framework, async native
- React 19.2.4 - UI library with hooks
- Vite 5.4.14 - Build tool & dev server
- React Router DOM 7.13.1 - Client-side routing

**Styling & UI:**
- Tailwind CSS 3.4.17 - Utility-first CSS
- PostCSS 8.5.6 - CSS transformations
- Framer Motion 12.34.3 - Animations
- Lucide React 0.575.0 - Icon library
- Shadcn/ui + Radix UI - Component library (via Tailwind)

**State Management:**
- Zustand 5.0.11 - Minimal state management
- React Context - Built-in state sharing

**Data Export & Visualization:**
- jsPDF 4.2.0 - PDF generation
- jsPDF AutoTable 5.0.7 - PDF table formatting
- ExcelJS 4.4.0 - Excel/CSV generation
- Recharts 3.7.0 - Chart visualization
- React Virtual 3.10.0 - Virtual scrolling

**Testing:**
- Backend: pytest 8+, pytest-asyncio, pytest-cov
- Frontend: Vitest 3.2.4, @testing-library/react 16.3.2
- Build: Vite config with jsdom environment

**Build/Dev:**
- Vite PWA 0.21.1 - PWA manifest & service worker
- Vite Basic SSL - HTTPS in dev
- ESLint 9.39.1 - Code linting
- Prettier 3.8.1 - Code formatting
- Ruff 0.4+ - Python linting

## Key Dependencies

**Critical Backend:**
- fastapi 0.115+ - Web framework, async/await native
- asyncpg 0.31+ - PostgreSQL async driver (connection pooling, no blocking I/O)
- google-genai 1.64+ - Google Gemini AI SDK (structured output, retry)
- httpx 0.27+ - Async HTTP client
- pydantic 2.9+, pydantic-settings 2.13+ - Request/response validation
- PyJWT 2.12+ - JWT token signing/verification (security patch)
- argon2-cffi 25.1+ - Password hashing (Argon2id, not PBKDF2)
- slowapi 0.1+ - Rate limiting middleware
- sentry-sdk[fastapi] 2.53+ - Error tracking & monitoring

**Critical Frontend:**
- react 19.2.4 - UI framework
- axios 1.13.5 - HTTP client with retry interceptor
- react-dom 19.2.4 - React renderer
- zustand 5.0.11 - State store

**Infrastructure:**
- boto3 1.40+ - AWS/Storj S3 SDK (presigned URLs)
- alembic 1.18+ - Database migration tool
- factur-x 3.15+ - FactureX/FatturaPA PDF parser
- opencv-python-headless 4.10+ - Image preprocessing (no GUI)
- lxml 5.4+ - XML parsing (used by factur-x)
- watchdog 5.0+ - File system monitoring (Docling_Factures folder)
- python-multipart 0.0.22+ - Multipart form parsing (security patch)

**Monitoring & Analytics:**
- sentry-sdk[fastapi] 2.53+ - Distributed error tracking
- web-vitals 4.2.4 - Core Web Vitals metrics (frontend)
- @sentry/react 10.40.0 - Sentry integration for React

**Development Only:**
- playwright 1.49+ - E2E testing (Browser automation)
- faker 30+ - Test data generation
- locust 2.32+ - Load testing
- pytest-timeout 2.3+ - Timeout enforcement
- Coverage (via pytest-cov, @vitest/coverage-v8)

## Configuration

**Environment:**
- Central `.env` file at repo root (loaded via pydantic-settings)
- Validated at startup via `Config.validate()` in `apps/api/core/config.py`
- See `.env.example` for template

**Key env vars:**
- `GEMINI_API_KEY` - Required for Gemini AI extraction
- `DATABASE_URL` - PostgreSQL connection (Neon with -pooler suffix)
- `JWT_SECRET` - Min 32 chars, HS256 signing key
- `ENVIRONMENT` - "production" or "development"
- `FREE_ACCESS_MODE` - Guest access (disabled in production)
- `STORJ_ACCESS_KEY`, `STORJ_SECRET_KEY` - S3 storage credentials
- `PWA_URL` - Frontend URL for CORS
- `SENTRY_DSN` - Error tracking endpoint
- `VITE_API_URL` - Backend API URL (frontend env var)

**Backend Build:**
- Dockerfile: Multi-stage (builder + runtime) using Python 3.11-slim
- uv installed from ghcr.io/astral-sh/uv
- Non-root appuser (appuser:appuser)
- Health check via `/health` endpoint

**Frontend Build:**
- Vite config: `apps/pwa/vite.config.js`
- Alias: `@` → `src/`, `@/shared` → `src/shared`, `@/features` → `src/features`
- Port: 5173 (dev), no HTTPS in dev (prevents mixed content)
- PWA manifest: Standalone, portrait, dark theme (#0f172a)
- Code splitting: react-core, router, ui-motion, charts, pdf-gen, excel-gen, dropzone chunks

**Linting & Formatting:**
- Backend: Ruff (E, F, W, I, N, B, UP rules) with 100-char line limit
- Frontend: ESLint + Prettier (no semicolons, single quotes, 80-char line length)
- Pre-commit hooks (if configured) in `.git/hooks/`

## Platform Requirements

**Development:**
- Python 3.11+
- Node.js LTS (for pnpm)
- Windows 11 (scripts in .ps1, not .sh)
- Docker (optional, for local API container)

**Production:**
- Backend: Render.com (Docker, `plan: free`)
- Frontend: Netlify (built from pnpm)
- Database: Neon (PostgreSQL, use `-pooler` endpoint for PgBouncer pooling)
- Storage: Storj S3 (S3-compatible, endpoint: https://gateway.storjshare.io)
- Error tracking: Sentry.io (optional)

**Server Specs:**
- Backend: Render free tier (256MB RAM)
- Database: Neon free tier
- Storage: Storj pay-as-you-go

---

*Stack analysis: 2026-03-17*
