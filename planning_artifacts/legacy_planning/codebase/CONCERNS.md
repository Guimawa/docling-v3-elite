# Codebase Concerns

**Analysis Date:** 2026-03-17

## Tech Debt

### God Modules — Backend

**Area:** `apps/api/main.py` (906 lines) + `apps/api/core/db_manager.py` (744 lines)

- **Issue:** All endpoints, middleware, auth logic, circuit breaker, and error handling crammed into a single file. Database operations not separated by domain. Makes testing, refactoring, and maintenance extremely difficult. Violates Single Responsibility Principle.

- **Files:** `apps/api/main.py`, `apps/api/core/db_manager.py`

- **Impact:**
  - Cannot test routes in isolation
  - Adding new endpoints requires modifying the monolithic file
  - Circular dependencies impossible to avoid
  - Error handling logic is tightly coupled

- **Fix approach:**
  - Refactor `main.py` → `routers/` (invoices.py, catalogue.py, auth.py, community.py, export.py, health.py)
  - Refactor `db_manager.py` → `repositories/` (product_repo.py, facture_repo.py, job_repo.py, user_repo.py, community_repo.py)
  - Extract `circuit_breaker.py`, `error_sanitizer.py` as reusable modules
  - Plan de refactor : extraire progressivement depuis `apps/api/main.py` et `db_manager.py` (voir sections ci-dessous)

---

### Misplaced Code — Backend

**Area:** Utility functions and classes scattered in `main.py`

- **Issue:** Helper functions are defined in the middle of route handlers instead of proper modules:
  - `_GeminiCircuitBreaker` (line 137) — should be in `core/circuit_breaker.py`
  - `_set_auth_cookie()` (line 753) — should be in `services/auth_service.py`
  - `_sanitize_job_error()` (line 176) — should be in `utils/errors.py`

- **Files:** `apps/api/main.py`

- **Impact:** Hard to locate and reuse utilities across modules

- **Fix approach:** Create proper module structure with dedicated files for circuit breaker, error handling, and shared utilities.

---

### Tests Colocated with Source — Backend

**Area:** Test files in `core/`, `services/`, `schemas/` directories

> 🟡 **Partiellement résolu (2026-03-27)** : `test_auth_service.py` déplacé vers `tests/unit/`. Les fichiers `core/test_*.py`, `services/test_gemini_service.py`, `services/test_image_preprocessor.py`, `schemas/test_invoice.py` restent colocalisés.

- **Issue:** Test files are shipped with production code in Docker container:
  - `core/test_*.py` (7 files)
  - `services/test_*.py` (2 files restants)
  - `schemas/test_*.py` (1 file)

- **Files:** `apps/api/core/test_*.py`, `apps/api/services/test_*.py`, `apps/api/schemas/test_*.py`

- **Impact:** Risk of accidental import of test code in production. Pollutes source tree. Increases container size.

- **Fix approach:** Continuer la migration vers `apps/api/tests/unit/` avec structure miroir.

---

### Component Structure Inconsistency — Frontend

**Area:** Two locations for reusable components

- **Issue:** Components scattered across `src/components/` (16 components) and `src/shared/ui/` (3 components). Confusion about where to add new UI components.

- **Files:** `apps/pwa/src/components/`, `apps/pwa/src/shared/ui/`

- **Impact:** Inconsistent organization. Developers unsure where to place new components.

- **Fix approach:** Consolidate into single `components/` directory with subsections:
  ```
  components/
    ui/         → Button, Card, Input, Select, Badge, Modal
    layout/     → Navbar, PageTransition
    feedback/   → EmptyState, ErrorBoundary, SkeletonCard
    effects/    → MagneticButton, ScrollReveal, SplineScene
  ```

---

### Large Feature Modules — Frontend

**Area:** Monolithic feature pages

- **Issue:** Some features are too large (>20KB each):
  - `CataloguePage.jsx` — 25KB (~700 lines)
  - `SettingsPage.jsx` — 20KB
  - `DevisPage.jsx` — 15KB
  - `ValidationPage.jsx` — 12KB

These should be broken down into smaller sub-components for maintainability.

- **Files:** `apps/pwa/src/features/catalogue/CataloguePage.jsx`, `apps/pwa/src/features/settings/SettingsPage.jsx`

- **Impact:** Difficult to understand, test, and modify large pages. No isolated sub-components to reuse.

- **Fix approach:** Extract modals, cards, filters into separate `components/` subdirectory per feature. Create custom hooks for complex logic.

---

## Known Bugs

### Password Validation Mismatch — Frontend

**Description:** `LoginPage` and `RegisterPage` have inconsistent password validation logic

- **Files:**
  - `apps/pwa/src/features/auth/LoginPage.jsx:11`
  - `apps/pwa/src/features/auth/RegisterPage.jsx:12`

- **Symptoms:**
  - `LoginPage` only checks length: `(password || '').length >= 8`
  - `RegisterPage` checks length + uppercase + digit: `p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p)`
  - Toast message in `LoginPage` claims "8 char min, 1 uppercase, 1 digit" but validation doesn't enforce this

- **Trigger:** Try logging in with password containing only lowercase letters (e.g., "password123" passes but shouldn't)

- **Workaround:** None — weak passwords are accepted

- **Fix approach:** Unify validation in both pages. Extract to `shared/lib/validators.js`. Apply same rules everywhere.

---

### React Not Imported in breakpoints.js

**Description:** Hook uses `React.useState` and `React.useEffect` without importing React

- **Files:** `apps/pwa/src/design-system/breakpoints.js:10-15`

- **Symptoms:** Would crash with `ReferenceError: React is not defined` if code were executed

- **Impact:** Currently 0 because file is dead code (0 imports). Dangerous if reused.

- **Fix approach:** Delete this dead file entirely (see Dead Code section). If kept, add `import React from 'react'`.

---

### localStorage JWT Fallback Still Referenced in Tests

**Description:** Tests reference JWT retrieval from localStorage, but this code path was removed as XSS vulnerability

- **Files:** `apps/pwa/src/__tests__/apiClient.test.js:34-90`

- **Symptoms:** Tests pass but validate removed security practice. Risk: Developer may reintroduce localStorage JWT to "make tests pass"

- **Trigger:** Misreading test expectations

- **Workaround:** None — tests need rewriting

- **Fix approach:** Remove all tests that mock localStorage JWT. Add test explicitly verifying JWT is never read from localStorage.

---

### Magnetic Button isHovered State Unused

**Description:** State variable declared but never read in component

- **Files:** `apps/pwa/src/components/effects/MagneticButton.jsx:30`

- **Symptoms:** Dead state: `const [isHovered, setIsHovered] = useState(false)` — never used in JSX

- **Impact:** Unnecessary re-renders on hover even though state not consumed

- **Fix approach:** Delete the unused `isHovered` and `setIsHovered`.

---

## Security Considerations

### FREE_ACCESS_MODE Bypass in Production

**Risk:** Guest authentication mode accidentally enabled in production bypasses all auth

- **Files:** `apps/api/core/config.py:43`, `apps/api/main.py:113-115`

- **Current mitigation:** Configuration validation at startup

- **Recommendations:**
  - Add explicit check: if `ENVIRONMENT == "production"` and `FREE_ACCESS_MODE == true`, raise fatal error
  - Document that this mode is for development/testing only
  - Never ship production `.env` with `FREE_ACCESS_MODE=true`

**Status:** ✅ Partially addressed in JOURNAL (Phase 4), needs validation in code

---

### CSP Header Allows `unsafe-eval`

**Risk:** Content-Security-Policy in `index.html` includes `'unsafe-eval'` and `'unsafe-inline'`, completely bypassing XSS protection

- **Files:** `apps/pwa/index.html:8`

- **Current mitigation:** None — CSP is essentially non-functional

- **Recommendations:**
  - Remove `'unsafe-eval'` and `'unsafe-inline'` from CSP
  - Implement nonce-based CSP or use Vite CSP plugin (`vite-plugin-csp`)
  - Add `frame-ancestors 'none'` via backend header (not just meta tag)

---

### Service Key Auth Without Timing-Safe Comparison

**Risk:** Service key compared with Python `set in` operator instead of constant-time comparison

- **Files:** `apps/api/main.py:94-98`

- **Current mitigation:** None

- **Recommendations:**
  - Use `hmac.compare_digest()` for all secret comparisons
  - Enforce minimum key length (32+ characters)
  - Apply rate limiting on `X-Service-Key` requests

---

### Presigned URL Expiration Too Long (1 hour)

**Risk:** S3 presigned URLs valid for 3600 seconds allows wide window for token theft/misuse

- **Files:** `apps/api/services/storage_service.py:92`

- **Current mitigation:** HTTPOnly cookies for user auth (different from presigned URLs)

- **Recommendations:**
  - Reduce expiration to 300-600 seconds (5-10 minutes)
  - Add request signing with timestamp validation

---

### No CSRF Double-Submit Protection

**Risk:** Backend uses `SameSite=Lax` + `httpOnly` but doesn't verify `X-Requested-With` header for mutations

- **Files:** `apps/api/main.py:245-251`

- **Current mitigation:** `SameSite=Lax` provides partial protection (only for same-site POST)

- **Recommendations:**
  - Implement double-submit cookie pattern or
  - Verify `X-Requested-With: XMLHttpRequest` header on all state-changing endpoints

---

### No Magic Bytes Validation on File Upload

**Risk:** File MIME type validated by client-declared extension, not actual content

- **Files:** `apps/api/main.py:332-337`

- **Current mitigation:** Extension and MIME whitelist

- **Recommendations:**
  - Check magic bytes (first few bytes) of uploaded files:
    - PDF: `%PDF`
    - JPEG: `\xff\xd8\xff`
    - PNG: `\x89PNG`
  - This prevents disguised executable files

---

### No Account Lockout After Failed Login

**Risk:** Rate limiting at 5/minute but no per-email lockout after N failures

- **Files:** `apps/api/main.py` (auth endpoint)

- **Current mitigation:** Slowapi rate limiting (5 attempts per minute)

- **Recommendations:**
  - Add counter in database for failed login attempts per email
  - Lock account temporarily after 10-15 failures
  - Send warning email to user

---

### Community Price Salt Not Enforced

**Risk:** `COMMUNITY_SALT` has hardcoded fallback "docling-default-salt" allowing rainbow tables

- **Files:** `apps/api/services/community_service.py:35`

- **Current mitigation:** None

- **Recommendations:**
  - Make `COMMUNITY_SALT` mandatory environment variable when community features enabled
  - Validate salt length >= 32 characters

---

### Watchdog Processing Without User ID

**Risk:** File watchdog processes uploads with `user_id=None`, creating orphaned data

- **Files:** `apps/api/services/watchdog_service.py:65-69`

- **Current mitigation:** None

- **Recommendations:**
  - Associate watchdog with dedicated service account (admin user or bot user)
  - Always set `user_id` for all operations

---

### Stack Traces Logged with `exc_info=True` in Production

**Risk:** Error logs expose internal paths and code structure to attackers

- **Files:** `apps/api/main.py` (multiple endpoints)

- **Current mitigation:** Error messages sanitized before returning to client

- **Recommendations:**
  - Use `exc_info=False` for expected errors
  - Use `exc_info=True` only for unexpected errors with sanitized logging

---

## Performance Bottlenecks

### N+1 Query Pattern Resolved but Code Duplication Remains

**Problem:** Community price comparison queries partially fixed by batch insert. But `compare_prices()` and `compare_prices_with_history()` in `db_manager.py` share 30 lines of identical SQL

- **Files:** `apps/api/core/db_manager.py:613`, `apps/api/core/db_manager.py:661`

- **Cause:** Copy-paste of base query logic with slight variations

- **Improvement path:**
  - Extract shared query builder: `_compare_products_query()`
  - Both methods call shared method and add their own joins/filters
  - Reduces maintenance and chance of query inconsistency

---

### Spline 3D Scene Extremely Heavy (3-5 MB)

**Problem:** `@splinetool/react-spline` adds 3-5 MB to bundle for decorative 3D elements (lazy loaded)

- **Files:** `apps/pwa/src/components/effects/SplineScene.jsx`

- **Cause:** Full WebGL 3D runtime included in bundle

- **Impact:** Significant mobile performance penalty

- **Improvement path:**
  - Evaluate if 3D visuals justify 3-5 MB cost on mobile
  - If removed: saves massive bundle size
  - If kept: ensure lazy loading works on slow networks

---

### Excel Export Library Large (300 KB)

**Problem:** `exceljs` (~300 KB) used for single CSV/Excel export feature

- **Files:** `apps/pwa/src/features/catalogue/CataloguePage.jsx` (export logic)

- **Cause:** Feature-complete Excel library for occasional export

- **Impact:** Adds 300 KB to production bundle

- **Improvement path:**
  - Consider `SheetJS` (~150 KB) or `xlsx` (~100 KB) as lightweight alternatives
  - Or generate CSV entirely in backend and stream download (0 KB client-side)

---

### Large Request Payloads for Batch Operations

**Problem:** `BatchSaveRequest.produits` accepts unbounded `list[dict]` without validation depth

- **Files:** `apps/api/schemas/invoice.py:70-87`

- **Cause:** Generic `dict` instead of Pydantic schema with field validation

- **Impact:** No size/depth limits on product lists. Could cause OOM on server.

- **Improvement path:**
  - Use `list[Product]` with Pydantic validation
  - Add `max_items` constraint
  - Validate each product field individually

---

## Scaling Limits

### JWT Duration Not Optimized (24 hours with no refresh)

**Problem:** JWT tokens valid for 24 hours with no refresh token mechanism

- **Files:** `apps/api/services/auth_service.py:29-30`

- **Current capacity:** Works fine for small user bases. Long TTL means:
  - Compromised tokens valid for extended period
  - Can't invalidate sessions immediately
  - No gradual rotation strategy

- **Scaling path:**
  - Reduce JWT expiry to 1-4 hours
  - Implement refresh token in httpOnly cookie
  - Consider RS256 instead of HS256 for key rotation

---

### Request ID Truncated to 8 Characters

**Problem:** UUID truncated to 8 chars = 32 bits max = collision possible after ~65K requests

- **Files:** `apps/api/main.py:273`

- **Current capacity:** OK for low-volume. Breaks at scale.

- **Scaling path:**
  - Use 12-16 character UUID minimum
  - Or use full 36-char UUID with compression if needed

---

### Database Connection Pool Not Explicitly Configured

**Problem:** AsyncPG pool created without explicit size limits or queuing

- **Files:** `apps/api/core/db_manager.py` (pool initialization)

- **Current capacity:** Default pool size works for single-machine deployment

- **Scaling path:**
  - Add explicit `min_size`, `max_size` configuration
  - Implement connection pool monitoring
  - Add queue timeout and circuit breaker if pool exhausted

---

## Fragile Areas

### Image Preprocessing Pipeline

**Files:** `apps/api/services/image_preprocessor.py`

- **Why fragile:**
  - OpenCV preprocessing (rotation, contrast, skew correction) depends on image quality
  - No graceful fallback if preprocessing fails
  - PDF image extraction relies on `PyPDF2`-like library which may struggle with complex PDFs

- **Safe modification:**
  - Add comprehensive error handling with specific exception types
  - Log preprocessing failures separately for debugging
  - Test with problematic PDFs from real invoices

- **Test coverage:**
  - No dedicated tests for edge cases (rotated PDFs, multi-page, grayscale)
  - Current test: basic functionality only

---

### Gemini AI Extraction with Fallback Chain

**Files:** `apps/api/main.py:384-430` (orchestrator), `apps/api/services/bytez_service.py`

- **Why fragile:**
  - Fallback models silently swallow exceptions (line 418: `except Exception: pass`)
  - No timeout on Gemini API calls
  - Circuit breaker triggers at 5 consecutive errors but no exponential backoff

- **Safe modification:**
  - Always log fallback errors with model name
  - Add strict timeouts on each API call
  - Distinguish timeout vs. validation vs. rate limit errors

- **Test coverage:**
  - No E2E tests for multi-model fallback chain
  - No integration tests with real Gemini API
  - Current test: mocked responses only

---

### Community Price Aggregation

**Files:** `apps/api/services/community_service.py`, `apps/api/core/db_manager.py:580-700`

- **Why fragile:**
  - Complex hashing logic for anonymization (designation + fournisseur)
  - No validation that hashes are stable (if hash function changes, historical data breaks)
  - Batch operations assume all products have required fields

- **Safe modification:**
  - Add hash validation test
  - Document that hash function is canonical (never change)
  - Pre-validate all products before batch operation

- **Test coverage:**
  - No tests for hash collisions or stability
  - No boundary tests (empty designation, special characters)

---

### PDF/Image Upload and Virus Scanning

**Files:** `apps/api/main.py:332-380` (upload endpoint), `apps/api/services/storage_service.py`

- **Why fragile:**
  - No antivirus scanning (Clam AV not integrated)
  - File stored in S3 before validation complete
  - No quarantine zone for suspicious files

- **Safe modification:**
  - Scan file before S3 upload
  - Store in quarantine bucket initially
  - Move to user bucket only after validation passes

- **Test coverage:**
  - No malware/virus tests
  - No large file (>50MB) edge case tests

---

### Authentication Cookie Rotation

**Files:** `apps/api/main.py:753` (`_set_auth_cookie`), `apps/api/services/auth_service.py`

- **Why fragile:**
  - No automatic cookie rotation on sensitive operations
  - No "remember device" vs "force reauth" distinction
  - No session invalidation (logout doesn't blacklist old cookies)

- **Safe modification:**
  - Keep session metadata (issue time, IP, device fingerprint)
  - Invalidate all sessions on password change
  - Require re-auth for sensitive operations (export, change email)

- **Test coverage:**
  - No tests for concurrent sessions
  - No tests for cookie expiry edge cases

---

## Dependencies at Risk

### Tailwind CSS Version Lag (v3.4 when v4 available)

**Risk:** Major version difference from latest

- **Files:** `apps/pwa/package.json`

- **Impact:** Missing new features in v4 (CSS variables, improved performance). Takes effort to migrate.

- **Migration plan:**
  - Test v4 in feature branch
  - Update configuration (breaking changes in v4)
  - Verify no visual regressions
  - Update all Tailwind directives if needed

---

### Vite 5 When Version 8 Available (3 major versions behind)

**Risk:** Extremely outdated build tool. Missing performance improvements, security fixes, and plugin ecosystem updates.

- **Files:** `apps/pwa/package.json`

- **Impact:**
  - Build performance degraded vs v8
  - Plugin compatibility issues
  - Security vulnerabilities in Vite itself or plugins

- **Migration plan:**
  - Major undertaking: v5→6→7→8 involves breaking changes
  - Test build in isolated branch
  - Verify all plugins compatible with v8
  - Check Vite plugin ecosystems for breaking changes

---

### PyJWT CVE-2026-32597 (Fixed in 2.12.0)

**Risk:** Authentication library with known vulnerability

- **Files:** `apps/api/pyproject.toml` (currently >=2.10, needs >=2.12)

- **Current mitigation:** Pinned to version that supposedly has fix

- **Migration plan:**
  - Verify fix actually in 2.12.0
  - Update requirement
  - Run full test suite to ensure no breaking changes

---

### python-multipart CVE-2024-53981, CVE-2026-24486 (Fixed in 0.0.22)

**Risk:** File upload parsing library with vulnerabilities

- **Files:** `apps/api/pyproject.toml` (currently >=0.0.12, needs >=0.0.22)

- **Current mitigation:** Required by FastAPI for UploadFile handling

- **Migration plan:**
  - Update requirement to >=0.0.22
  - Test all upload endpoints
  - Verify no regressions with large files

---

### aiohttp in Dev Dependencies (8 CVE, 0 imports)

**Risk:** Unused package with 8 security vulnerabilities pulling in transitive deps with CVEs

- **Files:** `apps/api/pyproject.toml` (dev dependency)

- **Impact:** Container build includes unnecessary vulnerabilities

- **Migration plan:**
  - Simply remove from `pyproject.toml`
  - Verify no hidden imports
  - Run full test suite

---

### @splinetool (3-5 MB decorative library)

**Risk:** Large 3D rendering library for decorative elements may not justify bundle size

- **Files:** `apps/pwa/package.json`, `apps/pwa/src/components/effects/SplineScene.jsx`

- **Impact:** Adds 3-5 MB to production bundle. Lazy loaded but still significant on mobile.

- **Migration plan:**
  - If removing: Delete component and imports. Review UI without 3D effects.
  - If keeping: Ensure aggressive tree-shaking. Monitor bundle size.
  - Alternative: Use lightweight 3D library or SVG animations.

---

## Missing Critical Features

### End-to-End Tests for Production Readiness

**Problem:** No E2E tests for critical user journeys

- **What's missing:**
  - Login → Upload PDF → Extract → Validate → Export flow
  - Community price aggregation and comparison
  - PDF archival and retrieval from Storj S3
  - Offline PWA functionality
  - Error scenarios (network failure, malformed PDF, API timeout)

- **Blocks:** Cannot confidently deploy to production

- **Fix approach:**
  - Add `tests/e2e/` with Playwright
  - Test critical paths: auth, upload, export
  - Test error scenarios and edge cases
  - ~4-8 hours effort

---

### CSRF Token-Based Protection (Complement SameSite)

**Problem:** Only relies on `SameSite=Lax` cookie attribute

- **What's missing:**
  - CSRF tokens in forms/API requests
  - Token validation on backend for mutations

- **Blocks:** Defense-in-depth incomplete. If browser SameSite handling broken, app vulnerable.

- **Fix approach:**
  - Generate CSRF token on page load
  - Include in headers: `X-CSRF-Token`
  - Backend validates before state changes
  - ~2-3 hours effort

---

### Refresh Token Mechanism

**Problem:** JWT valid for full 24 hours. No way to force logout or reduce compromise window.

- **What's missing:**
  - Short-lived access token (1-4h) + longer-lived refresh token
  - Refresh token rotation on each use
  - Session blacklist on logout

- **Blocks:** Cannot implement best-practice auth. Session management fragile.

- **Fix approach:**
  - Implement double-token pattern (access + refresh)
  - Store refresh token in httpOnly cookie (double secure)
  - Add `revoked_at` column to sessions table
  - ~4-8 hours effort

---

## Test Coverage Gaps

### Backend E2E Tests

**What's not tested:**
- OCR orchestration (multi-model fallback chain)
- Presigned URL generation and file retrieval
- Community price hashing and aggregation
- Watchdog file processing
- Database connection pool exhaustion
- Gemini API timeout and circuit breaker activation

- **Files:** `apps/api/tests/` (exists but sparse)

- **Risk:** Critical features could silently break in production

- **Priority:** High — these are core features

---

### Frontend Component Tests (Coverage Below 50%)

**What's not tested:**
- CataloguePage (25KB, no tests)
- ValidationPage (12KB, no tests)
- HistoryPage (12KB, no tests)
- DevisPage (15KB, no tests)
- SettingsPage (20KB, no tests)
- Auth password validation
- Offline PWA functionality
- Error boundary behavior

- **Files:** `apps/pwa/src/features/*/` (tests missing)

- **Risk:** UI regressions not caught. Users hit bugs in production.

- **Priority:** High — 5 large features untested

---

### Security Test Suite

**What's not tested:**
- XSS injection attempts
- CSRF attack simulation
- SQL injection (should be impossible but not tested)
- Authentication bypass
- File upload validation (magic bytes, size, type)
- Rate limiting enforcement
- Session hijacking prevention

- **Files:** No dedicated security test suite

- **Risk:** Security vulnerabilities only discovered post-production

- **Priority:** High — security features assumed but not validated

---

---

*Concerns audit: 2026-03-17*
