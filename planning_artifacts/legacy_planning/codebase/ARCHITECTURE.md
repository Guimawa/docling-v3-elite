# Architecture

**Analysis Date:** 2026-03-17

## Pattern Overview

**Overall:** Monorepo with two independent applications sharing no code — FastAPI backend (async processing) + React PWA (frontend-only).

**Key Characteristics:**
- Async-first backend with asyncio semaphores for concurrency control
- Circuit breaker pattern for AI API resilience
- Job-based processing with polling status checks (no WebSocket)
- Cursor-based pagination for large product catalogs
- Progressive Web App with offline queue capability
- Feature-based module organization on frontend

## Layers

**Backend API Layer:**
- Purpose: REST endpoints for invoice processing, auth, catalog management
- Location: `apps/api/main.py`
- Contains: Endpoint definitions, middleware, request/response handling
- Depends on: FastAPI, services layer, database layer
- Used by: PWA frontend, watchdog service, external services (Pronto)

**Backend Services Layer:**
- Purpose: Isolated business logic (extraction, auth, storage, image processing)
- Location: `apps/api/services/`
- Contains:
  - `gemini_service.py` — AI extraction via Gemini API
  - `auth_service.py` — JWT creation/verification, password hashing (Argon2id)
  - `storage_service.py` — S3 (Storj) PDF archival
  - `image_preprocessor.py` — OpenCV image optimization
  - `facturx_extractor.py` — XML extraction from Factur-X PDFs
  - `watchdog_service.py` — File system monitoring for batch processing
  - `bytez_service.py` — Fallback OCR if Gemini fails
  - `community_service.py` — Anonymous price aggregation (opt-in)
- Depends on: External APIs (Gemini, Storj), database
- Used by: Orchestrator, main API routes

**Backend Orchestration Layer:**
- Purpose: Coordinates multi-step processing pipeline
- Location: `apps/api/core/orchestrator.py`
- Contains: `Orchestrator.process_file()` — MIME detection → preprocessing → extraction → DB save → S3 upload
- Depends on: Services layer, database manager
- Used by: Background tasks (`_run_extraction`)

**Backend Core/Configuration Layer:**
- Purpose: Centralized config, database management, migrations
- Location: `apps/api/core/`
- Contains:
  - `config.py` — Pydantic BaseSettings validation + Config facade
  - `db_manager.py` — asyncpg pool management, async queries, cursor pagination
- Depends on: Neon PostgreSQL, asyncpg
- Used by: All backend layers

**Frontend Pages/Routes Layer:**
- Purpose: Top-level routing and layout
- Location: `apps/pwa/src/App.jsx`
- Contains: Route definitions, page lazy loading, ProtectedRoute wrapper
- Depends on: React Router, feature modules
- Used by: Browser entry point (`src/main.jsx`)

**Frontend Features Layer:**
- Purpose: Self-contained feature modules (auth, scan, catalog, etc.)
- Location: `apps/pwa/src/features/`
- Contains:
  - `auth/` — LoginPage, RegisterPage, ProtectedRoute
  - `scan/` — ScanPage, batch upload, camera capture
  - `catalogue/` — Product listing, search, edit modal
  - `validation/` — User review before save
  - `history/` — Past invoices
  - `devis/` — Quote generation
  - `settings/` — User preferences, consent management
- Depends on: Shared library (apiClient, hooks), Zustand store
- Used by: App routes

**Frontend Shared Library Layer:**
- Purpose: Reusable utilities, API client, configuration
- Location: `apps/pwa/src/shared/`
- Contains:
  - `lib/apiClient.js` — Axios instance with retry logic + JWT cookie handling
  - `lib/imageService.js` — Image optimization (browser-side)
  - `lib/offlineQueue.js` — Local queue for offline operation
  - `config/api.js` — API_BASE_URL configuration
  - `config/features.js` — Feature flags (AUTH_REQUIRED, etc.)
  - `ui/` — Shared UI components (SkeletonCard, EmptyStateIllustration, etc.)
- Depends on: axios, browser APIs
- Used by: All feature modules

**Frontend Design System:**
- Purpose: Tokens, animations, and design constants
- Location: `apps/pwa/src/design-system/`
- Contains:
  - `tokens.js` — Colors, spacing, fonts
  - `animations.js` — Framer Motion presets
- Used by: Components, features

**Frontend State Management:**
- Purpose: Client-side state (current job, extracted products, batch queue)
- Location: `apps/pwa/src/store/useStore.js`
- Contains: Zustand store with persist + devtools middleware
- Depends on: Zustand, localStorage
- Used by: Features (scan, validation)

## Data Flow

**Invoice Processing Pipeline (Happy Path):**

1. **Upload** — Frontend sends file to `POST /api/v1/invoices/process`
2. **Job Creation** — Backend creates job record (status: "processing"), returns job_id immediately (202)
3. **Background Processing** — Runs `_run_extraction()` asynchronously:
   - MIME detection
   - Factur-X XML extraction (if PDF)
   - Fallback to Gemini AI extraction (image preprocessing if needed)
   - Fallback to Bytez API if Gemini fails
4. **Product Upsert** — Batch insert/update products in `produits` table (ON CONFLICT key: designation_raw + fournisseur + user_id)
5. **PDF Archival** — Upload file to Storj S3 in parallel with DB save
6. **Historique Logging** — Record extraction event (tokens used, cost, success/failure)
7. **Community Prices** — If user opted in, hash and insert into anonymous pricing table
8. **Job Status Update** — Mark job as "completed" or "error"

**Frontend Extraction Flow:**

1. User selects file(s) in ScanPage
2. Optional batch queue (multiple files)
3. On upload, display polling UI
4. Poll `GET /api/v1/invoices/status/{job_id}` (every 1-2s)
5. On completion, show extracted products for manual validation
6. User edits/removes products
7. Submit via `POST /api/v1/catalogue/batch` to save validated products

**Offline Queue Flow:**

1. User uploads while offline → added to local Zustand store + localStorage
2. `offlineQueue.js` persists state
3. When network returns, batch sync to backend

**Authentication Flow:**

1. User registers/logs in via `POST /api/v1/auth/register` or `POST /api/v1/auth/login`
2. Backend returns JWT in `docling-token` httpOnly cookie
3. Frontend apiClient automatically sends cookie (withCredentials: true)
4. All protected endpoints check token via `get_current_user` dependency
5. If 401, redirect to `/login`

**State Management Flow:**

1. Zustand store persisted to localStorage
2. Hooks (e.g., `useScanUpload`) manage component-level state
3. Batch queue stored in store with deduplication (name + size)
4. Products remain in store until save or manual clear

## Key Abstractions

**Orchestrator Pattern:**
- Purpose: Abstracts multi-step processing complexity
- Location: `apps/api/core/orchestrator.py`
- Pattern: Static async methods (`Orchestrator.process_file`)
- Handles: MIME detection, preprocessing, extraction strategy selection, error recovery

**GeminiService Singleton:**
- Purpose: Caches AI model instances to avoid repeated initialization
- Location: `apps/api/services/gemini_service.py`
- Pattern: `GeminiService.get_or_create(model_id)` returns cached instance per model
- Handles: API calls with timeout, token counting, structured output validation

**Circuit Breaker (`_GeminiCircuitBreaker`):**
- Purpose: Prevents cascading failures if AI API is down
- Location: `apps/api/main.py`
- Pattern: Track consecutive errors; open after N failures; cooldown 60s before retry
- Used by: `_run_extraction` — checks `is_open()` before processing

**DBManager Singleton:**
- Purpose: Single asyncpg pool + centralized query methods
- Location: `apps/api/core/db_manager.py`
- Pattern: `DBManager.get_pool()` returns singleton connection pool
- Methods: `upsert_products_batch()`, `get_catalogue()`, `get_job()`, etc.

**Config Facade:**
- Purpose: Unified environment variable access with validation
- Location: `apps/api/core/config.py`
- Pattern: Pydantic `_Settings` validated once at startup; `Config` class provides static access
- Prevents: Config changes mid-request, type mismatches

**Zustand Store with Persistence:**
- Purpose: Client-side state with localStorage sync
- Location: `apps/pwa/src/store/useStore.js`
- Pattern: `useDoclingStore()` hook returns state + setters
- Features: devtools middleware, persist to localStorage, middleware for sanitization

**apiClient Interceptor:**
- Purpose: Centralized HTTP handling (auth, retries, errors)
- Location: `apps/pwa/src/shared/lib/apiClient.js`
- Interceptors:
  - Request: Add `X-Requested-With` header
  - Response: Exponential backoff retry on 5xx/network errors (max 3)
  - Response: Redirect to login on 401

## Entry Points

**Backend:**
- Location: `apps/api/main.py`
- Triggers: uvicorn server start (`uvicorn main:app --host 0.0.0.0 --port 8000`)
- Responsibilities:
  - Load config + validate
  - Initialize database pool + run migrations
  - Start watchdog service (if enabled)
  - Register routes and middleware
  - Handle requests

**Frontend:**
- Location: `apps/pwa/src/main.jsx`
- Triggers: Vite dev server or built bundle
- Responsibilities:
  - Bootstrap React app
  - Initialize Zustand store
  - Render App component with routing
  - Load PWA service worker (if built)

## Error Handling

**Strategy:** Fail-safe with graceful degradation. Circuit breaker for AI APIs. User-friendly error messages.

**Patterns:**

**Backend:**
- `_sanitize_job_error()` — Map technical errors to user-safe messages (quota, timeout, invalid key)
- Circuit breaker trips after 5 consecutive Gemini failures; cools down 60s
- Fallback model: If primary model (e.g., Gemini 3.1 Pro) fails, retry with Gemini 2.5 Flash
- Fallback service: If Gemini fails on images, try Bytez API
- Job marked "error" with error message; user can retry
- Unhandled exceptions logged via Sentry (if SENTRY_DSN set)

**Frontend:**
- apiClient retries 5xx/network errors (exponential backoff, max 3 retries)
- 401 triggers redirect to login (ProtectedRoute)
- Toast notifications for errors (sonner library)
- Offline banner shown when network is down
- Batch queue persisted to localStorage; survives page reload

## Cross-Cutting Concerns

**Logging:**
- Backend: `logging` module, structured with request_id (uuid[:8])
- Logger: `"request_id=%s method=%s path=%s status_code=%s"` format
- Files: Stdout (production: Render logs)
- Frontend: Console logs (dev), error events to Sentry (production)

**Validation:**
- Backend: Pydantic schemas (`Product`, `BatchSaveRequest`)
- Auto-computes TVA (IVA 21%), normalizes famille, validates confidence
- Max 500 products per batch request (anti-DoS)
- Frontend: React hook form (if used), UI feedback

**Authentication:**
- Backend: JWT in httpOnly cookie `docling-token` (never localStorage)
- Token created via `create_token()` with Argon2id hash verification
- Expires: `JWT_EXPIRY_HOURS` (default 24h)
- Service keys: `X-Service-Key` header for Pronto integration
- Frontend: Cookie sent automatically via axios withCredentials

**Authorization:**
- Backend: `get_current_user()` dependency extracts and verifies token
- Admin-only endpoints: `get_admin_user()` dependency
- User isolation: All queries filtered by `user_id` (tenant model)
- Guest mode: If `FREE_ACCESS_MODE=true`, create single shared guest user

**Rate Limiting:**
- Backend: slowapi limiter on endpoints (e.g., `@limiter.limit("20/minute")`)
- Frontend: No client-side rate limiting (rely on backend + backoff)

**Security Headers:**
- Backend: X-Content-Type-Options, X-Frame-Options, CSP-like headers
- HTTPS-only in production: Strict-Transport-Security
- CORS: Only allow configured origins

---

*Architecture analysis: 2026-03-17*
