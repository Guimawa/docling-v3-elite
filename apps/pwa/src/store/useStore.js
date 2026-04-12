import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { DEFAULT_APP_THEME, isAppThemeId } from '@/shared/theme/appThemes'

// Sanitize user-provided strings to prevent injection (SAFE-MCP-101)
function sanitizeForKey(value) {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/[\r\n\0]/g, '').trim()
}

export const AI_MODELS = [
  { id: 'gemini-3.1-pro-preview',     label: 'Gemini 3.1 Pro',      badge: 'Recommandé',      recommended: true },
  { id: 'gemini-2.5-flash',           label: 'Gemini 2.5 Flash',    badge: 'Rapide / stable', recommended: false },
  { id: 'gemini-3-flash-preview',     label: 'Gemini 3 Flash',      badge: 'Preview',           recommended: false },
  { id: 'mistral-ocr-latest',         label: 'Mistral OCR (latest)', badge: 'Alias API',       recommended: false },
  { id: 'mistral-ocr-2512',           label: 'Mistral OCR 3 (2512)', badge: 'Tableaux HTML',   recommended: false },
  { id: 'chandra-ocr-2',              label: 'Chandra OCR 2',       badge: 'Open Source',     recommended: false },
  { id: 'lightonocr-2-1b',            label: 'LightOnOCR 2',        badge: 'Ultra-Rapide OSS', recommended: false },
  { id: 'docling-ibm-pro',            label: 'Docling-IBM Pro',     badge: 'Élite (Giant Tech)', recommended: false },
]

const ALLOWED_MODEL_IDS = new Set(AI_MODELS.map((m) => m.id))

let _idCounter = 0

export const useDoclingStore = create(
  devtools(
    persist(
      (set) => ({

        selectedModel: 'gemini-3.1-pro-preview',
        setModel: (modelId) => {
          const safeId = typeof modelId === 'string' && ALLOWED_MODEL_IDS.has(modelId)
            ? modelId
            : 'gemini-3.1-pro-preview'
          set({ selectedModel: safeId })
        },

        ocrEngine: 'standard', // 'standard' | 'elite' (IBM Docling)
        setOcrEngine: (engine) => set({ ocrEngine: engine }),

        preprocessMode: 'basic', // 'basic' | 'pro_scan' (Perspective Warp)
        setPreprocessMode: (mode) => set({ preprocessMode: mode }),

        appTheme: DEFAULT_APP_THEME,
        setAppTheme: (themeId) => set({
          appTheme: isAppThemeId(themeId) ? themeId : DEFAULT_APP_THEME,
        }),

        currentJob: null,
        extractedProducts: [],
        currentInvoice: null,
        currentInvoiceMime: null,
        pendingSource: 'pc',

        setJobStart: (jobId, fileUrl, mime = null) => set({
          currentJob: jobId,
          currentInvoice: fileUrl,
          currentInvoiceMime: mime,
          extractedProducts: []
        }),

        setJobComplete: (products, source = 'pc', pdfUrl = null, mime = null) => set({
          extractedProducts: (products || []).map((p) => ({
            ...p,
            _key: p.id ?? p._key ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `val-${sanitizeForKey(p.designation_raw || p.designation_fr || '').slice(0, 30)}-${sanitizeForKey(p.fournisseur || '').slice(0, 20)}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
          })),
          currentJob: null,
          currentInvoice: pdfUrl,
          currentInvoiceMime: mime,
          pendingSource: source
        }),

        updateProduct: (index, field, value) => set((state) => ({
          extractedProducts: state.extractedProducts.map((p, idx) =>
            idx === index ? { ...p, [field]: value } : p
          )
        })),

        clearJob: () => set({
          currentJob: null,
          extractedProducts: [],
          currentInvoice: null,
          currentInvoiceMime: null,
          pendingSource: 'pc'
        }),

        removeProduct: (index) => set((state) => ({
          extractedProducts: state.extractedProducts.filter((_, i) => i !== index)
        })),

        // ---------- CLOUD CONFIGURATION ----------
        cloudConfig: {
          provider: 'docling-cloud', // 'docling-cloud', 'google', 'onedrive'
          google: { driveFolderId: '', sheetId: '', autoExport: true },
          onedrive: { folderPath: '', autoSync: false },
        },
        setCloudProvider: (provider) => set((state) => ({
          cloudConfig: { ...state.cloudConfig, provider }
        })),
        updateCloudConfig: (provider, patch) => set((state) => ({
          cloudConfig: {
            ...state.cloudConfig,
            [provider]: { ...state.cloudConfig[provider], ...patch }
          }
        })),

        // ---------- BATCH QUEUE (optimised) ----------
        batchQueue: [],

        addToQueue: (files) => set((state) => {
          const existing = new Set(state.batchQueue.map(i => `${sanitizeForKey(i.name)}__${i.size}`))
          const fresh = files.filter(f => !existing.has(`${sanitizeForKey(f.name)}__${f.size}`))
          if (fresh.length === 0) return state
          return {
            batchQueue: [
              ...state.batchQueue,
              ...fresh.map((file) => ({
                id: `b${Date.now()}-${++_idCounter}`,
                file,
                compressedFile: null,
                name: file.name,
                size: file.size,
                fileKind: 'unknown',
                pageEstimate: 1,
                estimatedSeconds: null,
                status: 'pending',
                progress: 0,
                error: null,
                productsAdded: 0,
              }))
            ]
          }
        }),

        setCompressed: (id, compressedFile) => set((state) => ({
          batchQueue: state.batchQueue.map((item) =>
            item.id === id ? { ...item, compressedFile, status: 'pending' } : item
          )
        })),

        updateQueueItem: (id, patch) => set((state) => ({
          batchQueue: state.batchQueue.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          )
        })),

        retryItem: (id) => set((state) => ({
          batchQueue: state.batchQueue.map((item) =>
            item.id === id && item.status === 'error'
              ? { ...item, status: 'pending', progress: 0, error: null }
              : item
          )
        })),

        retryAllErrors: () => set((state) => ({
          batchQueue: state.batchQueue.map((item) =>
            item.status === 'error'
              ? { ...item, status: 'pending', progress: 0, error: null }
              : item
          )
        })),

        clearQueue: () => set({ batchQueue: [] }),

        removeFromQueue: (id) => set((state) => ({
          batchQueue: state.batchQueue.filter((item) => item.id !== id)
        })),
      }),

      {
        name: 'docling-storage-v3',
        partialize: (state) => ({
          selectedModel: state.selectedModel,
          extractedProducts: state.extractedProducts,
          pendingSource: state.pendingSource,
          appTheme: state.appTheme,
          cloudConfig: state.cloudConfig,
          ocrEngine: state.ocrEngine,
          preprocessMode: state.preprocessMode,
        })
      }
    ),
    { name: 'DoclingStore' }
  )
)
