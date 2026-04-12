# Phase 2: Frontend Flow - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase fixes the scan-to-catalogue flow: batch navigation routing, data persistence across refresh, PDF preview rendering, low-confidence product filtering, and SplineScene removal. All changes are frontend-only (React PWA).

</domain>

<decisions>
## Implementation Decisions

### Batch Navigation (FLOW-01)
- After `startBatch()` completes, automatically `navigate('/validation')` — replace the current toast "Voir le catalogue" redirect
- Only transfer products with `status: done` into `extractedProducts` — ignore errored items
- Keep a toast but adapt text: "X produits extraits — redirection vers la validation"
- Return button from /validation goes to /scan — existing behavior, no changes needed

### Data Persistence (FLOW-02)
- Zustand `persist` middleware already persists `extractedProducts` — confirmed working for refresh survival
- Store `pdf_url` (S3 Storj URL from backend response) instead of blob Object URL for `currentInvoice` — blob URLs don't survive refresh
- Store the file MIME type alongside `currentInvoice` in the store (e.g. `currentInvoiceMime: 'application/pdf'`)
- For batch mode: store `pdf_url` from the last processed item or all items' pdf_urls

### PDF Preview (FLOW-03)
- Use `<object>` with `<iframe>` fallback to render PDFs in ValidationPage — replace the current `<img>` tag
- Detect PDF vs image using the stored MIME type (`currentInvoiceMime`)
- Lightbox for PDF uses `<object>` full-screen with same PDF/image conditional logic
- Use `pdf_url` (Storj S3 presigned URL) for persistence across refresh

### Low Confidence Filtering (FLOW-04)
- Exclude `confidence=low` products from save by default — add a checkbox per product card
- Allow user to re-include individual products by unchecking/checking the exclusion checkbox
- Display counter above save button: "X produits exclus (confidence faible)" when any are excluded
- Visual flagging already exists (amber variant + AlertCircle icon) — keep as-is

### SplineScene Removal (QWIN-01)
- Remove SplineScene component entirely (`src/components/SplineScene.jsx`)
- Remove all SplineScene imports and usages from: ValidationPage, ScanPage, SettingsPage, DevisPage, ErrorBoundary
- Remove the `@splinetool/react-spline` dependency from package.json
- Replace SplineScene slots with either nothing or a simple icon/emoji placeholder

### Claude's Discretion
- Exact checkbox UI design for product inclusion/exclusion (within existing Card/Input component patterns)
- Placeholder to use where SplineScene was removed (simple icon or nothing)
- Implementation of MIME type storage in the store (field naming, default value)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDoclingStore` — Zustand with `persist` middleware, already stores `extractedProducts`, `currentInvoice`, `pendingSource`
- `useScanUpload` hook — manages batch queue, camera upload, polling
- `Card` component — has `variant="warning"` for low confidence visual flagging
- `Button`, `Input`, `Select`, `MagneticButton` — existing design system components
- `offlineQueue.js` — IndexedDB queue for offline uploads

### Established Patterns
- React functional components + hooks
- Zustand for state management with `persist` + `devtools` middleware
- Framer Motion for animations (`AnimatePresence`, `motion.div`)
- `sonner` for toast notifications
- `apiClient` with axios for API calls
- `react-router-dom` for navigation with `useNavigate()`

### Integration Points
- `useScanUpload.js:startBatch()` — needs navigate('/validation') after completion
- `useScanUpload.js:processItem()` — needs to store `pdf_url` and MIME type from API response
- `useStore.js:setJobComplete()` — needs to accept and store `pdf_url` + MIME type
- `ValidationPage.jsx` — needs conditional PDF/image rendering, exclusion checkboxes, SplineScene removal
- `ScanPage.jsx`, `SettingsPage.jsx`, `DevisPage.jsx`, `ErrorBoundary.jsx` — SplineScene removal

</code_context>

<specifics>
## Specific Ideas

- The `pdf_url` is already returned by the backend in the extraction result (`Orchestrator.process_file` returns `pdf_url`)
- `useScanUpload.js:processItem()` already stores `pdf_url` in the batch queue item (line 263)
- Camera flow already navigates to `/validation` (line 383) — only batch needs fixing
- SplineScene loads from `prod.spline.design` CDN — removing saves 3-5MB mobile download

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
