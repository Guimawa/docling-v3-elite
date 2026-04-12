---
phase: 02-frontend-flow
plan: 03
subsystem: ui
tags: [react, zustand, pdf, framer-motion, validation, confidence]

# Dependency graph
requires:
  - phase: 02-frontend-flow plan 02
    provides: currentInvoiceMime in Zustand store, S3 presigned URL as currentInvoice
provides:
  - Conditional PDF/image rendering in ValidationPage preview and lightbox
  - Per-product inclusion checkboxes with low-confidence excluded by default
  - Exclusion counter banner above save button
  - Save only sends included products to batch API
  - Dead batch-done modal removed from ScanPage
affects: [e2e-tests, validation-flow, scan-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MIME-based conditional rendering: isPdf = MIME includes 'pdf' || URL ends with .pdf"
    - "object+iframe fallback for PDF embedding (cross-browser)"
    - "Set-based inclusion tracking: useState<Set<number>> for per-item checkbox state"
    - "Lazy initializer in useState to compute initial Set from product confidence"

key-files:
  created: []
  modified:
    - apps/pwa/src/features/validation/ValidationPage.jsx
    - apps/pwa/src/features/scan/ScanPage.jsx

key-decisions:
  - "isPdf fallback checks URL extension in addition to MIME type — handles edge cases where MIME is null but URL reveals PDF"
  - "Low-confidence products are excluded by default (unchecked) — user must opt-in, not opt-out"
  - "includedSet uses index-based Set<number> matching products array — simpler than id-based given products may lack stable ids"
  - "excludedCount banner fixed-position at bottom-36 — stacks above the sticky save button at bottom-20"

patterns-established:
  - "Conditional media rendering: isPdf ternary pattern for object/img — reuse in HistoryPage or any future PDF display"
  - "Inclusion checkbox pattern: Set<number> state + toggleInclude + computed includedProducts — apply to any multi-select list"

requirements-completed:
  - FLOW-03
  - FLOW-04

# Metrics
duration: 8min
completed: 2026-03-17
---

# Phase 02 Plan 03: PDF Rendering + Confidence Exclusion Summary

**ValidationPage renders PDFs via object/iframe (not broken img), flags low-confidence products with exclusion checkboxes, and ScanPage dead modal code removed**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-17T11:00:00Z
- **Completed:** 2026-03-17T11:08:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- ValidationPage now detects PDF MIME type and renders previews + fullscreen lightbox with `<object>`+`<iframe>` fallback instead of broken `<img>` tag
- Products with `confidence === 'low'` are excluded by default via unchecked checkbox; user can re-include them individually
- Exclusion counter banner ("X produits exclus (confidence faible)") appears above save button when any products are excluded
- Save button and API call (`handleValidate`) now send only the user-included products — low-confidence products are never silently saved
- 63 lines of dead batch-done modal code removed from ScanPage along with unused `FolderOpen` and `Package` icon imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Conditional PDF/image rendering + confidence exclusion checkboxes** - `17c8662` (feat)
2. **Task 2: Remove dead batch-done modal from ScanPage** - `102fc39` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified
- `apps/pwa/src/features/validation/ValidationPage.jsx` - Added MIME-based PDF/image conditional rendering, per-product inclusion checkboxes, exclusion counter, updated save logic to filter by includedSet
- `apps/pwa/src/features/scan/ScanPage.jsx` - Removed batchDoneModal destructuring, deleted 63-line modal JSX block, removed FolderOpen and Package unused imports

## Decisions Made
- `isPdf` checks both `currentInvoiceMime` (primary) and URL extension (fallback) to handle cases where MIME is null but the URL clearly points to a PDF
- Inclusion tracked as `Set<number>` (index-based) rather than Set of IDs — avoids complexity when products may not have stable unique IDs at validation time
- Low-confidence products are excluded by default (unchecked) — forces user to consciously opt-in rather than accidentally save unreliable data
- Exclusion counter positioned `fixed bottom-36` to stack cleanly above the sticky save button at `fixed bottom-20`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ValidationPage now correctly handles both PDF and image invoices end-to-end
- Low-confidence product filtering is live — users control what gets saved to catalogue
- ScanPage is clean — direct navigation to /validation replaces the now-removed modal
- Ready for Phase 3 (history / lazy presigned URLs) or E2E test coverage of the complete scan-to-catalogue flow

---
*Phase: 02-frontend-flow*
*Completed: 2026-03-17*
