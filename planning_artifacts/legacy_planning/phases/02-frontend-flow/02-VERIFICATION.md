---
phase: 02-frontend-flow
verified: 2026-03-17T12:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 2: Frontend Flow Verification Report

**Phase Goal:** The complete scan-to-catalogue flow works without breaks across navigation, refresh, and batch mode
**Verified:** 2026-03-17T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App loads with no SplineScene/Spline 3D bundle | VERIFIED | `SplineScene.jsx` deleted; no `@splinetool` in `package.json` or `src/` |
| 2 | All 5 pages that used SplineScene render with gradient icon replacements | VERIFIED | `w-16 h-16 rounded-xl bg-gradient-to-br` found in all 5 files (ScanPage, ValidationPage, DevisPage, SettingsPage, ErrorBoundary) |
| 3 | After batch extraction, user is automatically navigated to /validation | VERIFIED | `navigate('/validation')` at line 331 of `useScanUpload.js`; "Voir le catalogue" toast action absent |
| 4 | Refreshing on /validation still shows extracted products | VERIFIED | Zustand `partialize` persists `extractedProducts`, `currentInvoice`, `currentInvoiceMime`, `pendingSource`; storage key bumped to `docling-storage-v3` |
| 5 | currentInvoice is an S3 URL (not a blob URL) after batch | VERIFIED | `setJobComplete(products, source, pdfUrl, mime)` — `pdfUrl` param set to `lastDone?.pdf_url` (S3 presigned URL from backend) |
| 6 | MIME type stored and available in store | VERIFIED | `currentInvoiceMime` in initial state, `setJobStart`, `setJobComplete`, `clearJob`, and `partialize` — 5 hits in `useStore.js` |
| 7 | Only done-status products transferred after batch | VERIFIED | `doneItems = queue.filter(i => i.status === 'done')` before `setJobComplete` call |
| 8 | ValidationPage renders PDFs via object/iframe (not broken img) | VERIFIED | `<object>` at lines 127 and 182; `<iframe>` fallback at line 133; conditional on `isPdf` ternary |
| 9 | ValidationPage renders images via img tag | VERIFIED | `<img>` still present inside `isPdf ? ... : <img ...>` ternary |
| 10 | Low-confidence products excluded by default in ValidationPage | VERIFIED | `includedSet` initializer skips `p.confidence === 'low'`; line 40 |
| 11 | User can toggle per-product inclusion | VERIFIED | `toggleInclude(index)` handler at line 48; checkbox `onChange` wired at line 246 |
| 12 | Save button only sends included products to API | VERIFIED | `apiClient.post(ENDPOINTS.batch, { produits: includedProducts, source })` line 79; button disabled when `includedProducts.length === 0` |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/pwa/src/components/SplineScene.jsx` | DELETED — must not exist | VERIFIED | File does not exist |
| `apps/pwa/package.json` | No `@splinetool` dependencies | VERIFIED | Zero matches for `@splinetool` |
| `apps/pwa/src/store/useStore.js` | `currentInvoiceMime`, expanded `partialize`, storage v3 | VERIFIED | 5 occurrences of `currentInvoiceMime`; partialize has 5 fields; `docling-storage-v3` at line 136 |
| `apps/pwa/src/features/scan/hooks/useScanUpload.js` | Auto-navigate to /validation, pass pdf_url + MIME | VERIFIED | `navigate('/validation')` line 331; `batchPdfUrl`/`batchMime` lines 322-323; camera path lines 384-389 |
| `apps/pwa/src/features/validation/ValidationPage.jsx` | Conditional PDF/image rendering + confidence exclusion | VERIFIED | `currentInvoiceMime`, `isPdf`, `<object>` (x2), `includedSet`, `toggleInclude`, `excludedCount`, `includedProducts` all present |
| `apps/pwa/src/features/scan/ScanPage.jsx` | Dead batch-done modal removed | VERIFIED | Zero matches for `batchDoneModal`, `setBatchDoneModal`, "Valider les produits", "Voir le catalogue"; unused `FolderOpen`/`Package` imports removed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useScanUpload.js:startBatch` | `/validation` | `navigate('/validation')` | WIRED | Line 331; "Voir le catalogue" absent |
| `useScanUpload.js:startBatch` | `useStore.setJobComplete` | 4-param call with `batchPdfUrl, batchMime` | WIRED | Lines 322-326 |
| `useScanUpload.js:handleCameraFile` | `useStore.setJobComplete` | `status.result?.pdf_url`, `file.type` | WIRED | Lines 384-389 |
| `useStore.js:partialize` | localStorage | Zustand persist middleware | WIRED | `extractedProducts`, `currentInvoice`, `currentInvoiceMime`, `pendingSource` in partialize block |
| `ValidationPage.jsx` | `useStore.currentInvoiceMime` | Zustand selector | WIRED | Line 27: `useDoclingStore(s => s.currentInvoiceMime)` |
| `ValidationPage.jsx:handleValidate` | API batch endpoint | filters by `includedProducts` | WIRED | Line 79: `produits: includedProducts` |
| `ValidationPage.jsx` | `<object>` PDF tag | conditional on `isPdf` | WIRED | `isPdf` ternary at lines 118 and 181 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| QWIN-01 | 02-01 | Remove SplineScene (3-5 MB mobile savings) | SATISFIED | `SplineScene.jsx` deleted, `@splinetool` removed from `package.json`, no imports remain in `src/` |
| FLOW-01 | 02-02 | Batch mode routes to /validation after extraction | SATISFIED | `navigate('/validation')` in `startBatch`; "Voir le catalogue" removed |
| FLOW-02 | 02-02 | Extracted products persist via sessionStorage/IndexedDB — survive refresh | SATISFIED | Zustand persist with `extractedProducts`, `currentInvoice`, `currentInvoiceMime`, `pendingSource`; storage v3 forces clean migration |
| FLOW-03 | 02-03 | ValidationPage displays original PDF (object/iframe for PDFs, img for images) | SATISFIED | Conditional `isPdf` ternary renders `<object>+<iframe>` for PDFs, `<img>` for images — both in preview and lightbox |
| FLOW-04 | 02-03 | Low-confidence products flagged visually and filtered by default before save | SATISFIED | `includedSet` excludes `confidence === 'low'` by default; checkbox UI; `excludedCount` banner; `handleValidate` sends only `includedProducts` |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps only FLOW-01, FLOW-02, FLOW-03, FLOW-04, QWIN-01 to Phase 2. All five are accounted for in plans. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ValidationPage.jsx` | 260 | `placeholder="Désignation produit"` | Info | HTML input attribute — legitimate use, not a stub component |

No blockers or warnings found.

---

### Human Verification Required

#### 1. PDF preview renders in browser (not blank/error)

**Test:** Upload a real PDF invoice via the scan flow. After extraction, go to /validation.
**Expected:** The PDF preview section shows an embedded PDF (scrollable) via `<object>`. Clicking it opens the PDF full-screen in the lightbox.
**Why human:** Cannot verify actual PDF rendering or browser `<object>` support programmatically — depends on browser PDF plugin availability.

#### 2. Refresh restores validation state

**Test:** Upload an invoice, complete extraction, reach /validation, then press F5 (hard refresh).
**Expected:** Products list and invoice preview are still present after refresh — no blank/empty state.
**Why human:** Zustand persist is wired correctly in code, but actual localStorage serialization and rehydration can only be confirmed in a live browser session.

#### 3. Low-confidence checkbox opt-in flow

**Test:** Use a real Gemini-extracted invoice that produces at least one `confidence: low` product.
**Expected:** That product's checkbox is unchecked by default; the amber exclusion counter is visible; clicking "Enregistrer" does NOT save the unchecked product.
**Why human:** Requires real extraction data with `confidence: low` products — test data cannot be simulated programmatically here.

---

### Gaps Summary

No gaps found. All 12 observable truths are verified, all 5 requirements (FLOW-01, FLOW-02, FLOW-03, FLOW-04, QWIN-01) are satisfied by substantive implementation, and all 7 key links are wired through to the codebase. All 6 commits documented in the SUMMARYs exist in git history. Three items flagged for human verification are UX/rendering behaviors that cannot be confirmed without a live browser session.

---

_Verified: 2026-03-17T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
