---
phase: 02-frontend-flow
plan: 02
subsystem: ui
tags: [zustand, react, navigation, persistence, s3, pwa]

# Dependency graph
requires:
  - phase: 01-backend-resilience
    provides: "Backend returns pdf_url (S3 presigned URL) and products in job status response"
provides:
  - "Zustand store persists extractedProducts, currentInvoice (S3 URL), currentInvoiceMime, pendingSource across refresh"
  - "Batch flow auto-navigates to /validation after extraction"
  - "Camera flow passes pdf_url and MIME type to store"
  - "setJobComplete accepts 4 params: (products, source, pdfUrl, mime)"
affects: [02-frontend-flow, validation, catalogue, history]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand persist partialize expanded to include all validation-relevant state"
    - "Storage key bumped (v2 -> v3) when persisted shape changes to force clean migration"
    - "post-batch: direct navigate() instead of modal + toast action link"

key-files:
  created: []
  modified:
    - apps/pwa/src/store/useStore.js
    - apps/pwa/src/features/scan/hooks/useScanUpload.js

key-decisions:
  - "Store invoice as S3 presigned URL (pdfUrl param) in setJobComplete, not the blob URL from setJobStart — blob URLs are session-only and do not survive refresh"
  - "Bump storage key to docling-storage-v3 to invalidate old persisted state containing blob URLs"
  - "Keep batchDoneModal state and return value in useScanUpload to avoid breaking ScanPage; simply stop calling setBatchDoneModal — modal never shows, direct navigation replaces it"
  - "batchMime derived from lastDone.file.type (File object on queue item), fallback to application/pdf"

patterns-established:
  - "Pattern: setJobComplete(products, source, pdfUrl, mime) — always pass S3 URL and MIME from job result"
  - "Pattern: bump persist storage name when partialize shape changes"

requirements-completed:
  - FLOW-01
  - FLOW-02

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 02 Plan 02: Batch Navigation and Validation Persistence Summary

**Zustand store persists extracted products and S3 invoice URL across refresh; batch mode auto-navigates to /validation instead of showing a modal with a catalogue link**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-17T10:01:38Z
- **Completed:** 2026-03-17T10:03:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended Zustand store with `currentInvoiceMime` field and updated `setJobComplete` to accept `pdfUrl` + `mime` parameters (4 total), storing the S3 presigned URL instead of the ephemeral blob URL
- Expanded `partialize` to persist `extractedProducts`, `currentInvoice`, `currentInvoiceMime`, and `pendingSource` — validation page survives browser refresh
- Bumped storage key to `docling-storage-v3` to force clean migration away from old blob URLs in localStorage
- Replaced batch-done modal + "Voir le catalogue" toast action with direct `navigate('/validation')` call
- Camera flow (`handleCameraFile`) now also passes `pdf_url` and `file.type` to `setJobComplete`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store with MIME type, pdf_url persistence, and updated partialize** - `e5e5335` (feat)
2. **Task 2: Fix batch routing to /validation and pass pdf_url + MIME to store** - `1e4cf42` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/pwa/src/store/useStore.js` - Added `currentInvoiceMime` to state/actions, updated `setJobComplete` signature (4 params), expanded `partialize`, bumped storage key to v3
- `apps/pwa/src/features/scan/hooks/useScanUpload.js` - Replaced batch modal/catalogue toast with `navigate('/validation')`; passes `batchPdfUrl`/`batchMime` and `pdf_url`/`file.type` to `setJobComplete`

## Decisions Made

- Store S3 presigned URL as `currentInvoice` at job completion (not the blob URL created at job start) — blob URLs are session-only and invalidate on refresh
- Bump persist storage name to v3 whenever partialize shape changes — prevents stale/incompatible data from old sessions
- Keep `batchDoneModal` state and return value intact in `useScanUpload` to avoid breaking `ScanPage.jsx` (cleaned up in plan 02-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Store now exposes `currentInvoice` (S3 URL) and `currentInvoiceMime` for the validation page to use for PDF/image preview (Plan 02-03)
- `batchDoneModal` cleanup in `ScanPage.jsx` is deferred to plan 02-03 as specified in the plan

---
*Phase: 02-frontend-flow*
*Completed: 2026-03-17*
