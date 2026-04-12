# Roadmap: Docling

> Note: this roadmap is kept for agent workflow continuity. For day-to-day project steering, use `JOURNAL.md` and `docs/workflow/`.

## Overview

Docling is ~98% complete (voir `JOURNAL.md`). Migrations DB jusqu'à **a014** (TTC détail catalogue, avril 2026). All major features exist. This roadmap finishes the last mile: fix the backend silent failures and data corruption risks first, then fix the 4 broken points in the frontend E2E flow, complete the history PDF access work already in progress, and finally lock in the verified flow with E2E and unit test coverage. No new architecture, no new dependencies — only fixing, verifying, and proving what already works.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backend Resilience** - Fix silent error swallowing, preprocessor crash, batch idempotency + patch CVEs (completed 2026-03-17)
- [x] **Phase 2: Frontend Flow** - Fix the 4 E2E flow breaks (routing, state persistence, PDF preview, confidence gate) + remove Spline (completed 2026-03-17)
- [x] **Phase 3: History & PDF Access** - Presigned URLs lazy + boutons PDF historique (completed 2026-03-17, branch merged)
- [x] **Phase 4: E2E Tests** - Playwright + httpx : auth, scan, catalogue, settings, export, history, stats (completed 2026-03-27)
- [x] **Phase 5: Frontend Unit Tests** - 303 tests vitest couvrant toutes les pages principales (completed 2026-03-25)
- [x] **Phase 6: Frontend Visual Redesign** - Refonte visuelle complète du frontend (design system, pages, layout) (completed 2026-04-04)

## Phase Details

### Phase 1: Backend Resilience
**Goal**: The backend reports failures honestly, prevents data corruption, and runs on patched dependencies
**Depends on**: Nothing (first phase)
**Requirements**: BACK-01, BACK-02, BACK-03, QWIN-02
**Success Criteria** (what must be TRUE):
  1. When Gemini or Bytez fails, the server logs show the model name and exception type — not silence
  2. When image preprocessing crashes, the job continues with the raw image and a warning is logged — the job does not fail
  3. Submitting the same batch twice (double-tap on slow 4G) produces no duplicate catalogue entries
  4. pip and npm audits report no known CVEs for the patched dependency versions
**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Fix silent error swallowing in extraction fallback + verify preprocessor resilience
- [x] 01-02-PLAN.md — Add idempotency guard to invoice upload endpoint (dedup double-tap)
- [x] 01-03-PLAN.md — Patch CVE dependencies (pip + npm) with Guilhem approval

### Phase 2: Frontend Flow
**Goal**: The complete scan-to-catalogue flow works without breaks across navigation, refresh, and batch mode
**Depends on**: Phase 1
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, QWIN-01
**Success Criteria** (what must be TRUE):
  1. After a batch extraction completes, the user lands on /validation — not directly on /catalogue
  2. A user who refreshes the browser or navigates back during validation still sees their extracted products
  3. When the uploaded file is a PDF, ValidationPage renders it in an iframe/object — not a broken img tag
  4. Products with confidence=low are visually flagged and excluded from the save-to-catalogue action by default
  5. The app loads without downloading the SplineScene bundle (mobile load time measurably reduced)
**Plans:** 3/3 plans complete

Plans:
- [x] 02-01-PLAN.md — Remove SplineScene 3D component and @splinetool dependencies
- [x] 02-02-PLAN.md — Fix batch routing to /validation + persist extracted data across refresh
- [x] 02-03-PLAN.md — Conditional PDF/image rendering + low-confidence product filtering

### Phase 3: History & PDF Access
**Goal**: PDF access buttons in history work reliably and never return 403 on valid invoices
**Depends on**: Phase 2
**Requirements**: HIST-01, HIST-02, QWIN-03
**Success Criteria** (what must be TRUE):
  1. Clicking a PDF button in history triggers a fresh presigned URL request — page load does not pre-generate URLs
  2. A PDF stored in Storj opens in the browser when the user clicks its history button
  3. A PDF button for an invoice with no Storj file shows a clear user-visible warning rather than a silent 403
**Plans**: TBD

### Phase 4: E2E Tests
**Goal**: The verified E2E flow is covered by automated Playwright tests that run against real browser + app
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Running `playwright test` completes without "browser not found" errors — chromium binaries are installed
  2. The 5 E2E flows (scan/upload, validation/edit, catalogue/search, CSV export, auth login/logout) all pass
  3. Every interactive element in the main flow has a data-testid attribute that the tests can target
  4. A `.env.test` file exists with safe test credentials — no production secrets in test config
**Plans**: TBD

### Phase 5: Frontend Unit Tests
**Goal**: The 5 previously untested frontend pages each have unit test coverage following the ScanPage pattern
**Depends on**: Phase 4
**Requirements**: TEST-04
**Success Criteria** (what must be TRUE):
  1. ValidationPage, CataloguePage, HistoryPage, DevisPage, and SettingsPage each have at least one test file
  2. Running `vitest` reports passing tests for all 5 pages — zero untested pages in core flow
  3. The mock pattern used matches the existing ScanPage.test.jsx approach — no new test setup required
**Plans**: TBD

### Phase 6: Frontend Visual Redesign
**Goal**: Le frontend est entierement refondu visuellement — design system coherent, identite visuelle forte, experience mobile-first premium
**Depends on**: Phase 5
**Requirements**: UI-01
**Success Criteria** (what must be TRUE):
  1. Toutes les pages principales (Scan, Validation, Catalogue, Devis, Historique, Settings) ont un design coherent et moderne
  2. Le design system (couleurs, typo, espacements, composants) est defini et applique uniformement
  3. L'application reste PWA installable et fonctionne correctement sur mobile
  4. Aucune regression fonctionnelle — les tests existants passent toujours
**Plans:** 5/5 plans complete

Plans:
- [x] 06-01-PLAN.md — Remap Tailwind token values to dark palette + sync index.css + tokens.js
- [x] 06-02-PLAN.md — Update shared components (Navbar, Button, Card, Input, Select, Badge) to dark theme
- [x] 06-03-PLAN.md — Migrate ScanPage, DevisPage, HistoryPage, SettingsPage, auth pages, shared UI to dark theme
- [x] 06-04-PLAN.md — Migrate ValidationPage, CataloguePage + modals to dark theme
- [x] 06-05-PLAN.md — Final test suite + color audit + visual checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Resilience | 3/3 | Complete | 2026-03-17 |
| 2. Frontend Flow | 3/3 | Complete | 2026-03-17 |
| 3. History & PDF Access | 3/3 | Complete | 2026-03-17 |
| 4. E2E Tests | 5/5 | Complete | 2026-03-27 |
| 5. Frontend Unit Tests | 303 tests | Complete | 2026-03-25 |
| 6. Frontend Visual Redesign | 5/5 | Complete | 2026-04-04 |
