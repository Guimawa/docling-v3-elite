# Phase 1: Backend Resilience - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase hardens the backend error handling, adds idempotency protection against double-tap submissions, and patches known CVEs. No new features — defensive coding and dependency hygiene only.

</domain>

<decisions>
## Implementation Decisions

### Error Logging Strategy
- Log Gemini/Bytez errors with structured format: `model={model_id}, error={type(e).__name__}: {e}` — always include model name and exception type
- Replace the bare `except Exception: pass` at main.py:418 with `logger.warning(f"Fallback {fallback_model} also failed: {type(e).__name__}: {e}")` — no more silent pass
- Do NOT duplicate preprocessor logging in the orchestrator — image_preprocessor.py already handles its own fallback with warning logs (lines 68-70)
- Include `job_id` and `filename` in all fallback error log messages in main.py `_run_extraction()`

### Idempotency Protection
- Use SHA256 hash of `(filename + file_size + user_id)` as dedup key — computed server-side, no frontend changes needed
- Store dedup state in-memory (dict with TTL cleanup) — sufficient for single-user, avoids DB table overhead
- Dedup window: 5 minutes — covers slow 4G double-tap without blocking legitimate resubmissions
- On duplicate detected: return the original `job_id` with HTTP 200 — frontend polls naturally, no special handling needed

### CVE Patching
- Install patched dependencies with Guilhem's explicit approval before running `uv sync` / `pnpm install`
- Run `pip audit` and `npm audit` after installation to verify CVEs are resolved
- Run existing test suites (~90 backend + ~51 frontend) after patching to verify no regressions

### Claude's Discretion
- Implementation details of the in-memory TTL dict (cleanup interval, data structure)
- Exact log message formatting beyond the required model+type fields
- Order of operations for the fixes (logging → idempotency → CVE or parallel)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `image_preprocessor.py` — already has proper fallback (lines 68-70), returns original image on error
- `orchestrator.py:74-81` — Gemini fallback to Bytez already exists, needs better logging
- `main.py:380-431` — `_run_extraction()` has the circuit breaker + dual fallback logic
- `db_manager.py` — `upsert_products_batch()` uses upsert (handles DB-level duplicates)
- Migration `a007` — already has `duplicate_object` handling at DB constraint level

### Established Patterns
- Python logging: `logger = logging.getLogger(__name__)` at module level
- Error handling: catch specific exceptions, log at appropriate level (warning for service issues, error for failures)
- FastAPI: HTTPException for client errors, structured JSON responses
- Circuit breaker pattern already in main.py for Gemini resilience

### Integration Points
- `main.py` `/api/v1/invoices/process` — the upload endpoint that needs idempotency guard
- `main.py:_run_extraction()` — background task that needs better error logging
- `orchestrator.py:process_file()` — the pipeline that logs Gemini/Bytez errors
- `pyproject.toml` / `package.json` — CVE versions already identified

</code_context>

<specifics>
## Specific Ideas

- The bare `except Exception: pass` at main.py:418 is the most critical fix — it silences fallback failures completely
- Image preprocessor fallback is already correctly implemented — no changes needed there
- Idempotency should be at the endpoint level (before job creation), not deep in the pipeline

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
