# Architecture Research: Docling v1 Completion

**Research Date:** 2026-03-17
**Mode:** Subsequent milestone (finishing v1 E2E flow)
**Confidence:** HIGH

## Component Integration Map

### 15 Components Confirmed

| Component | Location | Role |
|-----------|----------|------|
| main.py | `apps/api/main.py` | Routes/auth/circuit-breaker (906-line God module) |
| Orchestrator | `apps/api/core/orchestrator.py` | MIME detection -> Factur-X or Gemini -> parallel DB+S3 |
| DBManager | `apps/api/core/db_manager.py` | 744-line monolith handling all SQL |
| GeminiService | `apps/api/services/gemini_service.py` | AI extraction with structured output |
| StorageService | `apps/api/services/storage_service.py` | Storj S3 upload/presigned URLs |
| ImagePreprocessor | `apps/api/services/image_preprocessor.py` | OpenCV optimization |
| FacturxExtractor | `apps/api/services/facturx_extractor.py` | XML extraction from Factur-X PDFs |
| BytezService | `apps/api/services/bytez_service.py` | Fallback OCR |
| useScanUpload | `apps/pwa/src/features/scan/hooks/useScanUpload.js` | Upload + polling loop (5s interval, 60 attempts max) |
| ValidationPage | `apps/pwa/src/features/validation/ValidationPage.jsx` | Review extracted products |
| CataloguePage | `apps/pwa/src/features/catalogue/CataloguePage.jsx` | Browse/search/edit products |
| useDoclingStore | `apps/pwa/src/store/useStore.js` | Pipeline buffer between extraction and validation |
| apiClient | `apps/pwa/src/shared/lib/apiClient.js` | HTTP client with retry/auth |
| HistoryPage | `apps/pwa/src/features/history/HistoryPage.jsx` | Past invoices |
| DevisPage | `apps/pwa/src/features/devis/DevisPage.jsx` | Quote generation |

## 4 Confirmed Architectural Gaps Preventing Reliable E2E Flow

### Gap 1: Batch mode skips validation (CRITICAL)
- **Where:** `useScanUpload.js` lines 316-320
- **Problem:** `startBatch()` navigates to `/catalogue` directly, bypassing `/validation`. Camera mode correctly goes to `/validation`.
- **Impact:** Batch-uploaded products are never reviewed by user before entering catalogue
- **Fix:** Single-line change — redirect batch completion to `/validation`

### Gap 2: PDF preview broken in validation (HIGH)
- **Where:** `ValidationPage.jsx`
- **Problem:** Renders `<img src={currentInvoiceUrl}>` which works for images but not PDFs. The `pdf_url` from Storj is never put into Zustand.
- **Impact:** User can't see the original invoice while validating extracted products
- **Fix:** Detect MIME type, render `<iframe>` or `<object>` for PDFs

### Gap 3: Storj S3 fails silently (MEDIUM)
- **Where:** `StorageService.upload_file()`
- **Problem:** When unconfigured, returns `None`. `log_facture` stores `null` pdf_url. History PDF button returns 404 with no user warning.
- **Impact:** History becomes useless if Storj not configured
- **Fix:** Show clear error/warning if storage unavailable

### Gap 4: Polling timeout loses completed jobs (MEDIUM)
- **Where:** `useScanUpload.js` — 60 x 5s = 5min timeout
- **Problem:** Render free-tier cold starts can exceed 5min. Backend job may complete after frontend gives up.
- **Impact:** User thinks extraction failed when it actually succeeded
- **Fix:** Increase timeout or add manual "check again" button

## E2E Flow Critical Path

```
Upload (ScanPage)
  -> POST /api/v1/invoices/process
    -> 202 + job_id
    -> Background: Orchestrator.process_file()
      -> MIME detect -> Factur-X or Gemini
      -> Products -> DB batch upsert
      -> PDF -> Storj S3
      -> Job status -> "completed"
  -> Frontend polls GET /status/{job_id}
  -> On complete: navigate to /validation
    -> ValidationPage reads extractedProducts from Zustand
    -> User reviews/edits products
    -> POST /api/v1/catalogue/batch
    -> Navigate to /catalogue
  -> CataloguePage: browse, search, edit
  -> Export: CSV/Excel/PDF
```

## Build Order Recommendation

1. **Fix Gap 1** (batch -> validation routing) — single-line change, highest user impact
2. **Fix Gap 2** (PDF preview in validation) — enables proper review
3. **Verify full E2E flow** with real BIGMAT PDFs
4. **Fix Gap 3** (Storj silent failure) — add user feedback
5. **Fix Gap 4** (polling timeout) — increase or add retry button
6. **Write E2E tests** covering the verified flow
7. **Refactor only if tests require it** (don't refactor main.py 906 lines before tests)

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Component boundaries | HIGH | Direct code inspection of all 15 components |
| Gap 1 (batch skip) | HIGH | Line-level code evidence |
| Gap 2 (PDF preview) | HIGH | JSX inspection confirms img-only rendering |
| Gap 3 (Storj silent) | HIGH | Return value trace through call chain |
| Gap 4 (polling timeout) | MEDIUM | Depends on Render cold start timing |

---
*Research completed: 2026-03-17*
