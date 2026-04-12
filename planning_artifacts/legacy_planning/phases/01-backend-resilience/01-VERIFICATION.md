---
phase: 01-backend-resilience
verified: 2026-03-17T12:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 01: Backend Resilience — Verification Report

**Phase Goal:** The backend reports failures honestly, prevents data corruption, and runs on patched dependencies
**Verified:** 2026-03-17
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fallback log contains fallback model name and exception type | VERIFIED | `main.py:455-459` — `logger.warning("Fallback %s also failed for job=%s file=%s: %s: %s", fallback_model, ..., type(fallback_err).__name__, fallback_err)` |
| 2 | Primary failure log includes job_id and filename | VERIFIED | `main.py:435-438` — `"Retry extraction job=%s file=%s avec fallback %s (primary %s failed: %s: %s)"` |
| 3 | Image preprocessor crash returns raw image and logs warning | VERIFIED | `image_preprocessor.py:68-70` — `except Exception as e: logger.error(...); return image_bytes` — unchanged |
| 4 | Submitting same file twice within 5 min returns original job_id HTTP 200 | VERIFIED | `main.py:373-383` — dedup check before job creation; returns `{"deduplicated": True}` on hit |
| 5 | Submitting different file creates new job HTTP 202 as before | VERIFIED | `main.py:385-396` — normal flow proceeds after dedup miss; returns 202 |
| 6 | pypdf patched to >= 6.8.0 (CVE-2026-28804 and CVE-2026-31826 resolved) | VERIFIED | `pyproject.toml:18` — `pypdf>=6.8.0`; `uv.lock` — pypdf 6.9.0 installed |
| 7 | pnpm transitive CVEs reduced (undici, serialize-javascript, flatted, dompurify patched) | VERIFIED | `package.json` root `pnpm.overrides` — undici>=7.24.0, serialize-javascript>=7.0.3, flatted>=3.4.0, dompurify>=3.3.2 |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/main.py` | Structured logging in `_run_extraction` fallback + dedup guard | VERIFIED | All 14 acceptance-criteria patterns confirmed present by programmatic check |
| `apps/api/services/image_preprocessor.py` | Fallback behavior intact (return raw image on crash) | VERIFIED | Lines 68-70 confirmed unchanged: `except Exception as e: logger.error(...); return image_bytes` |
| `apps/api/pyproject.toml` | `pypdf>=6.8.0` explicit constraint | VERIFIED | Line 18: `"pypdf>=6.8.0"` |
| `apps/api/uv.lock` | pypdf 6.9.0 resolved | VERIFIED | uv.lock entry: `pypdf-6.9.0` with expected SHA256 hash |
| `package.json` (workspace root) | `pnpm.overrides` with 4 patched transitive deps | VERIFIED | 4 entries confirmed: undici, serialize-javascript, flatted, dompurify |
| `pnpm-lock.yaml` | Updated with patched transitive versions | VERIFIED | Committed in ddca5a3 alongside package.json |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `main.py:_run_extraction` | `logging` | `logger.warning` in fallback `except` block | WIRED | Pattern `logger.warning("Fallback %s also failed..."` confirmed at line 455 |
| `main.py:process_invoice` | `_dedup_cache` | SHA256 lookup before job creation | WIRED | `dedup_hash = _dedup_key(...)` at pos 14513 precedes `job_id = str(uuid.uuid4())` at pos 14958 — ordering confirmed programmatically |
| `apps/api/pyproject.toml` | `uv.lock` | `uv sync` installs patched versions | WIRED | pypdf 6.9.0 present in uv.lock; commit ddca5a3 covers both files |
| `package.json` (root) | `pnpm-lock.yaml` | `pnpm install` installs overrides | WIRED | All 4 override packages present in lockfile; pnpm.overrides warning resolved by correct root placement |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BACK-01 | 01-01-PLAN.md | Fallback Gemini/Bytez logs each error with model name + exception type before fallback (no bare except:pass) | SATISFIED | `except Exception as fallback_err` at line 454 with `logger.warning` at line 455; zero `except Exception:\n.*pass` patterns in extraction path |
| BACK-02 | 01-01-PLAN.md | Image preprocessor crash -> log warning + fallback to raw image, does not fail the job | SATISFIED | `image_preprocessor.py:68-70` confirmed unchanged and correct |
| BACK-03 | 01-02-PLAN.md | Batch save endpoint has idempotency protection (dedup by file hash) — no duplicates on double-tap | SATISFIED | `_dedup_cache` + `_dedup_key` (SHA256) + 5-minute TTL + HTTP 200 `deduplicated:true` response — all confirmed in main.py |
| QWIN-02 | 01-03-PLAN.md | CVEs pip/npm corrected (install patched versions identified in pyproject.toml + package.json) | SATISFIED | pypdf 6.9.0 installed (2 HIGH CVEs resolved); 4 frontend transitive overrides applied (9/10 CVEs resolved; esbuild deferred — requires vite v6) |

All 4 requirements declared across the 3 plans are satisfied. No orphaned requirements (REQUIREMENTS.md traceability table maps exactly BACK-01, BACK-02, BACK-03, QWIN-02 to Phase 1).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/main.py` | 844 | `except Exception:` without named variable | Info | Legitimate JSON parse fallback (`body = {}`) in an unrelated endpoint (`update_community_prefs`). Pre-existing, not introduced by this phase, not in extraction path. No action required. |

No blockers. No stubs. No placeholder returns in the modified code paths.

---

### Human Verification Required

None identified. All truths are verifiable programmatically through code inspection.

The one deferred item (esbuild CVE GHSA-67mh-4wv8-2f99, moderate severity, dev-only) was a documented architectural decision requiring vite 5 -> 6 upgrade, not a phase failure. QWIN-02 is satisfied at the level the phase plan defined it.

---

### Gaps Summary

No gaps. All phase objectives are fully met:

1. **BACK-01/BACK-02 (Plan 01):** The silent `except Exception: pass` at the extraction fallback is replaced with structured `logger.warning` capturing fallback model name, job_id, filename, and exception type. The primary-failure and final-error logs now include job_id for full traceability. Image preprocessor fallback confirmed intact.

2. **BACK-03 (Plan 02):** In-memory SHA256 dedup guard is in place on `POST /api/v1/invoices/process`. Dedup check runs before DB write. Duplicate submissions within 5 minutes return the original job_id with HTTP 200 and `deduplicated: true`. New files get HTTP 202 as before.

3. **QWIN-02 (Plan 03):** pypdf 6.9.0 resolves 2 HIGH backend CVEs. Four pnpm workspace overrides at the correct root level resolve 9/10 frontend CVEs. One remaining esbuild CVE is moderate severity, dev-only, and explicitly deferred with documented rationale.

All 3 commits verified to exist in the repository (c3828ed, a503d45, ddca5a3). Python syntax valid. Phase goal achieved.

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
