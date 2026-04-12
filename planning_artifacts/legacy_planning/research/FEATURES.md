# Feature Landscape

**Domain:** Invoice OCR SaaS — BTP/construction artisan, single-user v1
**Researched:** 2026-03-17
**Confidence:** HIGH (codebase audit + domain knowledge)

## Context

Docling is ~90% built. This is "finish v1" research, not greenfield.
Core value: scan supplier invoice -> structured price catalog -> generate quotes.
Every feature is evaluated against that specific loop for a single artisan user.

## Table Stakes

| Feature | Why Expected | Status | Complexity | Notes |
|---------|--------------|--------|------------|-------|
| Upload PDF or photo | Entry point | Exists | Low | Drag-drop + camera + folder batch |
| OCR extraction that works | Core product value | Exists | Med | Never tested E2E; preprocessor fragile |
| Display extracted products | User sees what AI found | Exists | Low | ValidationPage redirects to /scan on state loss |
| Inline editing of extracted data | AI is imperfect | Exists | Med | Not verified end-to-end |
| Confidence indicator | AI errors cost real money | Exists | Low | Visual badge present |
| Save products to catalog | Core action after validation | Exists | Low | BatchSaveRequest uses list[dict] — no Pydantic typing |
| Browse catalog (search + filter) | Find products you scanned | Exists | Med | Cursor pagination done; 700-line monolith |
| Edit catalog product | Prices change | Exists | Low | Needs save verification |
| Delete catalog product | Catalog cleanup | Exists | Low | — |
| Export catalog to CSV | Primary artisan output | Exists | Low | CSV injection protection present |
| View past invoices (history) | Audit trail | Exists | Low | Retry scan present |
| Access archived PDF | Traceability / legal | Exists | Low | 1h presigned URL — acceptable |
| Login / logout | Security baseline | Exists | Low | httpOnly JWT |
| Persistent login across refresh | Basic PWA expectation | Exists | Low | 24h JWT |
| Works on mobile | Artisan is on site | Exists | Low | SplineScene 3-5 MB hurts mobile |
| Offline queue | Construction sites = poor connectivity | Exists | Med | Not E2E tested |
| Error feedback (toasts) | User knows when something fails | Exists | Low | All API errors toast |

## Differentiators

| Feature | Value | Status | Complexity | Notes |
|---------|-------|--------|------------|-------|
| Batch import (full folder) | BIGMAT invoices come in batches | Exists | Med | concurrency=3; completion modal |
| Community price comparison | Benchmark supplier prices vs market | Exists | High | Fragile hash logic; not core flow |
| Factur-X XML auto-extraction | Precise parsing for compliant PDFs | Exists | Med | Reduces manual correction |
| Quote generation from catalog | Full invoice->catalog->quote->PDF | Exists | Med | Draft restore; jsPDF; TVA options |
| Multilingue FR/ES/CA | BIGMAT Catalonia = FR + CA invoices | Exists | Low | Core geographic differentiator |
| Image preprocessing (OpenCV) | Better OCR on blurry phone photos | Exists | Med | No error fallback — fragile |
| Re-scan from history | Fix bad extraction without re-uploading | Exists | Med | Uses presigned URL |
| Stats dashboard | Sense of progress | Exists | Low | In HistoryPage header |

## Anti-Features (Do NOT Build for v1)

| Anti-Feature | Why Avoid | Do Instead |
|--------------|-----------|------------|
| Multi-tenant / multi-user | Zero v1 value; adds complexity | SaaS expansion is v2 |
| OAuth / SSO | Over-engineered for 1 user | Keep Argon2id email/password |
| WebSocket / real-time | No concurrent users; polling fine | Keep polling |
| App Store mobile app | PWA installs without friction | Ship the PWA |
| Advanced monitoring / SLO | Operations overhead for personal tool | Render health + email only |
| UI redesign / polish pass | Flow must work before it looks good | Defer polish |
| Accounting integration | Out of scope; CSV covers the need | Let user import CSV |
| Refresh token rotation | Nice-to-have; not a v1 blocker | Add before multi-tenant |

## Feature Dependencies (Critical Path)

```
Auth (login)
  -> Upload (scan page)
    -> OCR extraction (Gemini / Factur-X)
      -> Validation (view + correct products)
        -> Batch save (catalog)
          -> Catalog browse + edit
            -> Export CSV  OR  Quote -> PDF
```

## Critical Dependency Gaps

1. **ValidationPage redirects to /scan on state loss** (refresh, back navigation) — extractedProducts must survive navigation
2. **BatchSaveRequest uses list[dict]** — malformed product silently creates bad catalog entries
3. **Image preprocessor crash fails entire job** with no fallback to raw image
4. **Gemini fallback chain swallows exceptions silently** (bare except: pass)
5. **Offline queue sync uses navigator.onLine** which is unreliable on mobile networks

## MVP Verification Priority

**Must be verified working (existing code, needs E2E test):**
1. Upload PDF -> OCR -> products in ValidationPage — test with real BIGMAT PDFs
2. Edit + save in ValidationPage -> correct data in Catalog
3. Catalog search + filter + CSV export — test with 50+ products
4. History -> view PDF -> re-scan

**Must be fixed:**
5. ValidationPage state loss — persist extractedProducts to sessionStorage
6. Batch mode skips validation — redirect to /validation
7. Image preprocessor crash -> log + skip preprocessing, do not fail the job
8. Gemini fallback — log all errors with model name and exception type

**Quick wins (high impact, low risk):**
9. Remove SplineScene — 3-5 MB savings for mobile
10. Remove exceljs if CSV already works — 300 KB savings

**Defer explicitly:**
- CSRF, magic bytes, account lockout — single-user risk low
- Watchdog service — orphan bug; no user value
- Community pricing fixes — not core flow

---
*Research completed: 2026-03-17*
