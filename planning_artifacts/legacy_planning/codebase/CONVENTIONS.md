# Coding Conventions

**Analysis Date:** 2026-03-17

## Naming Patterns

**Files:**
- Python backend: `snake_case.py` (e.g., `auth_service.py`, `db_manager.py`)
- React components: PascalCase `.jsx` (e.g., `LoginPage.jsx`, `Button.jsx`)
- Test files: `test_*.py` (backend) or `*.test.jsx`/`*.spec.jsx` (frontend)
- Utilities/helpers: `camelCase.js` (e.g., `apiClient.js`, `imageService.js`, `offlineQueue.js`)
- Configuration: `snake_case.py` or `camelCase.js` (e.g., `config.py`, `api.js`)

**Functions:**
- Python: `snake_case` (e.g., `_safe_float()`, `_escape_like()`, `create_token()`, `verify_token()`)
- Private/internal Python functions: prefix with `_` (e.g., `_get_jwt_secret()`, `_parse_date()`)
- JavaScript/React: `camelCase` (e.g., `validateEmail()`, `sanitizeForKey()`, `setJobStart()`)
- Async functions: follow same convention + `async` keyword (Python: `async def`, JS: `async function`)

**Variables:**
- Constants: `SCREAMING_SNAKE_CASE` (Python: `JWT_ALGORITHM`, `JWT_EXPIRY`, `COST_PER_MILLION`)
- Constants: `SCREAMING_SNAKE_CASE` (JavaScript: `ALLOWED_MODEL_IDS`, `AI_MODELS`, `FAMILLES_VALIDES`)
- Regular variables: `camelCase` (JavaScript) or `snake_case` (Python)
- Zustand store state: `camelCase` (e.g., `selectedModel`, `extractedProducts`, `currentJob`)

**Types/Schemas:**
- Pydantic classes: `PascalCase` (e.g., `Product`, `InvoiceExtractionResult`, `BatchSaveRequest`, `_Settings`)
- Python type hints: use modern syntax (e.g., `str | None` not `Optional[str]`, `list[Product]` not `List[Product]`)
- Enums/constants: `SCREAMING_SNAKE_CASE` for values (e.g., `"gemini-3-flash-preview"`)

**Classes (Python):**
- Public classes: `PascalCase` (e.g., `GeminiService`, `DBManager`, `Orchestrator`)
- Settings/Config: `PascalCase` with leading `_` for internal (e.g., `_Settings` in `core/config.py`)
- Methods: `snake_case` with `self` (e.g., `def get_or_create()`, `@classmethod`, `@property`)

## Code Style

**Formatting:**
- JavaScript/JSX: Prettier with `semi: false`, `singleQuote: true`, `tabWidth: 2`
- Python: Ruff with `line-length: 100`, target version `py311`
- No trailing semicolons in JavaScript
- Single quotes for strings (JavaScript)

**Linting:**
- JavaScript: ESLint with `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- ESLint rules: unused vars ignored if matching `^[A-Z_]|motion` or args matching `^_`, no enforcement of `var`
- Python: Ruff lint rules `E F W I N B UP` (errors, formatting, warnings, imports, naming, bugs, upgrades)
- Python ignores: `E501` (line length handled by formatter), `B008` (mutable default args in FastAPI)

**Comments:**
- Python docstrings: use `"""..."""` immediately after function/class definition
- Module docstrings: include purpose and key info (see `auth_service.py`, `gemini_service.py`)
- Inline comments: explain "why", not "what" — use for non-obvious logic
- Block separators: Python uses `# ─── Section Name ──────` style (see `main.py`)

**Imports:**

**Python:**
1. Standard library (e.g., `asyncio`, `json`, `logging`, `os`, `time`)
2. Third-party (e.g., `fastapi`, `asyncpg`, `pydantic`, `google.genai`)
3. Local imports (e.g., `from core.config import Config`, `from services.auth_service import create_token`)
- Absolute imports only (no relative imports with `.` or `..`)
- Type hints at module level: `from typing import Any`, `dict[str, str]` (Python 3.11+)

**JavaScript:**
1. React/core libraries (e.g., `import { useState } from 'react'`)
2. Third-party (e.g., `import { toast } from 'sonner'`, `import { create } from 'zustand'`)
3. Local absolute imports with `@/` alias (e.g., `import Button from '@/components/Button'`)
4. Path aliases defined in `vite.config.js`: `@/` → `./src`, `@/shared/` → `./src/shared`, `@/features/` → `./src/features`

## Error Handling

**Python:**
- Use try/except for known error cases (e.g., JWT decode, password verification, JSON parsing)
- Catch specific exceptions: `except VerifyMismatchError:`, `except jwt.ExpiredSignatureError:`, `except json.JSONDecodeError:`
- Log at `logger.debug()` for expected failures (invalid tokens, wrong passwords)
- Log at `logger.warning()` for service issues (Gemini timeouts, database errors)
- FastAPI HTTPException for client errors: `raise HTTPException(status_code=401, detail="message")`
- Use pydantic validators to catch data issues: `@field_validator()`, `@model_validator(mode="after")`

**JavaScript:**
- Async operations: use try/catch in event handlers and hooks
- Fallback to error response: `err.response?.data?.detail || err.message || 'default message'`
- Toast notifications for user feedback: `toast.error(message)`, `toast.success(message)` (via sonner)
- Component error: use ErrorBoundary for fallback UI (located at `src/shared/ui/ErrorBoundary.jsx`)

## Validation

**Python (Pydantic):**
- Define validation in model classes using `@field_validator()` and `@model_validator(mode="after")`
- Normalize data: `famille` field defaults to `"Autre"` if invalid (see `Product` schema)
- Auto-compute derived fields: `prix_ttc_iva21 = prix_remise_ht * 1.21` (see `invoice.py`)
- Set confidence to `"low"` when data quality is uncertain (zero prices, > 2% arithmetic error)
- Enforce max limits: batch requests capped at 500 products (anti-DoS)

**JavaScript:**
- Simple regex validators in handlers: `validateEmail()`, `validatePassword()` in `LoginPage.jsx`
- Sanitize user input for keys: `sanitizeForKey()` in store prevents injection (see `useStore.js`)
- FormData for multipart: `new FormData()` for file uploads and form submissions
- Whitelist model IDs: `ALLOWED_MODEL_IDS` set prevents invalid selections (see `useStore.js`)

## Logging

**Framework:** Python uses `logging` stdlib, JavaScript uses `console` (no custom logger)

**Python:**
- Get logger: `logger = logging.getLogger(__name__)` at module level
- Levels: `debug()` for detailed flow, `info()` for milestones, `warning()` for issues, `error()` for failures
- Contextual logging: include user_id, request_id where relevant
- Example: `logger.debug("Token invalide ou payload malformé")` (in `verify_token()`)

**JavaScript:**
- No structured logger (uses toast for user feedback)
- Log API errors to console: `console.error()` in catch blocks if needed
- Sentry integration (optional): `VITE_SENTRY_DSN` env var configures error reporting

## Function Design

**Size:**
- Python functions: keep under 50 lines for readability
- Large operations split into private helpers (e.g., `_safe_float()`, `_escape_like()`, `_verify_pbkdf2()`)
- JavaScript components: use custom hooks for complex state logic

**Parameters:**
- Python: use type hints for all parameters (e.g., `def create_token(user_id: int, email: str, role: str = "user") -> str:`)
- JavaScript: optional JSDoc for complex components, use destructuring for props
- Default values: Python function signature (e.g., `role: str = "user"`)
- JavaScript: destructuring with defaults (e.g., `const { variant = 'primary', disabled = false } = props`)

**Return Values:**
- Python: explicit return type hints (e.g., `-> dict | None:`, `-> tuple[bool, str]:`, `-> list[Product]:`)
- JavaScript: return JSX components from React functions, return promises from async handlers
- Pydantic models: automatically serialize to JSON via FastAPI response

## Module Design

**Exports:**

**Python:**
- All public functions/classes defined at module level (no excessive nesting)
- Use `if __name__ == "__main__":` for CLI entry points (if applicable)
- Service classes like `GeminiService`, `DBManager` expose public methods
- Private helpers prefixed with `_` are not exported

**JavaScript:**
- React components: `export default` single component per file
- Utilities/helpers: `export` named functions (e.g., `export function validateEmail()`)
- Zustand store: `export const useDoclingStore = create(...)`
- Index files: used for cleaner imports (e.g., `src/features/auth/index.js`)

**Barrel Files:**
- Used in `src/features/auth/index.js` to group exports
- Not overused — direct imports preferred in most cases

**Module Structure:**
- Backend: `services/` for business logic, `core/` for config/db, `schemas/` for Pydantic models, `utils/` for helpers
- Frontend: `components/` for UI, `features/` for feature modules, `shared/` for common code, `store/` for Zustand, `utils/` for helpers
- Keep modules focused on single responsibility

## Configuration & Environment

**Pydantic Settings:**
- Central config in `core/config.py` using `pydantic_settings.BaseSettings`
- Load from `.env` file at app startup
- Validate all required vars: `JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`
- Fail fast on invalid config with clear error messages (see `validate_startup()`)
- Props accessed as class attributes: `Config.GEMINI_API_KEY`, `Config.DEFAULT_MODEL`

**JavaScript Config:**
- API endpoints: `src/shared/config/api.js` with `ENDPOINTS` dict
- Feature flags: `src/shared/config/features.js`
- Environment variables: `import.meta.env.VITE_*` (Vite convention)
- Build-time defines: set in `vite.config.js` (e.g., `VITE_API_URL`, `VITE_AUTH_REQUIRED`)

---

*Convention analysis: 2026-03-17*
