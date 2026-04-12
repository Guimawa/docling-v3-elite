---
phase: 02-frontend-flow
plan: 01
subsystem: ui
tags: [react, pwa, spline, lucide, performance, mobile]

# Dependency graph
requires: []
provides:
  - SplineScene component removed from codebase
  - All 5 consumer pages use gradient icon placeholders
  - "@splinetool packages removed from package.json"
  - ScanPage test mocks cleaned up
affects: [03-history-pdf, 04-e2e-tests, 05-unit-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page header icons: w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center pattern"

key-files:
  created: []
  modified:
    - apps/pwa/src/features/scan/ScanPage.jsx
    - apps/pwa/src/features/validation/ValidationPage.jsx
    - apps/pwa/src/features/devis/DevisPage.jsx
    - apps/pwa/src/features/settings/SettingsPage.jsx
    - apps/pwa/src/shared/ui/ErrorBoundary.jsx
    - apps/pwa/package.json
    - apps/pwa/src/features/scan/__tests__/ScanPage.test.jsx

key-decisions:
  - "Replace SplineScene 3D widget with Lucide gradient icon blocks — each page reuses an already-imported Lucide icon to avoid new dependencies"
  - "Do not run pnpm install after removing @splinetool — per project rules, no dep install without Guilhem approval"

patterns-established:
  - "Header icon placeholder: <div className='w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-X to-Y flex items-center justify-center'><Icon size={28} className='text-white' /></div>"

requirements-completed:
  - QWIN-01

# Metrics
duration: 8min
completed: 2026-03-17
---

# Phase 2 Plan 01: Remove SplineScene Summary

**Eliminated 3-5 MB Spline 3D bundle per page load by replacing SplineScene with Lucide gradient icon placeholders across 5 pages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-17T10:10:00Z
- **Completed:** 2026-03-17T10:18:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Removed SplineScene import and JSX block from 5 consumer files (ScanPage, ValidationPage, DevisPage, SettingsPage, ErrorBoundary)
- Deleted `apps/pwa/src/components/SplineScene.jsx` entirely — file no longer exists
- Removed `@splinetool/react-spline` from dependencies and `@splinetool/runtime` from devDependencies in package.json
- Cleaned stale `@splinetool/react-spline` and `@/components/SplineScene` vi.mock() calls from ScanPage.test.jsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove SplineScene imports and JSX from all consumer pages** - `dc6f64e` (feat)
2. **Task 2: Delete SplineScene component, remove @splinetool deps, update test mock** - `952bd02` (feat)

## Files Created/Modified

- `apps/pwa/src/features/scan/ScanPage.jsx` - SplineScene import removed; hero replaced with Sparkles gradient icon
- `apps/pwa/src/features/validation/ValidationPage.jsx` - SplineScene import removed; header replaced with CheckCircle2 gradient icon
- `apps/pwa/src/features/devis/DevisPage.jsx` - SplineScene import removed; header replaced with FileText gradient icon
- `apps/pwa/src/features/settings/SettingsPage.jsx` - SplineScene import removed; header replaced with Cpu gradient icon
- `apps/pwa/src/shared/ui/ErrorBoundary.jsx` - SplineScene import removed; error icon replaced with RotateCcw gradient icon
- `apps/pwa/package.json` - @splinetool/react-spline and @splinetool/runtime entries deleted
- `apps/pwa/src/features/scan/__tests__/ScanPage.test.jsx` - Two stale vi.mock() blocks removed

## Decisions Made

- Each replacement uses an already-imported Lucide icon to keep zero new dependencies
- `pnpm install` intentionally not run after removing @splinetool — per project rule, dep installs require Guilhem approval

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SplineScene fully removed; no broken imports remain in the PWA source
- `pnpm install` should be run by Guilhem at next opportunity to prune the physical node_modules from the @splinetool packages (package.json is already updated)
- Ready to continue with Phase 2 Plan 02 and subsequent plans

---
*Phase: 02-frontend-flow*
*Completed: 2026-03-17*
