# PDF Viewer Agent — Viewer Inline PWA

## Identité
- **ID**: pdf-viewer-agent-006
- **Spécialité**: React, PWA, UX mobile
- **Owner**: Frontend Lead
- **Durée**: 1 jour (S5)

## Mission Précise
Créer composant PDFViewer.jsx modal fullscreen pour visualiser PDF factures inline (mobile + desktop).

## Contexte
Actuellement bouton "Voir PDF" ouvre nouvel onglet → 40% abandon mobile → mauvaise UX.
Besoin : Modal fullscreen avec iframe presigned URL (Storj S3).

## Tâches Détaillées
```yaml
1. Composant PDFViewer:
   - [ ] Créer apps/pwa/src/shared/ui/PDFViewer.jsx:
     ```jsx
     import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
     import { useState } from 'react'

     export default function PDFViewer({ url, filename, onClose }) {
       const [zoom, setZoom] = useState(100)

       return (
         <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
           {/* Header */}
           <div className="p-4 flex justify-between items-center border-b border-slate-700 bg-slate-900">
             <h2 className="text-lg font-bold truncate flex-1">{filename || 'Facture PDF'}</h2>
             <div className="flex gap-2">
               <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-2 hover:bg-slate-800 rounded">
                 <ZoomOut size={20} />
               </button>
               <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-2 hover:bg-slate-800 rounded">
                 <ZoomIn size={20} />
               </button>
               <a href={url} download className="p-2 hover:bg-slate-800 rounded">
                 <Download size={20} />
               </a>
               <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded">
                 <X size={20} />
               </button>
             </div>
           </div>

           {/* Iframe PDF */}
           <iframe
             src={url}
             className="flex-1 w-full bg-white"
             title="PDF Viewer"
             style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
           />
         </div>
       )
     }
     ```

2. Intégration HistoryPage:
   - [ ] Éditer apps/pwa/src/features/history/HistoryPage.jsx:
     ```jsx
     import PDFViewer from '@/shared/ui/PDFViewer'
     // ...
     const [pdfViewerUrl, setPdfViewerUrl] = useState(null)
     const [pdfFilename, setPdfFilename] = useState('')

     const handleViewPDF = async (facture) => {
       const { data } = await apiClient.get(`/api/v1/history/${facture.id}/pdf`)
       setPdfViewerUrl(data.url)  // presigned URL
       setPdfFilename(facture.filename)
     }

     // Dans JSX:
     {pdfViewerUrl && (
       <PDFViewer
         url={pdfViewerUrl}
         filename={pdfFilename}
         onClose={() => setPdfViewerUrl(null)}
       />
     )}
     ```

3. Intégration JobStatusCard:
   - [ ] Éditer apps/pwa/src/features/scan/components/JobStatusCard.jsx:
     - Ajouter prop onViewPDF
     - Bouton "Voir PDF" → call onViewPDF(job.pdf_url)
     - Parent (ScanPage) gère state PDFViewer

4. Tests Vitest:
   - [ ] Créer apps/pwa/src/shared/ui/__tests__/PDFViewer.test.jsx:
     ```jsx
     import { render, screen, fireEvent } from '@testing-library/react'
     import { vi } from 'vitest'
     import PDFViewer from '../PDFViewer'

     describe('PDFViewer', () => {
       const mockProps = {
         url: 'https://example.com/test.pdf',
         filename: 'test.pdf',
         onClose: vi.fn()
       }

       it('affiche le nom du fichier', () => {
         render(<PDFViewer {...mockProps} />)
         expect(screen.getByText('test.pdf')).toBeInTheDocument()
       })

       it('appelle onClose au click X', () => {
         render(<PDFViewer {...mockProps} />)
         fireEvent.click(screen.getByRole('button', { name: /close/i }))
         expect(mockProps.onClose).toHaveBeenCalled()
       })

       it('zoom in/out fonctionne', () => {
         render(<PDFViewer {...mockProps} />)
         const iframe = screen.getByTitle('PDF Viewer')
         expect(iframe.style.transform).toContain('scale(1)') // 100%

         fireEvent.click(screen.getByLabelText('ZoomIn'))
         expect(iframe.style.transform).toContain('scale(1.25)') // 125%
       })
     })
     ```

5. Tests E2E Playwright:
   - [ ] apps/api/tests/e2e/test_pdf_viewer.py:
     ```python
     @pytest.mark.e2e
     async def test_pdf_viewer_modal(page):
         await page.goto("http://localhost:5173/history")
         await page.click("text=Voir PDF")  # Premier bouton
         # Attendre modal visible
         await page.wait_for_selector('iframe[title="PDF Viewer"]')
         # Vérifier close button
         await page.click('button[aria-label="Close"]')
         # Modal disparue
         assert not await page.is_visible('iframe[title="PDF Viewer"]')
     ```

6. Responsive Mobile:
   - [ ] Test iPhone 13 Safari (DevTools)
   - [ ] Test Android Chrome (BrowserStack si dispo)
   - [ ] Gestures pinch-zoom natifs (bonus)

7. Fallback CORS:
   - [ ] Si iframe bloqué CORS → afficher message:
     ```jsx
     <div>PDF non disponible. <a href={url} target="_blank">Ouvrir nouvel onglet</a></div>
     ```

8. Analytics:
   - [ ] Track event "pdf_viewer_open" (GA4)
   - [ ] Track event "pdf_viewer_close" (temps passé)
   - [ ] Metric: % abandon <15% (objectif)

9. Deploy:
   - [ ] Branch: feature/pdf-viewer-agent-006
   - [ ] PR → Review Frontend Lead
   - [ ] Staging → Test mobile réel (iPhone + Android)
   - [ ] Prod après validation 48h
```

## Livrables
1. ✅ Composant PDFViewer.jsx
2. ✅ Intégration HistoryPage + JobStatusCard
3. ✅ Tests Vitest (3 tests min)
4. ✅ Tests E2E Playwright
5. ✅ Analytics tracking

## Métriques Succès
- Abandon PDF mobile: 40% → <15% (target)
- Crashes modal: 0 (Sentry)
- Satisfaction UX: >8/10 (user feedback)

## Risques
- **CORS iframe bloqué** → Fallback message + link nouvel onglet
- **Mobile 3G lent** → Loading spinner, timeout 10s

## Communication
- Daily: Screenshot modal (desktop + mobile)
- S5 Fin: Démo Loom 2min (flow complet)
