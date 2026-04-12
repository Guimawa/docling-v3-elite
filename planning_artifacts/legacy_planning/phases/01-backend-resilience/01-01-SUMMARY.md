---
phase: 01-backend-resilience
plan: 01
subsystem: api
tags: [fastapi, logging, error-handling, gemini, fallback]

# Dependency graph
requires: []
provides:
  - Structured error logging in _run_extraction fallback path (fallback model name, job_id, filename, exception type)
  - No silent exception swallowing in Gemini fallback path
  - Verified image_preprocessor.py fallback already correct (returns raw image on crash)
affects: [02-backend-resilience, 04-e2e-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "logger.warning with fallback_model, job_id, filename, type(err).__name__, err for fallback failures"
    - "logger.error with job_id, filename, model, type(e).__name__, e, exc_info=True for final extraction errors"

key-files:
  created: []
  modified:
    - apps/api/main.py

key-decisions:
  - "Preserve existing flow after fallback warning: execution falls through to _gemini_cb.record_failure() using original error 'e', not fallback_err"
  - "Do not touch orchestrator.py or image_preprocessor.py — both already log adequately"

patterns-established:
  - "Fallback except blocks: always name the exception and log with warning level including model, job, file, and exception type"
  - "Error logs: always include job_id for traceability across log lines"

requirements-completed: [BACK-01, BACK-02]

# Metrics
duration: 10min
completed: 2026-03-17
---

# Phase 1 Plan 01: Backend Resilience — Silent Fallback Fix Summary

**Replaced `except Exception: pass` in _run_extraction with structured logger.warning capturing fallback model name, job_id, filename, and exception type; enriched primary-failure and final error logs with job_id**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-17T04:28:00Z
- **Completed:** 2026-03-17T04:38:34Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments
- Eliminated the silent `except Exception: pass` at line 418 of `_run_extraction` — fallback failures are now observable in logs
- Primary-failure info log enriched with job_id, model name, and primary exception type/message
- Final error log enriched with job_id, filename, and model name for full traceability
- Confirmed `image_preprocessor.py` fallback (lines 68-70) already correct and left untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace silent except:pass with structured logging in fallback path** - `c3828ed` (fix)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `apps/api/main.py` - Three targeted log improvements in `_run_extraction`: info log at retry, warning log at fallback failure, error log at final failure

## Decisions Made
- Preserved the existing control flow: after the new `logger.warning` in the fallback except block, execution falls through to `_gemini_cb.record_failure()` on the next line, which correctly uses the original exception `e` for the job error message. The `fallback_err` variable is only used inside the warning log.
- Did not modify `orchestrator.py` (its warning at line 75 is adequate) or `image_preprocessor.py` (already correct).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three edits applied cleanly, syntax verified via `ast.parse`, all acceptance criteria passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Silent swallowing is gone. Debugging Gemini failures is now possible with log correlation by job_id.
- Ready for Plan 02 of Phase 1 (next backend resilience item).
- No blockers introduced.

## Self-Check: PASSED

- `apps/api/main.py` — FOUND
- `.planning/phases/01-backend-resilience/01-01-SUMMARY.md` — FOUND
- Commit `c3828ed` — FOUND

---
*Phase: 01-backend-resilience*
*Completed: 2026-03-17*
