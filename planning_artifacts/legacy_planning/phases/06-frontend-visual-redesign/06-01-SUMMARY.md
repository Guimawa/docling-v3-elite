---
phase: 06-frontend-visual-redesign
plan: 01
subsystem: ui
tags: [tailwind, css, design-tokens, dark-theme, react]

# Dependency graph
requires: []
provides:
  - "Dark palette Tailwind token values (bg-primary #111827, bg-secondary #1F2937, bgLight #1F2937)"
  - "Body CSS defaults: background #111827, text #F9FAFB"
  - "tokens.js JS values synced with tailwind.config.js dark palette"
  - "New bgLight token added to both tailwind.config.js and tokens.js"
affects:
  - 06-02-PLAN
  - 06-03-PLAN
  - 06-04-PLAN
  - 06-05-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Token values only changed (not names) — components and tests continue to work unchanged"
    - "Single source of truth: tailwind.config.js drives CSS classes; tokens.js mirrors values for JS usage"

key-files:
  created: []
  modified:
    - apps/pwa/tailwind.config.js
    - apps/pwa/src/index.css
    - apps/pwa/src/design-system/tokens.js

key-decisions:
  - "Change only token VALUES, never token NAMES — preserves all existing component class names and test assertions"
  - "bgLight token added to support bg-bgLight class used in Card.test.jsx and Input.test.jsx"
  - "cta-hover changed to #C44E2F (10% darkened) per UI-SPEC for proper dark-mode hover contrast"
  - "Shadow opacity increased (0.04/0.05 → 0.08/0.12/0.15/0.20) for dark background visibility"

patterns-established:
  - "Dark palette: bg-primary=#111827 (gray-900), bg-secondary/bg-card/bgLight=#1F2937 (gray-800)"
  - "Text hierarchy: textPrimary=#F9FAFB, textSecondary=#9CA3AF, textTertiary=#6B7280, textDisabled=#4B5563"
  - "Semantic dark backgrounds: success-bg=#064E3B, warning-bg=#78350F, error-bg=#7F1D1D, info-bg=#1E3A5F"

requirements-completed: [UI-01]

# Metrics
duration: 10min
completed: 2026-03-28
---

# Phase 6 Plan 01: Dark Palette Token Foundation Summary

**Tailwind color tokens remapped from beige/light to dark palette (#111827/#1F2937) with new bgLight token, synced across tailwind.config.js, index.css body defaults, and tokens.js — 292 tests pass unchanged**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-28T22:48:00Z
- **Completed:** 2026-03-28T22:52:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All background/border/text/semantic-bg Tailwind token VALUES remapped from beige/light palette to dark (gray-900/gray-800)
- New `bgLight` token added (required by Card.jsx and Input.jsx components for elevated surfaces)
- Body defaults in index.css updated: `background-color: #111827`, `color: #F9FAFB`
- tokens.js JS values fully synced with tailwind.config.js — single source of truth established
- 292 frontend tests pass with zero failures — token name stability confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Remap tailwind.config.js color tokens to dark palette** - `1175eda` (feat)
2. **Task 2: Update index.css body defaults and sync tokens.js** - `03ed4fc` (feat)

## Files Created/Modified
- `apps/pwa/tailwind.config.js` - All color token values remapped to dark palette; bgLight token added; shadow opacity increased
- `apps/pwa/src/index.css` - Body background changed from #020617 (slate-950) to #111827 (gray-900); text color to #F9FAFB
- `apps/pwa/src/design-system/tokens.js` - All background/border/text/semantic-bg values synced; bgLight added; comments updated

## Decisions Made
- Token NAMES were never changed, only VALUES — this ensures all existing `toHaveClass('bg-primary')` test assertions continue to pass without modification
- bgLight token was added (not previously present) to support the `bg-bgLight` Tailwind class used in Card and Input components
- cta-hover updated from #F5896A to #C44E2F per UI-SPEC requirement for 10% darkened hover state on dark backgrounds
- Shadow opacity values increased across xs/sm/md/lg to improve visual depth on dark backgrounds

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met:
- `'bg-primary': '#111827'` present in tailwind.config.js
- `'bg-secondary': '#1F2937'` present in tailwind.config.js
- `bgLight: '#1F2937'` present in tailwind.config.js
- `border: '#374151'` present in tailwind.config.js
- `'text-primary': '#F9FAFB'` present in tailwind.config.js
- `'cta-hover': '#C44E2F'` present in tailwind.config.js
- `primary: '#E05C3A'` unchanged
- `cta: '#E05C3A'` unchanged
- `background-color: #111827` in index.css body
- `color: #F9FAFB` in index.css body
- `bgPrimary: '#111827'` in tokens.js
- `bgLight: '#1F2937'` in tokens.js
- `textPrimary: '#F9FAFB'` in tokens.js
- Old beige values (#FAF5F2, #F0EAE5, #020617) have 0 matches across config files

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dark token foundation is complete and stable — all 292 tests pass
- Wave 1 complete: tailwind.config.js + index.css + tokens.js all emit dark palette values
- Plans 06-02 through 06-05 can proceed — they depend on these tokens emitting dark values
- No blockers

---
*Phase: 06-frontend-visual-redesign*
*Completed: 2026-03-28*
