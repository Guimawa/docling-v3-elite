---
phase: 3
slug: history-pdf-access
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest 8+ with pytest-asyncio, pytest-timeout |
| **Framework (frontend)** | Vitest 3.2.4 + @testing-library/react 16.3.2 |
| **Config file (backend)** | `apps/api/pyproject.toml` `[tool.pytest.ini_options]` |
| **Config file (frontend)** | `apps/pwa/vite.config.js` `test:` block |
| **Quick run (backend)** | `cd apps/api && uv run pytest tests/api/test_stats_history.py -x -q` |
| **Quick run (frontend)** | `cd apps/pwa && pnpm test -- HistoryPage` |
| **Full suite (backend)** | `cd apps/api && uv run pytest -x -q` |
| **Full suite (frontend)** | `cd apps/pwa && pnpm test:coverage` |
| **Estimated runtime** | ~30s backend, ~20s frontend |

---

## Sampling Rate

- **After every task commit:** Run backend quick + frontend quick
- **After every plan wave:** Run full backend + full frontend suites
- **Before `/gsd:verify-work`:** Both full suites must be green
- **Max feedback latency:** ~50 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | HIST-02 | unit (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -k pdf -x` | partial | ⬜ pending |
| 03-01-02 | 01 | 1 | HIST-02 | unit (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -k not_configured -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | HIST-02 | integration (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -k cross_user -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | HIST-01, QWIN-03 | unit (frontend) | `cd apps/pwa && pnpm test -- HistoryPage` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | HIST-01 | unit (frontend) | `cd apps/pwa && pnpm test -- HistoryPage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/pwa/src/features/history/__tests__/HistoryPage.test.jsx` — stubs for HIST-01, QWIN-03
- [ ] `apps/api/tests/api/test_stats_history.py` — add stub tests for head_object 404, cross-user access, storj not configured

*Wave 0 for frontend: new file. Backend: augment existing file.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF opens in browser tab from Storj | HIST-02 | Requires live Storj credentials + real PDF | Click "Voir PDF" on real invoice in history; verify browser opens PDF in new tab |
| 403 never shown to user | HIST-02 | Browser 403 page requires live test | Confirm toast appears instead of browser 403 when file missing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
