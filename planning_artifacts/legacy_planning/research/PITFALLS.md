# Pitfalls Research: Docling v1 Completion

**Domain:** Invoice OCR SaaS — BTP/construction artisan
**Researched:** 2026-03-17
**Confidence:** HIGH — all findings grounded in direct code evidence (file:line references)

## Critical Pitfalls

### 1. Silent fallback swallows real errors
- **Where:** `orchestrator.py:74-80`
- **Problem:** Bytez fallback uses bare `except Exception: pass`. Impossible to distinguish "blurry PDF" from "Gemini API key expired" in logs. Circuit breaker can trigger on wrong root causes.
- **Warning signs:** Jobs fail silently; circuit breaker trips unexpectedly
- **Prevention:** Log all exceptions with model name and exception type before fallback
- **Phase:** Backend bug fixes

### 2. Zustand store lost on refresh — E2E killer
- **Where:** `ValidationPage.jsx:44-46`
- **Problem:** Extracted products live only in Zustand memory. Mobile PWA restarts (common on construction sites) silently lose extraction results and redirect to /scan.
- **Warning signs:** E2E tests flake; user complains "my products disappeared"
- **Prevention:** Persist extractedProducts to sessionStorage or IndexedDB
- **Phase:** Frontend flow fixes

### 3. No idempotency key on batch save — double-save risk
- **Where:** `schemas/invoice.py:70-87`
- **Problem:** Double-tapping "Valider" on mobile (slow 4G) creates duplicate invoice history entries. No deduplication by `facture_hash`.
- **Warning signs:** Duplicate products in catalogue after save
- **Prevention:** Add idempotency key or dedup check on batch save endpoint
- **Phase:** Backend bug fixes

### 4. God Module makes test isolation impossible
- **Where:** `main.py` — 906 lines
- **Problem:** Routes + auth + circuit breaker + middleware in one file. Writing E2E tests against this monolith creates brittle tests.
- **Warning signs:** Test changes break unrelated tests; mocking is painful
- **Prevention:** Refactor into `routers/` modules BEFORE writing E2E tests
- **Phase:** Architecture cleanup (but consider: do we need this for v1?)

### 5. Confidence=low products bypass quality gate
- **Where:** Gemini extraction -> Pydantic validation -> catalogue
- **Problem:** Gemini marks unreadable prices as `confidence: "low"` with `prix = 0`. These pass validation, land in catalogue, and get exported to CSV with zero-price line items.
- **Warning signs:** Artisan quotes with 0.00 EUR prices
- **Prevention:** Filter or flag confidence=low in ValidationPage before save
- **Phase:** Validation flow fixes

## Moderate Pitfalls

### 6. Image preprocessor fails silently on bad PDFs
- **Where:** `image_preprocessor.py`
- **Problem:** Crash on bad input fails the entire job with no fallback to raw image
- **Prevention:** Catch preprocessing errors, skip to raw image, log warning
- **Phase:** Backend resilience

### 7. ValidationPage doesn't track modified vs accepted products
- **Where:** `ValidationPage.jsx`
- **Problem:** No distinction between "user reviewed and accepted" vs "user didn't look at this product"
- **Prevention:** Add "reviewed" flag per product row
- **Phase:** Validation UX (defer to v1.1 if not blocking)

### 8. Offline queue sync bypasses ValidationPage on store reset
- **Where:** `offlineQueue.js`
- **Problem:** When offline queue syncs, products may bypass validation step
- **Prevention:** Ensure sync routes through validation flow
- **Phase:** PWA reliability

### 9. PDF access buttons show stale presigned URLs
- **Where:** History page, current branch work
- **Problem:** Presigned URLs expire after 1h; cached buttons return 403
- **Prevention:** Generate presigned URLs lazily on click, not eagerly on page load
- **Phase:** History fixes

### 10. Batch mode skips validation entirely
- **Where:** `useScanUpload.js:316-320`
- **Problem:** `startBatch()` navigates to `/catalogue` directly, bypassing `/validation`
- **Prevention:** Route batch completion to `/validation` like camera mode
- **Phase:** Frontend flow fixes (FIRST FIX — single line change)

## Minor Pitfalls

### 11. Tests validate removed localStorage JWT behavior
- **Where:** Test files
- **Problem:** Some tests still check localStorage for JWT tokens (deprecated behavior)
- **Prevention:** Update tests to check httpOnly cookie flow
- **Phase:** Test cleanup

### 12. Community price salt has hardcoded fallback
- **Where:** Community service
- **Problem:** If env var missing, uses hardcoded salt — security risk
- **Prevention:** Require env var or disable community feature
- **Phase:** Not v1 priority

### 13. Batch payload has no size limit
- **Where:** Batch save endpoint
- **Problem:** No limit on number of products per request — OOM risk on Render free tier (256MB)
- **Prevention:** Already limited to 500 products per batch — verify enforcement
- **Phase:** Backend validation

## Phase Mapping

| Phase Area | Pitfalls to Address |
|-----------|-------------------|
| Frontend flow fixes | #2 (Zustand loss), #5 (confidence gate), #10 (batch skip validation) |
| Backend bug fixes | #1 (silent fallback), #3 (idempotency), #6 (preprocessor crash) |
| E2E testing | #4 (God module — consider if refactor needed first) |
| History/PDF | #9 (stale presigned URLs) |
| PWA reliability | #8 (offline sync bypass) |
| Test cleanup | #11 (outdated JWT tests) |
| Deferred | #7, #12, #13 |

## Roadmap Implications

1. **Fix Zustand persistence BEFORE E2E tests** — otherwise tests will be unreliable
2. **Fix batch->validation routing FIRST** — single-line change, highest user impact
3. **Add confidence=low filtering to ValidationPage** — quality of catalogue depends on it
4. **Consider main.py refactor timing carefully** — needed for clean tests, but high effort
5. **Lazy presigned URL generation** — don't ship eager URL generation

---
*Research completed: 2026-03-17*
