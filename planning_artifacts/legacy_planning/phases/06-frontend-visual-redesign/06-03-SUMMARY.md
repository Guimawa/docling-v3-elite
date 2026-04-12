---
phase: 06-frontend-visual-redesign
plan: 03
subsystem: ui
tags: [react, tailwind, dark-theme, pages, design-system, auth]

# Dependency graph
requires:
  - phase: 06-02
    provides: Shared components (Navbar, Button, Card, Input, Select, Badge) already dark-themed

provides:
  - ScanPage with bg-[#111827] root, page header patron (Camera + corail), dark scan components
  - UploadZone with gray-800 background and corail drag-active border
  - BatchQueue and JobStatusCard with gray-800 cards, gray-700 borders, corail accents
  - DevisPage with bg-[#111827] root, page header patron (FileText + corail)
  - HistoryPage with bg-[#111827] root, page header patron (Clock + corail), corail stat bar
  - SettingsPage with bg-[#111827] root, page header patron (Settings + corail), corail AI selected state
  - LoginPage and RegisterPage with bg-[#111827], gray-900 inputs, corail CTA
  - EmptyStateIllustration with dark gray-800 background, corail accent circle
  - SkeletonCard with gray-800/gray-700 skeleton colors

affects:
  - 06-04-PLAN (ValidationPage, CataloguePage, modals — only pages remaining)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page header patron: px-5 pt-6 pb-4 wrapper + icon size={24} text-[#E05C3A] + h1 font-heading text-3xl text-gray-50 + p text-md text-gray-400 ml-9"
    - "Content area: px-5 pb-24 wraps all page content for navbar clearance"
    - "Global replacement rule: all slate-* => gray-*, all emerald-* => [#E05C3A] or [#C44E2F] for hover"
    - "bg-[#111827] used as the universal page background (replaces bg-[#121212], bg-slate-950)"

key-files:
  created: []
  modified:
    - apps/pwa/src/features/scan/ScanPage.jsx
    - apps/pwa/src/features/scan/components/UploadZone.jsx
    - apps/pwa/src/features/scan/components/BatchQueue.jsx
    - apps/pwa/src/features/scan/components/JobStatusCard.jsx
    - apps/pwa/src/features/devis/DevisPage.jsx
    - apps/pwa/src/features/history/HistoryPage.jsx
    - apps/pwa/src/features/settings/SettingsPage.jsx
    - apps/pwa/src/features/auth/LoginPage.jsx
    - apps/pwa/src/features/auth/RegisterPage.jsx
    - apps/pwa/src/shared/ui/EmptyStateIllustration.jsx
    - apps/pwa/src/shared/ui/SkeletonCard.jsx

key-decisions:
  - "HistoryPage refresh button moved to header row alongside page header patron — maintains visual hierarchy and existing test behavior"
  - "Settings icon imported from lucide-react for SettingsPage header patron (was using Cpu before)"
  - "DevisPage generate button: removed inline emerald class override — now uses primary variant (bg-cta token = corail) as per UI-SPEC"
  - "SettingsPage textarea for mentions légales: migrated from bg-white to bg-gray-900 independently of Input component (inline override)"

patterns-established:
  - "Pattern: page header patron is the standard wrapper for all main pages going into 06-04"
  - "Pattern: history/devis card rows use bg-gray-800 + border-gray-700 (not the Card component which uses bg-bgLight)"

requirements-completed: [UI-01]

# Metrics
duration: 90min
completed: 2026-03-29
---

# Phase 06 Plan 03: Page Migration Dark Theme Summary

**11 page/component files migrated from slate/emerald to gray/corail dark theme with standardized page header patron (icon + title + subtitle) — 292 tests pass with zero regressions.**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-03-29T01:05:00Z
- **Completed:** 2026-03-29T01:21:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- ScanPage restructured: bg-[#111827] root, page header patron with Camera icon, scan overlay migrated to gray/corail pipeline steps; all 3 data-testids preserved
- UploadZone: gray-800 background, corail drag-active border (#E05C3A), no more slate references
- BatchQueue: gray-800 stat cards, corail "OK" stat and launch button replacing emerald-600
- JobStatusCard: gray-800/gray-700 card, corail done state, gray-400 pending icon
- DevisPage, HistoryPage, SettingsPage: all get bg-[#111827] root + standardized page header patron
- Auth pages (Login/Register): bg-[#111827], gray-900 inputs, corail focus ring and CTA button
- EmptyStateIllustration: dark gray-800 container, corail accent circle replacing emerald fill
- SkeletonCard: all slate-800/slate-700 replaced with gray-800/gray-700

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate ScanPage + scan components to dark theme** - `319ed8e` (feat)
2. **Task 2: Migrate DevisPage, HistoryPage, SettingsPage, auth pages, shared UI** - `e2e8a73` (feat)

## Files Created/Modified

- `apps/pwa/src/features/scan/ScanPage.jsx` - bg-[#111827], page header patron, corail pipeline
- `apps/pwa/src/features/scan/components/UploadZone.jsx` - gray-800 bg, corail drag border
- `apps/pwa/src/features/scan/components/BatchQueue.jsx` - gray-800 cards, corail launch btn
- `apps/pwa/src/features/scan/components/JobStatusCard.jsx` - gray-800/gray-700, corail done state
- `apps/pwa/src/features/devis/DevisPage.jsx` - bg-[#111827], FileText header, gray/corail
- `apps/pwa/src/features/history/HistoryPage.jsx` - bg-[#111827], Clock header, corail accents
- `apps/pwa/src/features/settings/SettingsPage.jsx` - bg-[#111827], Settings header, corail AI selection
- `apps/pwa/src/features/auth/LoginPage.jsx` - bg-[#111827], gray-900 inputs, corail CTA
- `apps/pwa/src/features/auth/RegisterPage.jsx` - bg-[#111827], gray-900 inputs, corail CTA
- `apps/pwa/src/shared/ui/EmptyStateIllustration.jsx` - dark bg-gray-800, corail circle
- `apps/pwa/src/shared/ui/SkeletonCard.jsx` - gray-800/gray-700 skeleton

## Decisions Made

- HistoryPage refresh button repositioned into the header row to maintain visual balance alongside the page header patron. Tests mock the Button component and don't check its position, so no regressions.
- Settings icon (from lucide-react) imported for SettingsPage header — previously the page used Cpu as its icon, which doesn't match UI-SPEC's Settings icon assignment.
- DevisPage generate PDF button: removed the inline `bg-emerald-600 hover:bg-emerald-500` override. The `primary` variant now uses `bg-cta` token which maps to corail (#E05C3A) after 06-01.
- SettingsPage textarea for "Mentions légales" migrated inline to `bg-gray-900` since it doesn't use the Input component.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 11 files updated, all pages except ValidationPage/CataloguePage and their modals now use dark theme
- Page header patron established and consistent — plan 06-04 just needs to follow the same pattern
- 292 tests pass — no regressions
- Plan 06-04 (ValidationPage + CataloguePage + modals) can begin immediately

## Self-Check: PASSED

All 11 modified files exist. Commits 319ed8e (Task 1) and e2e8a73 (Task 2) verified in git log.

---
*Phase: 06-frontend-visual-redesign*
*Completed: 2026-03-29*
