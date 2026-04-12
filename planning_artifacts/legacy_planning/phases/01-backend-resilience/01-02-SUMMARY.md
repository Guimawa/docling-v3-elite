---
phase: 01-backend-resilience
plan: 02
subsystem: api
tags: [fastapi, idempotency, dedup, hashlib, sha256, mobile, upload]

# Dependency graph
requires:
  - phase: 01-backend-resilience
    plan: 01
    provides: "Circuit breaker + fallback model already in place on process_invoice"
provides:
  - "In-memory idempotency guard on POST /api/v1/invoices/process (5-minute TTL)"
  - "_dedup_cache dict with SHA256 key (filename:size:user_id)"
  - "HTTP 200 + deduplicated=true response for duplicate submissions within TTL"
affects:
  - frontend polling logic (already handles 200 with job_id transparently)
  - Phase 4 E2E tests (should assert deduplicated=True on double-tap scenario)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory dedup cache with TTL: module-level dict cleaned on each request"
    - "SHA256 composite key (filename + file_size + user_id) for upload identity"
    - "Early-return pattern: idempotency check before any DB write"

key-files:
  created: []
  modified:
    - apps/api/main.py

key-decisions:
  - "In-memory dict chosen over DB table — single-server, single-user context; no persistence needed across restarts"
  - "Key = SHA256(filename:file_size:user_id) rather than file content hash — avoids reading full bytes twice and is sufficient for double-tap detection"
  - "Cleanup is synchronous on each request (not a background task) — O(n) on cache size, acceptable at low volume"

patterns-established:
  - "Idempotency-before-DB: dedup check runs before job_id generation and DBManager.create_job"

requirements-completed:
  - BACK-03

# Metrics
duration: 1min
completed: 2026-03-17
---

# Phase 1 Plan 02: Idempotency Guard Summary

**In-memory SHA256 dedup cache on POST /api/v1/invoices/process — double-tap uploads within 5 minutes return original job_id (HTTP 200) instead of creating duplicate catalogue entries**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-17T10:02:25Z
- **Completed:** 2026-03-17T10:03:30Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Added `import hashlib` and three new module-level constructs (`_DEDUP_TTL_SECONDS`, `_dedup_cache`, `_dedup_key()`, `_dedup_cleanup()`) to `apps/api/main.py`
- Inserted idempotency check inside `process_invoice` — runs after file bytes are read, before any DB write
- Dedup hit returns HTTP 200 with `{"job_id": <existing>, "status": "processing", "deduplicated": true}`; new uploads proceed as before with HTTP 202
- Expired entries are cleaned up synchronously on every request via `_dedup_cleanup()`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add in-memory dedup cache with TTL to process_invoice endpoint** - `a503d45` (feat)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified

- `apps/api/main.py` — Added `import hashlib`, dedup constants/functions at module level, and idempotency guard inside `process_invoice`

## Decisions Made

- Used in-memory dict over a DB table: single-server deployment, no need for durability across restarts, keeps the fix zero-migration
- Key is SHA256 of `filename:file_size:user_id` rather than a content hash — avoids hashing potentially 50 MB twice; sufficient to detect identical re-submissions from the same user
- Cleanup is called synchronously at the top of each request instead of a background task — simple and correct at low cache sizes

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 objective fully satisfied: duplicate uploads within 5 minutes are safely deduplicated without touching the database or frontend
- Plan 03 can proceed (CVE pip/npm upgrades, independent of this change)
- Phase 4 E2E tests should include a double-tap scenario asserting `deduplicated: true` in the 200 response

---
*Phase: 01-backend-resilience*
*Completed: 2026-03-17*
