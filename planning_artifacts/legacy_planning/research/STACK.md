# Stack Research: Docling v1 Completion

**Research Date:** 2026-03-17
**Mode:** Subsequent milestone (finishing v1 of existing app)
**Confidence:** HIGH

## Key Finding

**No new tools needed.** The testing stack is already installed. The gap is execution, not tooling.

## Current Stack Assessment

### Already Installed & Ready

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| Playwright | >=1.49 | E2E browser testing | Installed but browsers NOT downloaded |
| pytest | 8+ | Backend unit/integration tests | Working, ~90 tests |
| pytest-asyncio | - | Async test support | Working |
| pytest-cov | - | Coverage reporting | Working |
| Vitest | 3.2.4 | Frontend unit tests | Working, ~51 tests |
| @testing-library/react | 16.3.2 | Component testing | Working |

### Critical Gaps (No New Deps Needed)

1. **Playwright browser binaries NOT installed** — `pw.chromium.launch()` in conftest, needs `uv run playwright install chromium`
2. **`data-testid` attributes missing in JSX** — E2E tests assert against `[data-testid='scan-dropzone']`, `[data-testid='scan-lancer-btn']`, etc. but these may not exist in components
3. **`.env.test` does not exist** — conftest tries to load it, falls back to `.env` (production credentials risk)
4. **5 critical frontend pages have zero unit tests**: ValidationPage, CataloguePage, HistoryPage, DevisPage, SettingsPage
5. **E2E skeleton exists** but incomplete: `tests/e2e/conftest.py`, `test_scan_flow.py`, `test_catalogue_browse.py`, `test_settings_sync.py`

## Recommendations

### Do NOT Add

| Tool | Reason |
|------|--------|
| Cypress | Playwright already installed and configured |
| Jest | Vitest already working, same API |
| Supertest | pytest + httpx already handles API testing |
| Any new test framework | Existing tools are sufficient |

### Action Items for Roadmap

1. `uv run playwright install chromium` — install browser binaries
2. Audit + add `data-testid` to all interactive components
3. Write 5 missing E2E flows (scan, validation, catalogue, export, auth)
4. Write unit tests for 5 untested pages
5. Create `.env.test` with safe test credentials
6. Existing `@pytest.mark.e2e` + `@pytest.mark.external` marker system is solid — extend it

### Existing Patterns to Follow

- Mock pattern documented in `ScanPage.test.jsx` — replicate for other pages
- Playwright conftest pattern is solid — extend, don't replace
- CI/CD marker separation already in place

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Stack (existing tools) | HIGH | Direct pyproject.toml + package.json inspection |
| E2E blocker (browser binaries) | HIGH | pw.chromium.launch() in conftest, no install step |
| Frontend coverage gaps | HIGH | CONCERNS.md audit + glob confirms 5 untested pages |
| data-testid gap | HIGH | E2E test assertions cross-referenced against JSX |
| .env.test absence | HIGH | Not found in project |

---
*Research completed: 2026-03-17*
