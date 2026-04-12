# Codebase Structure

**Analysis Date:** 2026-03-17

## Directory Layout

```
docling/
├── apps/
│   ├── api/                           # FastAPI backend (Python)
│   │   ├── main.py                    # Entry point: routes + middleware
│   │   ├── core/
│   │   │   ├── config.py              # Env validation + Config facade
│   │   │   ├── db_manager.py          # asyncpg pool + queries
│   │   │   ├── orchestrator.py        # Processing pipeline
│   │   │   └── test_*.py              # Unit tests
│   │   ├── services/
│   │   │   ├── gemini_service.py      # Gemini AI extraction
│   │   │   ├── auth_service.py        # JWT + password hashing
│   │   │   ├── storage_service.py     # S3/Storj uploads
│   │   │   ├── image_preprocessor.py  # OpenCV optimization
│   │   │   ├── facturx_extractor.py   # Factur-X XML parsing
│   │   │   ├── watchdog_service.py    # File system monitor
│   │   │   ├── bytez_service.py       # Fallback OCR API
│   │   │   ├── community_service.py   # Anonymous pricing
│   │   │   └── test_*.py              # Service tests
│   │   ├── schemas/
│   │   │   ├── invoice.py             # Pydantic schemas (Product, InvoiceExtractionResult)
│   │   │   └── test_invoice.py
│   │   ├── migrations/                # Alembic versions (a001–a008)
│   │   │   ├── versions/
│   │   │   │   ├── a001_initial.py
│   │   │   │   ├── a002_users_auth.py
│   │   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── serializers.py         # JSON serialization helpers
│   │   │   └── test_*.py
│   │   ├── tests/                     # Integration tests
│   │   ├── Docling_Factures/          # Watchdog folder (generated, not committed)
│   │   │   ├── Traitees/              # Successfully processed
│   │   │   └── Erreurs/               # Processing failures
│   │   ├── pyproject.toml             # uv dependencies + config
│   │   ├── alembic.ini                # Alembic config
│   │   ├── .venv/                     # Virtual env (not committed)
│   │   └── .env                       # Environment (not committed, see .env.example)
│   │
│   └── pwa/                           # React PWA (JavaScript/JSX)
│       ├── src/
│       │   ├── main.jsx               # App entry point
│       │   ├── App.jsx                # Root routing
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   │   ├── LoginPage.jsx
│       │   │   │   ├── RegisterPage.jsx
│       │   │   │   ├── ProtectedRoute.jsx
│       │   │   │   └── index.js
│       │   │   ├── scan/
│       │   │   │   ├── ScanPage.jsx
│       │   │   │   ├── components/
│       │   │   │   │   ├── UploadZone.jsx
│       │   │   │   │   ├── BatchQueue.jsx
│       │   │   │   │   └── JobStatusCard.jsx
│       │   │   │   ├── hooks/
│       │   │   │   │   ├── useScanUpload.js
│       │   │   │   │   └── useBatchQueue.js
│       │   │   │   └── __tests__/
│       │   │   ├── catalogue/
│       │   │   │   ├── CataloguePage.jsx
│       │   │   │   ├── CompareModal.jsx
│       │   │   │   ├── EditProductModal.jsx
│       │   │   │   └── __tests__/
│       │   │   ├── validation/
│       │   │   │   └── ValidationPage.jsx
│       │   │   ├── history/
│       │   │   │   └── HistoryPage.jsx
│       │   │   ├── devis/
│       │   │   │   ├── DevisPage.jsx
│       │   │   │   └── devisGenerator.js
│       │   │   └── settings/
│       │   │       └── SettingsPage.jsx
│       │   ├── components/
│       │   │   ├── Button.jsx
│       │   │   ├── Card.jsx
│       │   │   ├── Input.jsx
│       │   │   ├── Select.jsx
│       │   │   ├── Badge.jsx
│       │   │   ├── Navbar.jsx
│       │   │   ├── CommandPalette.jsx
│       │   │   ├── OfflineBanner.jsx
│       │   │   ├── PageTransition.jsx
│       │   │   ├── ScrollReveal.jsx
│       │   │   ├── MagneticButton.jsx
│       │   │   ├── SplineScene.jsx
│       │   │   ├── __tests__/
│       │   │   │   ├── Button.test.jsx
│       │   │   │   ├── Input.test.jsx
│       │   │   │   └── ...
│       │   ├── shared/
│       │   │   ├── lib/
│       │   │   │   ├── apiClient.js       # Axios with retry + auth
│       │   │   │   ├── imageService.js    # Browser image optimization
│       │   │   │   └── offlineQueue.js    # Local queue persistence
│       │   │   ├── config/
│       │   │   │   ├── api.js             # API_BASE_URL
│       │   │   │   └── features.js        # Feature flags
│       │   │   └── ui/
│       │   │       ├── SkeletonCard.jsx
│       │   │       ├── EmptyStateIllustration.jsx
│       │   │       └── ...
│       │   ├── store/
│       │   │   └── useStore.js            # Zustand + persist
│       │   ├── design-system/
│       │   │   ├── tokens.js              # Colors, spacing, fonts
│       │   │   └── animations.js          # Framer Motion presets
│       │   ├── constants/
│       │   │   └── categories.js          # Famille options, etc.
│       │   ├── utils/
│       │   │   └── __tests__/
│       │   └── __tests__/
│       ├── public/
│       │   ├── manifest.json              # PWA manifest
│       │   └── ...
│       ├── package.json                   # pnpm workspace + deps
│       ├── vite.config.js
│       ├── vitest.config.js               # Test runner
│       └── .env                           # Frontend env (not committed)
│
├── docs/                                  # Documentation
├── scripts/                               # Utility scripts (.ps1, .py)
├── PDF Test/                              # Test invoices (134 BIGMAT samples, not committed)
├── JOURNAL.md                             # Session log
├── CLAUDE.md                              # Project instructions
├── package.json                           # pnpm workspace root
└── .planning/
    └── codebase/                          # GSD documents (this location)
        ├── ARCHITECTURE.md
        ├── STRUCTURE.md
        ├── STACK.md
        ├── INTEGRATIONS.md
        ├── CONVENTIONS.md
        ├── TESTING.md
        └── CONCERNS.md
```

## Directory Purposes

**apps/api/**
- Purpose: FastAPI backend — all business logic, authentication, data persistence
- Contains: Python source code, migrations, configuration
- Key files: `main.py` (routes), `core/` (config/DB), `services/` (business logic)

**apps/api/core/**
- Purpose: Infrastructure and configuration
- Contains: Environment validation, database pool management, processing orchestration
- Key files: `config.py` (Pydantic settings), `db_manager.py` (asyncpg), `orchestrator.py` (pipeline)

**apps/api/services/**
- Purpose: Reusable business logic modules
- Contains: Extraction (Gemini, Bytez), auth (JWT), storage (S3), preprocessing (OpenCV), etc.
- Key files: Each service is a separate module with clear responsibility

**apps/api/schemas/**
- Purpose: Data validation and typing
- Contains: Pydantic models for request/response validation
- Key files: `invoice.py` (Product, InvoiceExtractionResult, BatchSaveRequest)

**apps/api/migrations/**
- Purpose: Database schema versioning
- Contains: Alembic migration files (a001–a008)
- Generated by: `alembic revision --autogenerate -m "description"`

**apps/pwa/**
- Purpose: React PWA frontend — user interface
- Contains: JavaScript/JSX, tests, configuration
- Key files: `main.jsx` (bootstrap), `App.jsx` (routing), feature modules

**apps/pwa/src/features/**
- Purpose: Self-contained feature modules
- Contains: Pages, components, hooks, tests organized by feature
- Structure: Each feature folder is independently testable

**apps/pwa/src/shared/**
- Purpose: Shared utilities and configuration
- Contains: API client, config, UI components, helpers
- Used by: All features (avoid duplication)

**apps/pwa/src/store/**
- Purpose: Global application state
- Contains: Zustand store with persist middleware
- Accessed by: Features via `useDoclingStore()` hook

## Key File Locations

**Entry Points:**
- Backend: `apps/api/main.py` — FastAPI app definition, routes, middleware
- Frontend: `apps/pwa/src/main.jsx` — React bootstrap
- Frontend: `apps/pwa/src/App.jsx` — Routing and layout

**Configuration:**
- Backend env: `apps/api/.env` (not committed, see .env.example)
- Backend config: `apps/api/core/config.py` — Pydantic validation
- Frontend env: `apps/pwa/.env` — API_BASE_URL, feature flags
- Workspace: `package.json` (root) — pnpm configuration

**Core Logic:**
- Invoice processing: `apps/api/core/orchestrator.py`
- Database: `apps/api/core/db_manager.py`
- AI extraction: `apps/api/services/gemini_service.py`
- Frontend state: `apps/pwa/src/store/useStore.js`
- API client: `apps/pwa/src/shared/lib/apiClient.js`

**Testing:**
- Backend unit tests: `apps/api/core/test_*.py`, `apps/api/services/test_*.py`
- Backend integration: `apps/api/tests/`
- Frontend unit: `apps/pwa/src/components/__tests__/`, `apps/pwa/src/features/**/__tests__/`
- Config: `apps/api/vitest.config.js`, `apps/api/pytest.ini` (not yet created)

## Naming Conventions

**Files:**
- Backend Python: `snake_case.py` (e.g., `gemini_service.py`, `db_manager.py`)
- Frontend JavaScript: `camelCase.js` for utilities, `PascalCase.jsx` for components
- Tests: `test_*.py` (backend) or `*.test.jsx` (frontend)
- Migration files: `a###_description.py` (Alembic)

**Directories:**
- Feature modules: `kebab-case` folder names (e.g., `scan/`, `catalogue/`, `auth/`)
- Feature subfolders: `components/`, `hooks/`, `__tests__/`, `utils/` (consistent structure)
- Service layer: `services/` (backend only)
- Shared code: `shared/` with clear subfolders (`lib/`, `config/`, `ui/`)

**Functions:**
- Backend: `snake_case` (async and sync)
- Frontend: `camelCase` for utilities, `PascalCase` for components
- Hooks: `use*` prefix (e.g., `useScanUpload`, `useDoclingStore`)
- Private functions: `_leading_underscore` (both languages)

**Variables:**
- Backend: `snake_case` for all variables
- Frontend: `camelCase` for all variables except constants
- Constants: `UPPER_SNAKE_CASE` (both languages)
- React state: Descriptive names with `set*` prefix for setters

## Where to Add New Code

**New Feature (Frontend):**
- Create folder: `apps/pwa/src/features/{feature-name}/`
- Primary code: `apps/pwa/src/features/{feature-name}/{FeatureName}Page.jsx`
- Sub-components: `apps/pwa/src/features/{feature-name}/components/{Component}.jsx`
- Custom hooks: `apps/pwa/src/features/{feature-name}/hooks/use{Name}.js`
- Tests: `apps/pwa/src/features/{feature-name}/__tests__/`
- Route: Register in `apps/pwa/src/App.jsx`

**New Backend Endpoint:**
- Add to: `apps/api/main.py` (as route handler)
- Business logic: Extract to `apps/api/services/{service_name}.py` if reusable
- Schema: Add Pydantic model to `apps/api/schemas/invoice.py` or new schema file
- Database query: Add method to `DBManager` in `apps/api/core/db_manager.py`

**New Service Module:**
- Create: `apps/api/services/{service_name}.py`
- Export: Main class/function from module
- Tests: `apps/api/services/test_{service_name}.py`
- Used by: Orchestrator or routes

**New Shared Component (Frontend):**
- Components: `apps/pwa/src/components/{Component}.jsx`
- Utilities: `apps/pwa/src/shared/lib/{utility}.js`
- Test: `apps/pwa/src/components/__tests__/{Component}.test.jsx`

**New Database Table:**
- Create migration: `alembic revision --autogenerate -m "Add table_name"`
- Add query method: `DBManager.{method_name}()`
- Schema doc: Update `docs/DATABASE.md` if exists

## Special Directories

**apps/api/Docling_Factures/**
- Purpose: Watchdog monitoring folder (auto-created on startup)
- Generated: Yes (created by `watchdog_service.py` if WATCHDOG_ENABLED=true)
- Committed: No (in .gitignore)
- Structure:
  - `Docling_Factures/` — Pending files
  - `Docling_Factures/Traitees/` — Successfully processed
  - `Docling_Factures/Erreurs/` — Processing failures

**apps/api/migrations/versions/**
- Purpose: Database schema versions (Alembic)
- Generated: By `alembic revision` command
- Committed: Yes
- Pattern: Files numbered a001, a002, etc. with auto-generated forward/backward logic

**apps/api/.venv/**
- Purpose: Python virtual environment
- Generated: By `uv sync`
- Committed: No (in .gitignore)

**apps/pwa/node_modules/**
- Purpose: NPM dependencies
- Generated: By `pnpm install`
- Committed: No (in .gitignore)

**PDF Test/**
- Purpose: Real invoices for testing (134 BIGMAT samples)
- Generated: No (committed test data)
- Committed: No (in .gitignore, ~50MB+ size)
- Usage: Local testing only, never deployed

**docs/**
- Purpose: Project documentation (README, API docs, guides)
- Examples: `DATABASE.md`, `DEPLOYMENT.md`, etc.
- Committed: Yes

---

*Structure analysis: 2026-03-17*
