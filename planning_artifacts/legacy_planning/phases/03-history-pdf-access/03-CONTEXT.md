# Phase 3: History & PDF Access - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the PDF access buttons in the history page work reliably end-to-end: lazy presigned URL generation on click, proper error handling when a file is missing from Storj (clear warning instead of silent 403), and targeted tests covering the new behavior. Frontend (HistoryPage) + backend (storage_service, main.py endpoint) changes only.

</domain>

<decisions>
## Implementation Decisions

### Backend File Verification
- Add `head_object` check in `StorageService.get_presigned_url_from_pdf_url` before generating the presigned URL — verify the file actually exists in Storj before returning a URL
- If file is missing from Storj: raise HTTPException 404 with `"Fichier PDF introuvable dans le stockage cloud"` — clear, not silent
- If StorageService not configured (no STORJ_ACCESS_KEY): return 503 `"Stockage cloud non configuré"` instead of the current fallback to raw pdf_url
- No fallback to raw pdf_url when Storj is configured — fail clearly with appropriate HTTP error code

### Frontend Error UX
- On 404 from `/history/{id}/pdf`: `toast.error("PDF introuvable — ce fichier a été supprimé du stockage cloud")`
- On 500 from `/history/{id}/pdf`: `toast.error("Erreur de stockage — réessayez plus tard")` — different message from 404
- After a 404 error, disable the PDF button for that invoice in local component state — prevents re-click on known missing file for the session
- Add `data-testid="btn-voir-pdf-{facture.id}"` on PDF buttons now — Phase 4 E2E tests will need them

### Tests & Coverage
- Backend: add test for `head_object` returning 404 (file missing in Storj) → endpoint must return 404 with clear message (mock S3 client)
- Backend: add cross-user access test → invoice owned by user A, request from user B → must return 404 (ownership isolation)
- Frontend: add unit test in `HistoryPage.test.jsx` → mock API returning 404 → verify toast is shown with correct message

### Claude's Discretion
- Implementation details of `head_object` call (exact boto3 API, exception type to catch)
- Whether `head_object` is added in `StorageService` or directly in the main.py endpoint handler
- Test mock setup details (pytest fixtures for mocked S3)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageService._get_client()` — returns boto3 S3 client or None if unconfigured; reuse for head_object
- `StorageService._extract_key_from_url()` — already extracts S3 key from pdf_url; use before head_object call
- `handleViewPdf` in HistoryPage — already does lazy loading; extend with error differentiation
- `loadingPdf` state in HistoryPage — pattern exists; add similar `missingPdf` Set<number> state for disabled buttons
- `toast` from sonner — already imported and used for errors

### Established Patterns
- Backend: `logger.error("...", exc_info=True)` + `raise HTTPException(status_code=..., detail="...")` pattern in main.py
- Frontend: `try/catch` with `toast.error(msg)` in `handleViewPdf` and `handleRescan`
- Tests: `http_client` fixture in `conftest.py`; boto3 mock via `unittest.mock.patch`
- `data-testid` pattern: already used in other components (ScanPage, etc.)

### Integration Points
- `StorageService.get_presigned_url_from_pdf_url()` — add head_object before presign call
- `main.py:627-646` — `/api/v1/history/{facture_id}/pdf` endpoint — update 503 case
- `HistoryPage.jsx:handleViewPdf` — differentiate 404 vs 500 error responses
- `apps/api/tests/api/test_stats_history.py` — add new test cases here

</code_context>

<specifics>
## Specific Ideas

- `head_object` call in boto3: `client.head_object(Bucket=..., Key=...)` raises `ClientError` with `error_response['Error']['Code'] == '404'` when file is missing
- The `_extract_key_from_url` method already exists and returns None for non-Storj URLs — use this same guard before head_object
- The `missingPdf` state in HistoryPage should be a `Set<number>` of invoice IDs with known missing files — button gets `disabled={missingPdf.has(f.id)}` and a visual cue (grayed out, lock icon)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
