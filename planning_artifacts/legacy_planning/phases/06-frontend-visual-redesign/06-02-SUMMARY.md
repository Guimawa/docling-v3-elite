---
phase: 06-frontend-visual-redesign
plan: 02
subsystem: ui
tags: [react, tailwind, dark-theme, components, design-system]

# Dependency graph
requires:
  - phase: 06-01
    provides: Tailwind token updates (bgLight, cta, primary colors) established in Wave 0

provides:
  - Dark-themed Navbar with corail (#E05C3A) active state and gray-800/70 background
  - Dark Button variants (secondary bg-gray-700, ghost corail, primary hover #C44E2F)
  - Card with rounded-xl, dark shadows, gray-50 title, gray-400 subtitle
  - Input with bg-gray-900 default, bg-bgLight filled preserved, gray-500 placeholder
  - Select with bg-gray-900 and gray-700 border
  - Badge with new accent variant (corail #E05C3A)

affects:
  - 06-03-PLAN (page-level redesign will consume all 6 updated shared components)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Corail color #E05C3A used for all active/focus states across shared components"
    - "bg-bgLight token preserved in class names for test compatibility; token value updated in Wave 0"
    - "bg-gray-700/bg-gray-800 used for secondary surfaces and navbar background"

key-files:
  created: []
  modified:
    - apps/pwa/src/components/Navbar.jsx
    - apps/pwa/src/components/Button.jsx
    - apps/pwa/src/components/__tests__/Button.test.jsx
    - apps/pwa/src/components/Card.jsx
    - apps/pwa/src/components/Input.jsx
    - apps/pwa/src/components/Select.jsx
    - apps/pwa/src/components/Badge.jsx

key-decisions:
  - "bg-bgLight class preserved in Input filled variant and Card despite dark theme — token value was updated in Wave 0 (06-01), tests assert class name not computed value"
  - "Badge accent variant added as additive change — existing variant strings unchanged to avoid breaking Badge.test.jsx assertions"

patterns-established:
  - "Pattern: All interactive focus rings use focus:ring-[#E05C3A]/20 for consistency across Input, Select, Button"
  - "Pattern: Icon wrappers use text-gray-400 instead of text-primary for dark theme readability"
  - "Pattern: Labels use text-gray-300, placeholder uses text-gray-500 to maintain WCAG contrast on dark backgrounds"

requirements-completed: [UI-01]

# Metrics
duration: 70min
completed: 2026-03-29
---

# Phase 06 Plan 02: Shared Components Dark Theme Summary

**6 shared components (Navbar, Button, Card, Input, Select, Badge) updated to dark theme with corail (#E05C3A) active/focus states, gray-800/gray-900 backgrounds, and a new Badge accent variant — 292 tests pass.**

## Performance

- **Duration:** ~70 min
- **Started:** 2026-03-28T23:00:00Z
- **Completed:** 2026-03-29T00:01:51Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Navbar migrated from slate/emerald to gray-800/70 background + corail active indicator dot and text, all data-testid attributes preserved
- Button secondary variant updated to bg-gray-700 (was bg-primary); ghost and primary hover states aligned to corail; Button.test.jsx assertion updated
- Card gets rounded-xl corners, gray-700 bordered variant, dark shadow for elevated variant, dark CardHeader/CardFooter text
- Input and Select get bg-gray-900 default, corail focus rings, gray-300 labels, gray-400 icons — bg-bgLight preserved in Input filled variant for test compatibility
- Badge gains `accent` variant with `bg-[#E05C3A]/15 text-[#E05C3A] border-[#E05C3A]/20` and `accent` dot color — all existing variant strings unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Navbar and Button to dark theme** - `d9c6c1e` (feat)
2. **Task 2: Update Card, Input, Select, Badge to dark theme** - `e72ef76` (feat)

## Files Created/Modified

- `apps/pwa/src/components/Navbar.jsx` - Gray-800/70 bg, corail active state, no emerald/slate class references
- `apps/pwa/src/components/Button.jsx` - Secondary bg-gray-700, ghost corail, focus rings updated
- `apps/pwa/src/components/__tests__/Button.test.jsx` - Secondary variant assertion updated to bg-gray-700
- `apps/pwa/src/components/Card.jsx` - rounded-xl, gray-700 borders, dark shadow, gray-50/gray-400 text
- `apps/pwa/src/components/Input.jsx` - bg-gray-900 default, corail focus ring, gray-400 icons, gray-300 label
- `apps/pwa/src/components/Select.jsx` - bg-gray-900, gray-700 border, corail focus ring, gray-400 chevron
- `apps/pwa/src/components/Badge.jsx` - accent variant added with corail colors

## Decisions Made

- `bg-bgLight` preserved as a CSS class name in Card and Input filled variant — the token value was updated in plan 06-01 to map to `#1F2937` (dark). Changing the class name would break Card.test.jsx and Input.test.jsx assertions without any visual benefit.
- Badge accent added as a pure additive change. Existing variants (success, warning, error, info, neutral) were not touched to keep test assertions green.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The `grep -c 'emerald\|slate' Navbar.jsx` check from the plan's acceptance criteria returns 2 false positives — the string `-translate-x-1/2` contains the substring "late" which matches the `slate` pattern. Actual inspection of the file confirms zero Tailwind `slate-*` or `emerald-*` color class references exist in the file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 shared components use dark theme per UI-SPEC contract
- Badge accent variant ready for use in page-level components in plan 06-03
- 292 tests pass — no regressions introduced
- Page-level redesign (plan 06-03) can begin immediately

## Self-Check: PASSED

- FOUND: apps/pwa/src/components/Navbar.jsx
- FOUND: apps/pwa/src/components/Button.jsx
- FOUND: apps/pwa/src/components/Card.jsx
- FOUND: apps/pwa/src/components/Input.jsx
- FOUND: apps/pwa/src/components/Select.jsx
- FOUND: apps/pwa/src/components/Badge.jsx
- FOUND: .planning/phases/06-frontend-visual-redesign/06-02-SUMMARY.md
- FOUND: commit d9c6c1e (Task 1)
- FOUND: commit e72ef76 (Task 2)

---
*Phase: 06-frontend-visual-redesign*
*Completed: 2026-03-29*
