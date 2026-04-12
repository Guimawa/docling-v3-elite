# Project Research Summary

**Project:** Docling — Invoice OCR SaaS for BTP artisans
**Domain:** Document processing / OCR SaaS — single-user v1, construction sector
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

Docling is approximately 90% complete. Every major feature exists in the codebase — upload, OCR via Gemini, validation, catalogue, CSV export, quote generation, history. This is a "finish the last mile" project, not a greenfield build. The gap is not tooling or architecture: the gap is a broken E2E flow caused by 4 specific bugs and a near-complete absence of E2E tests to verify the flow works.

The recommended approach is surgical bug fixing in dependency order, followed by E2E test coverage. The critical path is: fix batch-to-validation routing (one line) → fix Zustand state loss on refresh → add confidence-low quality gate → verify the full scan-to-CSV flow with real BIGMAT PDFs → write E2E tests against the verified flow. No new dependencies are needed. No architecture redesign is needed. The existing Playwright + pytest test infrastructure is already installed and configured — it just needs browser binaries installed and `data-testid` attributes added to components.

The primary risk is the "God module" in `main.py` (906 lines): it makes test isolation painful and will slow down E2E test writing. The strategic question for the roadmap is whether to refactor `main.py` into proper routers before writing tests (higher confidence, more effort) or write tests against the monolith and refactor after v1 ships (faster to ship, higher maintenance cost). All other risks — Zustand loss, batch skip, silent fallbacks, presigned URL staleness — have clear, low-effort fixes identified to the file and line.

## Key Findings

### Recommended Stack

No new tools are required. The stack is complete and the testing infrastructure is already installed. The only blocker is that Playwright browser binaries were never downloaded — a single command resolves this. All testing follows existing patterns documented in `ScanPage.test.jsx` (frontend) and `tests/e2e/conftest.py` (backend E2E).

**Core technologies in use:**
- Playwright (>=1.49): E2E browser testing — installed but browsers not downloaded
- pytest + pytest-asyncio + pytest-cov: Backend testing — fully working, ~90 tests
- Vitest 3.2.4 + @testing-library/react 16.3.2: Frontend unit testing — working, ~51 tests, 5 pages untested
- FastAPI + asyncpg + Neon: Backend — production-ready
- Gemini AI (multilingue FR/ES/CA): OCR — working but fallback chain silences errors
- Storj S3: PDF archival — working but fails silently when unconfigured

See `.planning/research/STACK.md` for full assessment.

### Expected Features

All table-stakes and differentiator features are already built. The work is verification and bug-fixing, not building.

**Must have (table stakes) — all exist, some need E2E verification:**
- Upload PDF or photo (drag-drop + camera + batch folder)
- OCR extraction with confidence indicators
- Inline editing of extracted products in ValidationPage
- Save products to catalogue + search/filter/export CSV
- Invoice history with PDF access (presigned URL)
- Login/logout with httpOnly JWT + mobile PWA

**Should have (differentiators) — all exist:**
- Batch import (folder of BIGMAT invoices, concurrency=3)
- Factur-X XML auto-extraction for compliant PDFs
- Quote generation from catalogue (jsPDF, TVA options)
- Multilingue FR/ES/CA — geographic differentiator for Catalonia market
- Image preprocessing (OpenCV) for blurry phone photos
- Re-scan from history using presigned URL

**Defer explicitly to v2+:**
- Multi-tenant / multi-user — zero v1 value
- OAuth/SSO — over-engineered for single user
- App Store mobile app — PWA installs without friction
- Accounting integration — CSV export covers the need
- UI redesign/polish — flow must work before it looks good

See `.planning/research/FEATURES.md` for full feature audit including 5 critical dependency gaps.

### Architecture Approach

The architecture is a standard monorepo (pnpm workspace) with FastAPI backend and React PWA frontend. The E2E flow is well-defined and mostly working: Upload → POST /process → background job → polling → ValidationPage → batch save → CataloguePage → CSV export. The 4 confirmed architectural gaps are all in specific, locatable files and are resolvable without structural changes to the system.

**Major components and their roles:**
1. Orchestrator (`core/orchestrator.py`) — MIME detection, Factur-X or Gemini routing, parallel DB+S3 write
2. main.py (906-line God module) — routes + auth + circuit breaker + middleware — testing liability
3. useScanUpload (`features/scan/hooks/useScanUpload.js`) — upload + 5s polling loop (60 attempts = 5min)
4. useDoclingStore (`store/useStore.js`) — pipeline buffer between extraction and validation (volatile — lost on refresh)
5. ValidationPage (`features/validation/ValidationPage.jsx`) — product review hub — 3 bugs (state loss, PDF preview, confidence gate)
6. CataloguePage (`features/catalogue/CataloguePage.jsx`) — 700-line monolith, working but fragile

**4 architectural gaps preventing reliable E2E flow:**
1. Batch mode navigates to `/catalogue` directly — bypasses `/validation` (single-line fix)
2. PDF preview renders `<img>` for PDFs — needs `<iframe>` or `<object>` detection
3. Storj S3 returns `None` silently when unconfigured — history PDF buttons return 404
4. Polling timeout (5min) can be exceeded by Render free-tier cold starts

See `.planning/research/ARCHITECTURE.md` for component integration map and build order.

### Critical Pitfalls

1. **Silent fallback swallows real errors** (`orchestrator.py:74-80`) — bare `except Exception: pass` makes Gemini API failures indistinguishable from blurry PDFs. Fix: log all exceptions with model name before entering fallback chain.

2. **Zustand store lost on PWA restart** (`ValidationPage.jsx:44-46`) — extraction results exist only in memory. Construction site mobile restarts kill the session. Fix: persist `extractedProducts` to `sessionStorage` before any E2E tests are written.

3. **Confidence=low products bypass quality gate** — Gemini marks unreadable prices as `prix=0`, confidence=low. These pass straight to catalogue and appear in CSV exports as 0.00 EUR line items. Fix: filter or flag in ValidationPage before save.

4. **No idempotency on batch save** (`schemas/invoice.py:70-87`) — double-tap on slow 4G creates duplicate catalogue entries. Fix: dedup by `facture_hash` on batch save endpoint.

5. **Stale presigned URLs in history** — URLs expire after 1h; buttons cached on page load return 403. Fix: generate presigned URLs lazily on click, not eagerly on page load. (This is the active work on the current branch `feat/boutons-acces-pdf-factures`.)

See `.planning/research/PITFALLS.md` for full 13-pitfall inventory with file:line references.

## Implications for Roadmap

Based on combined research, the fix order is dictated by dependencies: you cannot reliably test what is broken, and you cannot fix the right things if errors are swallowed silently.

### Phase 1: Backend Bug Fixes
**Rationale:** Fix silent error swallowing before anything else — it makes all debugging downstream unreliable. Fix idempotency to prevent data corruption during testing.
**Delivers:** Reliable backend error signals, no duplicate entries, resilient preprocessing
**Addresses:** Table-stakes features that exist but have silent failure modes
**Avoids pitfalls:** #1 (silent fallback), #3 (idempotency), #6 (preprocessor crash)
**Research flag:** Standard patterns — no additional research needed

### Phase 2: Frontend Flow Fixes
**Rationale:** The E2E flow has 3 known breaks in the frontend that must be fixed before E2E tests can be written. Fixing Zustand persistence first is mandatory — otherwise E2E tests will flake on every run.
**Delivers:** A complete, reliable scan-to-catalogue flow that survives navigation, refresh, and batch mode
**Addresses:** ValidationPage state loss, batch skip validation, PDF preview for PDFs, confidence=low quality gate
**Avoids pitfalls:** #2 (Zustand loss), #5 (confidence gate), #10 (batch skip), architectural Gap 1 and Gap 2
**Research flag:** Standard React patterns — no additional research needed

### Phase 3: History and PDF Access Fixes
**Rationale:** The current branch (`feat/boutons-acces-pdf-factures`) is already addressing this. Complete it. Lazy presigned URL generation is a well-understood pattern.
**Delivers:** Working PDF access buttons in history page; Storj silent failure surfaces as a user-visible warning
**Addresses:** History table stakes (existing feature, currently broken)
**Avoids pitfalls:** #9 (stale presigned URLs), architectural Gap 3 (Storj silent failure)
**Research flag:** Standard patterns — no additional research needed

### Phase 4: E2E Test Infrastructure
**Rationale:** Only run after the flow actually works. Install Playwright browser binaries, add `data-testid` attributes, create `.env.test`, write the 5 E2E flows. Do not write tests against the broken flow.
**Delivers:** Verified E2E coverage: scan → validation → catalogue → CSV export → history → auth
**Uses:** Playwright (already installed), existing conftest.py skeleton, `@pytest.mark.e2e` marker system
**Avoids pitfalls:** #11 (outdated JWT tests), E2E flakiness from Zustand state (fixed in Phase 2)
**Research flag:** Standard patterns — Playwright conftest already exists, extend it

### Phase 5: Frontend Unit Tests for Untested Pages
**Rationale:** 5 pages have zero test coverage. Run in parallel with or after E2E work. Use the ScanPage.test.jsx mock pattern already documented.
**Delivers:** Unit test coverage for ValidationPage, CataloguePage, HistoryPage, DevisPage, SettingsPage
**Uses:** Vitest + @testing-library/react (already working)
**Research flag:** Standard patterns — existing ScanPage mock pattern is the template

### Phase 6: Architecture Cleanup (Conditional)
**Rationale:** The 906-line `main.py` God module is a maintenance liability but is NOT blocking v1 shipping. Schedule this only if test isolation problems in Phase 4 make it necessary, or as a post-v1 quality pass.
**Delivers:** `routers/` module split, cleaner test isolation
**Avoids pitfalls:** #4 (God module test isolation)
**Research flag:** This phase needs careful scoping — splitting a 906-line FastAPI app requires route-by-route audit. Flag for `/gsd:research-phase` if scheduled.

### Phase Ordering Rationale

- Phases 1-2 must precede E2E testing: you cannot write reliable tests against a broken flow with silenced errors
- Phase 3 can run in parallel with Phase 2 (different subsystem, no dependencies)
- Phase 5 (unit tests) can run in parallel with Phase 4 (E2E tests)
- Phase 6 (refactor) is optional for v1 and should only be scheduled if Phase 4 reveals insurmountable test isolation problems
- The current branch `feat/boutons-acces-pdf-factures` maps to Phase 3 — complete it first, then merge before starting Phase 1-2

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Architecture cleanup):** main.py refactor is non-trivial; needs route-by-route inventory before estimating effort

Phases with standard patterns (skip research-phase):
- **Phase 1:** Backend error handling and idempotency are well-documented patterns
- **Phase 2:** React sessionStorage persistence + routing fixes are standard patterns
- **Phase 3:** Lazy presigned URL generation is a standard S3 pattern
- **Phase 4:** Playwright E2E test structure already exists in project — extend, don't replace
- **Phase 5:** Vitest + Testing Library unit test pattern already documented in ScanPage.test.jsx

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct inspection of pyproject.toml, package.json, and installed packages — no inference |
| Features | HIGH | Full codebase audit + CONCERNS.md cross-reference — every feature located in source |
| Architecture | HIGH | Line-level code inspection of all 15 components; gaps confirmed to file:line |
| Pitfalls | HIGH | All 13 pitfalls grounded in direct code evidence with file:line references |

**Overall confidence:** HIGH

### Gaps to Address

- **Polling timeout threshold (Gap 4):** Whether Render free-tier cold starts actually exceed 5min in practice is unknown — confirm from Render logs or increase timeout conservatively to 10min as precaution
- **main.py refactor effort:** Not researched in detail — if Phase 6 is scheduled, run a dedicated research pass to inventory the 906 lines before estimating
- **Offline queue sync bypass (Pitfall #8):** The offline queue's interaction with the validation flow is identified as a risk but not fully traced — investigate during Phase 2 implementation
- **Batch save 500-product limit:** Claimed limit is in place but enforcement was not verified in code — confirm during Phase 1

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified against actual source files in `apps/api/` and `apps/pwa/`
- Historical March 2026 audit snapshots (superseded; codebase is source of truth)
- `CONCERNS.md` — existing coverage gap audit used to identify 5 untested frontend pages
- `apps/api/pyproject.toml` — dependency versions confirmed
- `apps/pwa/package.json` — frontend dependency versions confirmed

### Secondary (MEDIUM confidence)
- Domain knowledge of BTP artisan workflow — informs feature priority and mobile usage patterns
- Render free-tier cold start behavior — known to be variable; 5-10min window is community consensus

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
