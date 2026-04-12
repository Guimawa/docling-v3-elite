# Phase 03: History & PDF Access - Research

**Researched:** 2026-03-17
**Domain:** boto3 S3 head_object / FastAPI error handling / React state management / Vitest frontend unit tests
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backend File Verification**
- Add `head_object` check in `StorageService.get_presigned_url_from_pdf_url` before generating the presigned URL — verify the file actually exists in Storj before returning a URL
- If file is missing from Storj: raise HTTPException 404 with `"Fichier PDF introuvable dans le stockage cloud"` — clear, not silent
- If StorageService not configured (no STORJ_ACCESS_KEY): return 503 `"Stockage cloud non configuré"` instead of the current fallback to raw pdf_url
- No fallback to raw pdf_url when Storj is configured — fail clearly with appropriate HTTP error code

**Frontend Error UX**
- On 404 from `/history/{id}/pdf`: `toast.error("PDF introuvable — ce fichier a été supprimé du stockage cloud")`
- On 500 from `/history/{id}/pdf`: `toast.error("Erreur de stockage — réessayez plus tard")` — different message from 404
- After a 404 error, disable the PDF button for that invoice in local component state — prevents re-click on known missing file for the session
- Add `data-testid="btn-voir-pdf-{facture.id}"` on PDF buttons now — Phase 4 E2E tests will need them

**Tests & Coverage**
- Backend: add test for `head_object` returning 404 (file missing in Storj) → endpoint must return 404 with clear message (mock S3 client)
- Backend: add cross-user access test → invoice owned by user A, request from user B → must return 404 (ownership isolation)
- Frontend: add unit test in `HistoryPage.test.jsx` → mock API returning 404 → verify toast is shown with correct message

### Claude's Discretion
- Implementation details of `head_object` call (exact boto3 API, exception type to catch)
- Whether `head_object` is added in `StorageService` or directly in the main.py endpoint handler
- Test mock setup details (pytest fixtures for mocked S3)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | Presigned URLs Storj générées au clic (lazy), pas au chargement de la page | Already lazy in handleViewPdf; behavior confirmed correct — focus is on head_object and 404 handling |
| HIST-02 | Boutons accès PDF fonctionnels dans l'historique (branche feat/boutons-acces-pdf-factures) | StorageService.get_presigned_url_from_pdf_url needs head_object before presign; frontend needs 404/500 differentiation |
| QWIN-03 | Presigned URLs lazy dans l'historique (générer au clic pas au load) | Duplicate of HIST-01; same implementation covers both |
</phase_requirements>

---

## Summary

Phase 3 is a targeted fix: three files change (StorageService, main.py endpoint, HistoryPage.jsx) and two test files are added or extended. The domain is narrow — boto3 S3 `head_object`, FastAPI exception propagation, and React local state management for disabled buttons.

The core bug is in `StorageService.get_presigned_url_from_pdf_url`: it never checks whether the file actually exists before calling `generate_presigned_url`. A presigned URL is generated regardless — the URL is valid syntactically but returns 403/404 from Storj at fetch time because the object is gone. The fix is a `head_object` call that raises `ClientError` with code `'404'` when the object is missing, which must be translated into an HTTPException 404 in the endpoint.

The second bug is in the `/api/v1/history/{facture_id}/pdf` endpoint: when StorageService is not configured (`_get_client()` returns None), `get_presigned_url_from_pdf_url` silently falls back to returning the raw `pdf_url` string. The locked decision replaces this with an explicit 503. On the frontend, `handleViewPdf` catches all errors with a single generic message — it must be extended to inspect the HTTP status code and emit a specific toast per status, plus disable the button locally on 404.

**Primary recommendation:** Add `head_object` to `StorageService` as a classmethod, call it from `get_presigned_url_from_pdf_url`, and propagate exceptions up to the endpoint via a clearly-named exception or by returning `None` with a sentinel. Given the endpoint already does the `try/raise HTTPException` dance, the cleanest pattern is: `get_presigned_url_from_pdf_url` raises `ClientError` (let it bubble) or returns a typed result — the endpoint catches it and raises the correct HTTP error.

---

## Standard Stack

### Core (already in project — no new deps)

| Library | Version in project | Purpose | Notes |
|---------|-------------------|---------|-------|
| boto3 | via uv/pyproject | S3 API client (Storj S3-compatible) | `head_object`, `generate_presigned_url`, `ClientError` |
| botocore | (boto3 dep) | Exception types | `botocore.exceptions.ClientError`, `NoCredentialsError` |
| FastAPI | (main.py) | HTTP exceptions | `HTTPException(status_code=...)` |
| React 19 | ^19.2.4 | Frontend state | `useState` Set<number> for missingPdf |
| sonner | ^2.0.4 | Toast notifications | Already imported in HistoryPage |
| axios | ^1.13.5 (via apiClient) | HTTP — status code on error | `error.response?.status` |
| Vitest | ^3.2.4 | Frontend unit tests | `vi.mock`, `waitFor`, `userEvent` |
| @testing-library/react | ^16.3.2 | Render + assert | Same pattern as CataloguePage.test.jsx |
| unittest.mock | stdlib Python | Mock boto3 client | `patch`, `MagicMock` |

**No new installations needed.** All libraries are already present.

### Alternatives Considered

| Standard choice | Alternative | Why standard wins |
|-----------------|-------------|-------------------|
| `head_object` in StorageService | `head_object` directly in main.py endpoint | Keeps S3 logic in StorageService; endpoint stays thin |
| `ClientError` code `'404'` | `ClientError` code `'NoSuchKey'` | Both are emitted by Storj/S3 for missing objects; `'404'` is the numeric form, `'NoSuchKey'` is the string form — catch both |

---

## Architecture Patterns

### Recommended Change Locations

```
apps/api/
  services/storage_service.py    ← add head_object classmethod + update get_presigned_url_from_pdf_url
  main.py (lines 627-646)        ← update 503 branch + let StorageService exceptions bubble
  tests/api/test_stats_history.py ← add 2 new backend tests

apps/pwa/src/features/history/
  HistoryPage.jsx                ← extend handleViewPdf, add missingPdf state, add data-testid
  __tests__/HistoryPage.test.jsx ← new file, 404 toast test
```

### Pattern 1: boto3 head_object — object existence check

**What:** `head_object` returns object metadata if found, raises `ClientError` with `Error.Code == '404'` (or `'NoSuchKey'`) if the object does not exist.

**When to use:** Before generating a presigned URL — verify the file is actually in the bucket.

```python
# Source: boto3 official docs + botocore ClientError pattern
from botocore.exceptions import ClientError

@classmethod
def _object_exists(cls, client, key: str) -> bool:
    """Returns True if key exists in bucket, False if 404, re-raises other errors."""
    try:
        client.head_object(Bucket=Config.STORJ_BUCKET, Key=key)
        return True
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ("404", "NoSuchKey"):
            return False
        raise  # re-raise unexpected errors (403 access denied, 5xx, etc.)
```

**Critical detail:** `head_object` raises `ClientError` for ANY non-2xx response. The error code discriminates between "file missing" (404/NoSuchKey) and other failures (403, 500). Re-raise non-404 errors — do not swallow them.

### Pattern 2: Propagating the 404 up to the endpoint

**Option A — raise inside StorageService** (recommended by discretion): raise a custom exception from `get_presigned_url_from_pdf_url`, catch it in the endpoint.

**Option B — return sentinel + check in endpoint**: return `None` or a typed result from `get_presigned_url_from_pdf_url` and check in the endpoint. This is already the pattern used (`if not presigned: raise HTTPException(500, ...)`).

Given Option B is already in place, extending it is lower risk: add a second return value or a flag. However, a cleaner approach for the 404 case is to raise `FileNotFoundError` (stdlib) from `get_presigned_url_from_pdf_url` when `head_object` returns 404, then catch it in the endpoint:

```python
# main.py endpoint — extended catch
except FileNotFoundError:
    raise HTTPException(status_code=404, detail="Fichier PDF introuvable dans le stockage cloud")
```

This avoids changing the return type of `get_presigned_url_from_pdf_url` and keeps the endpoint pattern consistent.

### Pattern 3: Frontend — missingPdf Set + status-based toast

**What:** `missingPdf` is a `Set` of invoice IDs for which the PDF is known missing (404 received this session). Button gets `disabled` and different visual when the ID is in the set.

**When to use:** Only for 404 responses — 500 errors are transient (retry makes sense), 404 is permanent (file deleted).

```jsx
// Source: existing loadingPdf pattern in HistoryPage.jsx — mirrored
const [missingPdf, setMissingPdf] = useState(new Set())

const handleViewPdf = async (facture) => {
  if (!facture.pdf_url || !facture.id) return
  if (missingPdf.has(facture.id)) return  // guard: already known missing
  setLoadingPdf(facture.id)
  try {
    const { data } = await apiClient.get(ENDPOINTS.pdfUrl(facture.id))
    if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    else toast.error('URL PDF indisponible')
  } catch (err) {
    const status = err?.response?.status
    if (status === 404) {
      toast.error('PDF introuvable — ce fichier a été supprimé du stockage cloud')
      setMissingPdf(prev => new Set([...prev, facture.id]))
    } else {
      toast.error('Erreur de stockage — réessayez plus tard')
    }
  } finally {
    setLoadingPdf(null)
  }
}
```

**data-testid placement:**
```jsx
<Button
  data-testid={`btn-voir-pdf-${f.id}`}
  onClick={() => handleViewPdf(f)}
  disabled={loadingPdf === f.id || missingPdf.has(f.id)}
  ...
>
```

### Pattern 4: Backend test — mocking boto3 S3 client

**What:** Unit-level test that patches `StorageService._get_client` to return a mock that simulates `head_object` raising ClientError 404.

**When to use:** When testing StorageService behavior without real Storj credentials.

```python
# Source: Python unittest.mock docs + project conftest pattern
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

def _make_client_error(code: str) -> ClientError:
    return ClientError(
        error_response={"Error": {"Code": code, "Message": ""}},
        operation_name="HeadObject",
    )

def test_pdf_endpoint_returns_404_when_file_missing_in_storj(http_client):
    """
    When head_object raises ClientError 404, endpoint must return 404
    with the configured French message.
    """
    mock_s3 = MagicMock()
    mock_s3.head_object.side_effect = _make_client_error("404")

    with patch("services.storage_service.StorageService._get_client", return_value=mock_s3), \
         patch("services.storage_service.Config.STORJ_ACCESS_KEY", "fake"), \
         patch("services.storage_service.Config.STORJ_SECRET_KEY", "fake"), \
         patch("services.storage_service.Config.STORJ_BUCKET", "docling"):
        # Need a real facture_id in DB — this requires authenticated_client fixture
        # See test architecture section below
        ...
```

**Important detail:** The endpoint calls `DBManager.get_facture_pdf_url` first — if the facture doesn't exist or belongs to another user, it returns 404 before hitting StorageService. To test the `head_object` path, the test must either: (a) use `authenticated_client` to create a real facture row first, or (b) patch `DBManager.get_facture_pdf_url` to return a fake URL. Option (b) is faster and avoids real DB dependency.

### Pattern 5: Frontend Vitest test — 404 toast assertion

**What:** Render HistoryPage with mocked apiClient, trigger click on PDF button, assert toast.error is called with exact message.

```jsx
// Source: CataloguePage.test.jsx pattern + ScanPage.test.jsx pattern
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const mockGet = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/shared/lib/apiClient', () => ({ default: { get: (...args) => mockGet(...args) } }))
vi.mock('sonner', () => ({ toast: { error: mockToastError, success: vi.fn() } }))
// also mock framer-motion (same pattern as ScanPage.test.jsx)
// also mock ENDPOINTS

import HistoryPage from '../HistoryPage'

test('affiche toast 404 quand PDF manquant dans Storj', async () => {
  const user = userEvent.setup()

  // Initial history load returns one invoice with pdf_url
  mockGet.mockImplementation((url) => {
    if (url?.includes?.('/history') && !url?.includes?.('/pdf')) {
      return Promise.resolve({
        data: { history: [{ id: 1, pdf_url: 'https://example.com/file.pdf', filename: 'test.pdf', statut: 'traite', nb_produits_extraits: 3 }], total: 1 }
      })
    }
    if (url?.includes?.('/pdf')) {
      // Simulate 404 from apiClient (axios throws on 4xx)
      const err = new Error('Not Found')
      err.response = { status: 404 }
      return Promise.reject(err)
    }
    return Promise.resolve({ data: {} })
  })

  render(<MemoryRouter><HistoryPage /></MemoryRouter>)

  // Wait for history to load
  await waitFor(() => expect(screen.getByText('test.pdf')).toBeInTheDocument())

  // Click the PDF button
  const pdfBtn = screen.getByTestId('btn-voir-pdf-1')
  await user.click(pdfBtn)

  // Assert toast with exact message
  await waitFor(() => {
    expect(mockToastError).toHaveBeenCalledWith(
      'PDF introuvable — ce fichier a été supprimé du stockage cloud'
    )
  })

  // Assert button is disabled after 404
  expect(pdfBtn).toBeDisabled()
})
```

### Anti-Patterns to Avoid

- **Swallowing all ClientError codes:** Only treat `'404'` and `'NoSuchKey'` as "file missing". Other codes (403 = permission, 5xx = transient) must propagate as 500.
- **Disabling the button on 500:** A 500 is transient (retry is valid). Only 404 warrants permanent session-local disable.
- **Mocking `StorageService._client` class variable directly:** `_client` is a class-level singleton. Patch `_get_client` classmethod instead to avoid leaking mock state between tests.
- **Using `window.open` test:** `window.open` is a side effect that is hard to assert in jsdom. The test should focus on toast, not on `window.open`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| S3 object existence check | Custom HTTP request to Storj | `client.head_object(Bucket, Key)` | boto3 handles auth, retry, response parsing |
| ClientError discrimination | Parse exception message string | `e.response["Error"]["Code"]` | boto3 always sets this dict; message is locale-sensitive |
| Axios error status in frontend | Catch and re-parse JSON body | `err.response?.status` | axios sets `.response.status` on all 4xx/5xx responses |
| Toast differentiation | Inline status check in multiple places | Centralize in `handleViewPdf` | Single source of truth for error→message mapping |

---

## Common Pitfalls

### Pitfall 1: head_object raises ClientError for 403, not just 404

**What goes wrong:** If the S3 client has permission issues (wrong credentials, bucket policy), `head_object` raises `ClientError` with code `'403'`. Code that catches all `ClientError` and treats them as "file missing" will return a misleading 404 to the user.

**Why it happens:** ClientError is a catch-all for all HTTP errors from S3/Storj.

**How to avoid:** Check `e.response["Error"]["Code"]` — only `'404'` and `'NoSuchKey'` mean "file not found". Re-raise for any other code.

**Warning signs:** PDF buttons returning "introuvable" when Storj credentials are actually misconfigured.

### Pitfall 2: Storj vs AWS S3 error code differences

**What goes wrong:** Standard AWS S3 returns `'NoSuchKey'` for missing objects, while Storj (S3-compatible) returns `'404'` as the error code.

**Why it happens:** Storj implements S3 API but not always identically. The numeric HTTP status code is used as the Code string.

**How to avoid:** Check for both `'404'` AND `'NoSuchKey'` to be safe across S3-compatible providers.

**Warning signs:** Tests pass with AWS SDK but fail against real Storj endpoint.

### Pitfall 3: `_client` class variable singleton leaks between tests

**What goes wrong:** `StorageService._client` is set once and cached. If one test patches it, subsequent tests may use the stale mock.

**Why it happens:** `_client = None` at class level, populated on first `_get_client()` call.

**How to avoid:** In tests, patch `_get_client` classmethod (not `_client` directly). Or reset `StorageService._client = None` in teardown.

**Warning signs:** Test isolation fails — one test's mock affects another test's assertions.

### Pitfall 4: apiClient (axios) wraps 4xx in an Error object

**What goes wrong:** On 404, axios throws — the error is not in the resolved value. Code using `const { data } = await apiClient.get(...)` will reach the `catch` block on 4xx, not the happy path.

**Why it happens:** axios rejects the promise for any HTTP status >= 400 by default.

**How to avoid:** `handleViewPdf` already uses try/catch. Inspect `err.response?.status` inside catch to distinguish 404 from 500. This is already the correct approach — just needs implementation.

**Warning signs:** `err.response` is undefined in catch block — means apiClient was not the axios instance but something else.

### Pitfall 5: `missingPdf` state mutation with Set

**What goes wrong:** `setMissingPdf(prev => { prev.add(id); return prev })` does not trigger a re-render because React uses referential equality for state change detection. The same Set object is returned.

**Why it happens:** Set is mutable — adding to it does not change the reference.

**How to avoid:** Always create a new Set: `setMissingPdf(prev => new Set([...prev, facture.id]))`.

**Warning signs:** Button stays enabled after 404 even though state was "set".

---

## Code Examples

### Verified boto3 head_object pattern

```python
# boto3 official docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_object.html
# botocore ClientError: https://botocore.amazonaws.com/v1/documentation/api/latest/reference/exceptions.html
from botocore.exceptions import ClientError

client.head_object(Bucket="bucket-name", Key="2025/01/abc_invoice.pdf")
# Returns: dict with ContentLength, ContentType, LastModified, ETag, etc.
# Raises: ClientError with Error.Code == '404' or 'NoSuchKey' if not found
```

### Current get_presigned_url_from_pdf_url (to modify)

Current behavior (line 92-102 of storage_service.py):
- Extracts key from URL
- If key is None (non-Storj URL): returns raw `pdf_url` as fallback
- If key found: calls `get_presigned_url(key)`, falls back to `pdf_url` if presign fails

Target behavior:
- If key is None AND Storj is configured → raise FileNotFoundError (or return None for 503 path)
- If key is None AND Storj not configured → return None (endpoint raises 503)
- If key found: call `head_object` first → raise FileNotFoundError if missing
- If key found and object exists: call `generate_presigned_url`

### Existing endpoint to modify (main.py lines 627-646)

Current behavior:
- 404 if DB has no pdf_url for that facture
- 500 if presigned URL generation fails
- Returns `{"url": presigned, "expires_in": 3600}` on success

**Problem:** When Storj is configured but `get_presigned_url_from_pdf_url` returns `pdf_url` (the raw URL fallback), the endpoint returns 200 with an unusable direct Storj URL. The locked decision removes this fallback entirely.

Target behavior:
- 404 if DB has no pdf_url
- 404 if Storj `head_object` says file missing (new)
- 503 if Storj not configured (changed from current 500)
- 200 with presigned URL only when file confirmed to exist

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Silently return raw pdf_url when presign fails | Raise explicit HTTP error | Users get actionable error instead of broken link |
| Single generic toast for all PDF errors | Status-specific toast (404 vs 500) | User understands whether retry makes sense |
| No object existence check before presigning | head_object before generate_presigned_url | Eliminates 403 at PDF open time |
| Generic `except: toast.error('...')` in frontend | `err.response?.status` discrimination | Correct user guidance per error type |

**No deprecated APIs involved in this phase.**

---

## Open Questions

1. **What happens when `_extract_key_from_url` returns None for a real Storj URL?**
   - What we know: `_extract_key_from_url` checks `pdf_url.startswith(prefix)` where prefix is `{STORJ_ENDPOINT}/{STORJ_BUCKET}/`. If STORJ_ENDPOINT or STORJ_BUCKET config differs from what was used at upload time (e.g., env var changed), key extraction fails.
   - What's unclear: Whether this edge case exists in practice for the 134 test invoices.
   - Recommendation: Log a warning when key extraction returns None but Storj is configured — this indicates a configuration mismatch, not a missing file.

2. **Should the existing `test_history_pdf_404_for_invalid_id` test be updated?**
   - What we know: The test at line 33 of `test_stats_history.py` tests that a non-existent `facture_id` returns 404. This still works after our changes.
   - What's unclear: Whether the test uses auth or not — `http_client` fixture is unauthenticated, and the endpoint uses `Depends(get_current_user)`. If the endpoint requires auth, unauthenticated requests may return 401 not 404.
   - Recommendation: Verify whether the endpoint requires auth (it does — `Depends(get_current_user)`) and use `authenticated_client` for new tests.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | pytest 8+ with pytest-asyncio, pytest-timeout |
| Framework (frontend) | Vitest 3.2.4 + @testing-library/react 16.3.2 |
| Config file (backend) | `apps/api/pyproject.toml` `[tool.pytest.ini_options]` |
| Config file (frontend) | `apps/pwa/vite.config.js` `test:` block |
| Quick run command (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -x -q` |
| Quick run command (frontend) | `cd apps/pwa && pnpm test` |
| Full suite command (backend) | `cd apps/api && uv run pytest -x -q` |
| Full suite command (frontend) | `cd apps/pwa && pnpm test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | PDF button triggers lazy presigned URL request | unit (frontend) | `cd apps/pwa && pnpm test -- HistoryPage` | ❌ Wave 0 |
| HIST-02 | head_object 404 → endpoint returns 404 + message | unit (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -k pdf -x` | partial (missing head_object test) |
| HIST-02 | User B cannot access User A's invoice PDF URL | integration (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -k cross_user -x` | ❌ Wave 0 |
| HIST-02 | Storj not configured → endpoint returns 503 | unit (backend) | `cd apps/api && uv run pytest tests/api/test_stats_history.py -k not_configured -x` | ❌ Wave 0 |
| QWIN-03 | Same as HIST-01 | unit (frontend) | same as HIST-01 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/api/test_stats_history.py -x -q` + `cd apps/pwa && pnpm test -- HistoryPage`
- **Per wave merge:** Full backend `uv run pytest -x -q` + full frontend `pnpm test`
- **Phase gate:** Both suites green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/pwa/src/features/history/__tests__/HistoryPage.test.jsx` — covers HIST-01, HIST-02 (frontend toast, button disable)
- [ ] Backend test: `test_pdf_404_when_file_missing_in_storj` in `test_stats_history.py` — covers HIST-02 (head_object path)
- [ ] Backend test: `test_pdf_cross_user_returns_404` in `test_stats_history.py` — covers HIST-02 (ownership isolation)
- [ ] Backend test: `test_pdf_503_when_storj_not_configured` in `test_stats_history.py` — covers HIST-02 (503 branch)

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `apps/api/services/storage_service.py` — full StorageService implementation confirmed
- Direct code inspection: `apps/api/main.py` lines 627-646 — endpoint implementation confirmed
- Direct code inspection: `apps/pwa/src/features/history/HistoryPage.jsx` — handleViewPdf confirmed lazy, catch block confirmed generic
- Direct code inspection: `apps/pwa/vite.config.js` — Vitest config confirmed (jsdom, globals, setupFiles)
- Direct code inspection: `apps/pwa/src/features/scan/__tests__/ScanPage.test.jsx` and `CataloguePage.test.jsx` — established test patterns confirmed
- Direct code inspection: `apps/api/tests/conftest.py` — `http_client`, `authenticated_client` fixtures confirmed

### Secondary (MEDIUM confidence)
- boto3 head_object behavior: Standard S3 API, well-documented; Storj-specific error codes (`'404'` vs `'NoSuchKey'`) noted as a potential variance
- axios error wrapping: Confirmed via project dependency (`axios ^1.13.5`) and standard axios behavior (throws on 4xx/5xx, `.response.status` present on error object)

### Tertiary (LOW confidence)
- Storj returning `'404'` as error code string (vs AWS `'NoSuchKey'`): Based on known Storj S3-compatibility notes; not verified against real Storj endpoint in this research session. **Recommendation: catch both.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present, no new deps
- Architecture: HIGH — all changes are small and localized; patterns match existing code
- Pitfalls: HIGH — boto3 ClientError discrimination is a known gotcha, Set mutation pitfall is standard React knowledge
- Test patterns: HIGH — confirmed from existing test files in the project

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain — boto3, React, Vitest APIs are stable)
