import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { FEATURES } from '@/shared/config/features'
import { compressToWebP } from '@/shared/lib/imageService'
import { markNewProducts } from '@/shared/services/dedupService'
import {
  enqueueUpload,
  getPendingCount,
  getPendingUploads,
  removePendingUpload,
} from '@/shared/lib/offlineQueue'
import { useDoclingStore } from '../../../store/useStore'
import { useBatchQueue } from './useBatchQueue'

const CONCURRENCY = 3

const ETA_BY_KIND_SECONDS = {
  pdf_text: 7,
  pdf_image: 18,
  image: 12,
  unknown: 15,
}

/**
 * Attend la fin du job via SSE (credentials inclus pour cookie httpOnly).
 * @returns {Promise<{ status: string, result?: object, error?: string }>}
 */
async function waitScanJobViaSse(jobId, signal, onProgress) {
  const res = await fetch(ENDPOINTS.statusStream(jobId), {
    credentials: 'include',
    signal,
  })
  if (!res.ok) throw new Error('Flux statut job indisponible')
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let tick = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const blocks = buf.split('\n\n')
    buf = blocks.pop() || ''
    for (const block of blocks) {
      const line = block.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const json = JSON.parse(line.slice(5).trim())
      if (json.error === 'not_found') throw new Error('Job introuvable')
      tick += 1
      if (onProgress) onProgress(json, tick)
      if (json.status === 'completed' || json.status === 'error') return json
    }
  }
  throw new Error('Flux SSE terminé sans statut final')
}

function getSource() {
  const ua = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  return isMobile ? 'mobile' : 'pc'
}

/** Collecte récursivement tous les PDF d'un FileSystemDirectoryHandle */
async function collectPdfsFromDirectory(handle) {
  const files = []
  for await (const [, entry] of handle.entries()) {
    if (entry.kind === 'file') {
      const name = entry.name || ''
      if (name.toLowerCase().endsWith('.pdf')) {
        files.push(await entry.getFile())
      }
    } else if (entry.kind === 'directory') {
      const subFiles = await collectPdfsFromDirectory(entry)
      files.push(...subFiles)
    }
  }
  return files
}

function detectFileKindSync(file) {
  const type = (file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif)$/.test(name)) {
    return 'image'
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf_image'
  }
  return 'unknown'
}

async function estimatePdfDetails(file) {
  try {
    const bytes = await file.arrayBuffer()
    const sample = new TextDecoder('latin1').decode(bytes.slice(0, 120000))
    const hasTextOperators = /BT[\s\S]{0,80}ET/.test(sample)
    const pageTokens = sample.match(/\/Type\s*\/Page\b/g)
    const pageEstimate = Math.max(1, Math.min(200, pageTokens?.length || 1))
    return {
      fileKind: hasTextOperators ? 'pdf_text' : 'pdf_image',
      pageEstimate,
    }
  } catch {
    return { fileKind: 'pdf_image', pageEstimate: 1 }
  }
}

function estimateSecondsByKind(fileKind, pageEstimate, sizeBytes) {
  const base = ETA_BY_KIND_SECONDS[fileKind] || ETA_BY_KIND_SECONDS.unknown
  const pageFactor = Math.max(1, pageEstimate || 1)
  const sizeFactor = Math.max(1, Math.ceil((sizeBytes || 0) / (3 * 1024 * 1024)))
  return Math.round(base + pageFactor * 0.7 + (sizeFactor - 1) * 2.5)
}

async function ensureIsNewProducts(products, signal) {
  if (!Array.isArray(products) || products.length === 0) return []
  const hasIsNewField = products[0].is_new !== undefined
  if (hasIsNewField) return products
  try {
    const { data } = await apiClient.get(ENDPOINTS.catalogue, {
      params: { limit: 1000 },
      signal,
    })
    return markNewProducts(products, data.products || [])
  } catch {
    return products.map((p) => ({ ...p, is_new: true }))
  }
}

export const supportsDirectoryPicker =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window

/**
 * Hook pour la logique d'upload (dropzone, dossier, caméra) et traitement API.
 */
export function useScanUpload() {
  const navigate = useNavigate()
  const folderInputRef = useRef()
  const isProcessingRef = useRef(false)
  const abortRef = useRef(null)

  const selectedModel = useDoclingStore((s) => s.selectedModel)
  const ocrEngine = useDoclingStore((s) => s.ocrEngine)
  const preprocessMode = useDoclingStore((s) => s.preprocessMode)
  const setJobStart = useDoclingStore((s) => s.setJobStart)
  const setJobComplete = useDoclingStore((s) => s.setJobComplete)

  const {
    batchQueue,
    stats,
    totalProducts,
    addToQueue,
    updateItem,
    removeFromQueue,
    clearQueue,
  } = useBatchQueue()

  const [batchDoneModal, setBatchDoneModal] = useState(null)
  const [cameraOverlay, setCameraOverlay] = useState(null)
  const prevPreviewRef = useRef(null)

  const [pendingCount, setPendingCount] = useState(0)
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [etaSummary, setEtaSummary] = useState(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch {
      setPendingCount(0)
    }
  }, [])

  const syncPendingUploads = useCallback(async () => {
    if (!navigator.onLine || syncInProgress) return
    const pending = await getPendingUploads()
    if (pending.length === 0) return
    setSyncInProgress(true)
    toast.info(`Synchronisation de ${pending.length} fichier(s)...`)
    for (const item of pending) {
      try {
        const file = new File(
          [item.fileData],
          item.fileName || 'facture',
          { type: item.fileType || 'application/pdf' }
        )
        const toUpload = file.type.startsWith('image/')
          ? await compressToWebP(file)
          : file
        const formData = new FormData()
        formData.append('file', toUpload)
        formData.append('model', item.model || selectedModel)
        formData.append('ocr_engine', item.ocr_engine || ocrEngine)
        formData.append('preprocess_mode', item.preprocess_mode || preprocessMode)
        formData.append('source', item.source || getSource())
        await apiClient.post(ENDPOINTS.process, formData)
        await removePendingUpload(item.id)
        toast.success(`${item.fileName} synchronisé`)
      } catch (err) {
        if (err.response?.status === 401) {
          toast.error('Reconnectez-vous pour synchroniser vos fichiers en attente')
          break
        }
        toast.error(`Erreur sync ${item.fileName}: ${err.message}`)
      }
    }
    setSyncInProgress(false)
    await refreshPendingCount()
  }, [refreshPendingCount, selectedModel, syncInProgress])

  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      await refreshPendingCount()
      const count = await getPendingCount()
      if (count > 0) {
        syncPendingUploads()
      }
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refreshPendingCount, syncPendingUploads])

  useEffect(() => {
    const url = cameraOverlay?.previewUrl
    if (prevPreviewRef.current && prevPreviewRef.current !== url) {
      URL.revokeObjectURL(prevPreviewRef.current)
    }
    prevPreviewRef.current = url || null
    return () => {
      if (prevPreviewRef.current) {
        URL.revokeObjectURL(prevPreviewRef.current)
        prevPreviewRef.current = null
      }
    }
  }, [cameraOverlay?.previewUrl])

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      addToQueue(acceptedFiles)
      const analyzed = await Promise.all(
        acceptedFiles.map(async (file) => {
          const kind = detectFileKindSync(file)
          if (kind === 'pdf_image') {
            const details = await estimatePdfDetails(file)
            return { file, ...details }
          }
          return { file, fileKind: kind, pageEstimate: 1 }
        })
      )
      analyzed.forEach(({ file, fileKind, pageEstimate }) => {
        const estimatedSeconds = estimateSecondsByKind(fileKind, pageEstimate, file.size)
        const queue = useDoclingStore.getState().batchQueue
        const match = queue.find(
          (q) =>
            q.status === 'pending' &&
            q.name === file.name &&
            q.size === file.size &&
            (q.fileKind === 'unknown' || q.estimatedSeconds == null)
        )
        if (match) {
          updateItem(match.id, { fileKind, pageEstimate, estimatedSeconds })
        }
      })
    },
    [addToQueue, updateItem]
  )

  const handleSelectFolder = useCallback(async () => {
    if (supportsDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
        toast.info('Scan des PDF en cours...')
        const pdfs = await collectPdfsFromDirectory(dirHandle)
        if (pdfs.length === 0) {
          toast.warning('Aucun fichier PDF trouvé dans ce dossier')
          return
        }
        await onDrop(pdfs)
        toast.success(`${pdfs.length} PDF ajouté${pdfs.length > 1 ? 's' : ''} à la file`)
      } catch (err) {
        if (err.name === 'AbortError') return
        toast.error(`Dossier : ${err.message}`)
      }
    } else if (folderInputRef?.current) {
      folderInputRef.current.accept = '.pdf'
      folderInputRef.current.click()
    }
  }, [onDrop])

  const handleFolderInputChange = useCallback(
    (e) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      const pdfs = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      e.target.value = ''
      if (pdfs.length === 0) {
        toast.warning('Aucun fichier PDF trouvé dans ce dossier')
        return
      }
      void onDrop(pdfs)
      toast.success(`${pdfs.length} PDF ajouté${pdfs.length > 1 ? 's' : ''} à la file`)
    },
    [onDrop]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    multiple: true,
    maxSize: 200 * 1024 * 1024,
    noClick: false,
  })

  const processItem = useCallback(
    async (item, pollIntervalMs = 5000) => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        if (!navigator.onLine) {
          await enqueueUpload(item.file, selectedModel, getSource())
          removeFromQueue(item.id)
          await refreshPendingCount()
          toast.info(`${item.name || item.file?.name} en attente de synchronisation`)
          return
        }
        updateItem(item.id, { status: 'uploading', progress: 10 })
        const fileToUpload = item.file.type.startsWith('image/')
          ? await compressToWebP(item.file)
          : item.file
        updateItem(item.id, { progress: 30 })

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('model', selectedModel)
        formData.append('ocr_engine', ocrEngine)
        formData.append('preprocess_mode', preprocessMode)
        formData.append('source', getSource())
        updateItem(item.id, { status: 'processing', progress: 50 })

        const { data: jobInfo } = await apiClient.post(ENDPOINTS.process, formData, {
          signal: ctrl.signal,
        })
        if (!jobInfo.job_id) throw new Error('Pas de Job ID reçu')

        const handleStatusDone = async (status) => {
          if (status.status === 'completed') {
            const r = status.result
            if (r && r.success === false) {
              throw new Error(r.error || "Extraction sans produit enregistrable")
            }
            const products = r?.products || []
            const enrichedProducts = await ensureIsNewProducts(products, ctrl.signal)
            updateItem(item.id, {
              status: 'done',
              progress: 100,
              productsAdded: enrichedProducts.length,
              products: enrichedProducts,
              facture_id: status.result?.facture_id,
              pdf_url: status.result?.pdf_url,
            })
            return true
          }
          if (status.status === 'error') {
            throw new Error(status.error || "Erreur lors de l'extraction IA")
          }
          return false
        }

        if (FEATURES.JOB_SSE) {
          const status = await waitScanJobViaSse(
            jobInfo.job_id,
            ctrl.signal,
            (_json, tick) => {
              const waitProgress = 50 + Math.min(45, tick * 2)
              updateItem(item.id, { progress: waitProgress })
            }
          )
          await handleStatusDone(status)
          return
        }

        let attempts = 0
        const maxAttempts = 60
        while (attempts < maxAttempts) {
          const { data: status } = await apiClient.get(ENDPOINTS.status(jobInfo.job_id), {
            signal: ctrl.signal,
          })
          if (await handleStatusDone(status)) return
          const waitProgress = 50 + Math.min(45, attempts * 2)
          updateItem(item.id, { progress: waitProgress })
          attempts++
          await new Promise((r) => setTimeout(r, pollIntervalMs))
        }
        throw new Error("Timeout : l'analyse prend trop de temps")
      } catch (err) {
        if (err.name === 'CanceledError' || ctrl.signal.aborted) {
          updateItem(item.id, { status: 'pending', progress: 0 })
          return
        }
        updateItem(item.id, {
          status: 'error',
          progress: 0,
          error: err.message || 'Erreur inconnue',
        })
      }
    },
    [
      selectedModel,
      updateItem,
      removeFromQueue,
      refreshPendingCount,
    ]
  )

  const startBatch = useCallback(async () => {
    if (isProcessingRef.current) return
    const pending = batchQueue
      .filter((i) => i.status === 'pending')
      .sort(
        (a, b) =>
          (a.estimatedSeconds ?? ETA_BY_KIND_SECONDS.unknown) -
          (b.estimatedSeconds ?? ETA_BY_KIND_SECONDS.unknown)
      )
    if (pending.length === 0) {
      toast.error('Aucun fichier en attente')
      return
    }

    isProcessingRef.current = true
    const pollMs = pending.length > 10 ? 8000 : 5000
    toast.info(`Traitement de ${pending.length} fichier(s)...`)

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const chunk = pending.slice(i, i + CONCURRENCY)
      await Promise.all(chunk.map((item) => processItem(item, pollMs)))
    }

    isProcessingRef.current = false
    const queue = useDoclingStore.getState().batchQueue
    const doneItems = queue.filter((i) => i.status === 'done')
    const done = doneItems.length
    const total = queue.reduce((acc, i) => acc + (i.productsAdded || 0), 0)
    const allProducts = doneItems.flatMap((i) => i.products || [])

    // Local preview: use last completed local file (no cloud dependency in Validation)
    const lastDone = doneItems[doneItems.length - 1]
    const localPreviewUrl = lastDone?.file ? URL.createObjectURL(lastDone.file) : null
    const batchMime = lastDone?.file?.type || 'application/pdf'

    if (allProducts.length > 0) {
      setJobComplete(allProducts, getSource(), localPreviewUrl, batchMime)
    }

    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    if (done === 0) {
      toast.error('Aucun fichier n’a terminé avec succès. Vérifiez les erreurs dans la file.')
      return
    }
    if (total === 0) {
      toast.warning(
        `${done} fichier(s) traité(s), mais aucun produit à valider. Vérifiez les factures ou l’historique.`
      )
      navigate('/validation')
      return
    }
    toast.success(`${done} fichier(s) traité(s) — ${total} produits extraits — redirection vers la validation`)
    navigate('/validation')
  }, [batchQueue, processItem, setJobComplete, navigate])

  useEffect(() => {
    const pending = batchQueue.filter((i) => i.status === 'pending')
    if (pending.length === 0) {
      setEtaSummary(null)
      return
    }
    const totalSeconds = pending.reduce(
      (acc, item) => acc + (item.estimatedSeconds ?? ETA_BY_KIND_SECONDS.unknown),
      0
    )
    const breakdown = {
      pdf_text: pending.filter((x) => x.fileKind === 'pdf_text').length,
      pdf_image: pending.filter((x) => x.fileKind === 'pdf_image').length,
      image: pending.filter((x) => x.fileKind === 'image').length,
      unknown: pending.filter((x) => !x.fileKind || x.fileKind === 'unknown').length,
    }
    setEtaSummary({
      totalSeconds,
      totalFiles: pending.length,
      breakdown,
    })
  }, [batchQueue])

  const handleCameraFile = useCallback(
    async (e) => {
      const file = e.target.files[0]
      e.target.value = ''
      if (!file) return

      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      const fileUrl = URL.createObjectURL(file)
      setCameraOverlay({ previewUrl: fileUrl, step: 'upload', error: null })
      setJobStart('camera', fileUrl)

      if (!navigator.onLine) {
        try {
          await enqueueUpload(file, selectedModel, getSource())
          await refreshPendingCount()
          setCameraOverlay(null)
          toast.success('Photo enregistrée, sera synchronisée au retour en ligne')
        } catch (err) {
          setCameraOverlay((prev) => ({ ...prev, step: 'error', error: err.message }))
          toast.error(`Erreur : ${err.message}`)
        }
        return
      }

      try {
        const toUpload = await compressToWebP(file)
        setCameraOverlay((prev) => ({ ...prev, step: 'ai' }))

        const formData = new FormData()
        formData.append('file', toUpload)
        formData.append('model', selectedModel)
        formData.append('ocr_engine', ocrEngine)
        formData.append('preprocess_mode', preprocessMode)
        formData.append('source', getSource())

        const { data: jobInfo } = await apiClient.post(ENDPOINTS.process, formData, {
          signal: ctrl.signal,
        })
        if (!jobInfo.job_id) throw new Error('Pas de Job ID reçu')

        setCameraOverlay((prev) => ({ ...prev, step: 'validate' }))

        const finishCameraSuccess = async (status) => {
          const r = status.result
          if (r && r.success === false) {
            throw new Error(r.error || "Extraction sans produit enregistrable")
          }
          setCameraOverlay((prev) => ({ ...prev, step: 'done' }))
          const validationPreviewUrl = URL.createObjectURL(file)
          const enrichedProducts = await ensureIsNewProducts(r?.products || [], ctrl.signal)
          setJobComplete(
            enrichedProducts,
            getSource(),
            validationPreviewUrl,
            file.type || 'image/jpeg'
          )
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          await new Promise((r) => setTimeout(r, 600))
          setCameraOverlay(null)
          navigate('/validation', { replace: true })
        }

        if (FEATURES.JOB_SSE) {
          const status = await waitScanJobViaSse(jobInfo.job_id, ctrl.signal)
          if (status.status === 'error') throw new Error(status.error || 'Erreur extraction')
          await finishCameraSuccess(status)
          return
        }

        let attempts = 0
        while (attempts < 60) {
          const { data: status } = await apiClient.get(ENDPOINTS.status(jobInfo.job_id), {
            signal: ctrl.signal,
          })
          if (status.status === 'completed') {
            await finishCameraSuccess(status)
            return
          }
          if (status.status === 'error') throw new Error(status.error)
          attempts++
          await new Promise((r) => setTimeout(r, 3000))
        }
        throw new Error('Timeout caméra')
      } catch (err) {
        if (err.name === 'CanceledError' || ctrl.signal.aborted) return
        setCameraOverlay((prev) => ({ ...prev, step: 'error', error: err.message }))
        toast.error(`Erreur : ${err.message}`)
        setTimeout(() => setCameraOverlay(null), 3000)
      }
    },
    [selectedModel, ocrEngine, preprocessMode, setJobStart, setJobComplete, refreshPendingCount, navigate]
  )

  return {
    getRootProps,
    getInputProps,
    isDragActive,
    open,
    folderInputRef,
    onDrop,
    handleSelectFolder,
    handleFolderInputChange,
    processItem,
    startBatch,
    handleCameraFile,
    batchQueue,
    stats,
    totalProducts,
    addToQueue,
    updateItem,
    removeFromQueue,
    clearQueue,
    batchDoneModal,
    setBatchDoneModal,
    cameraOverlay,
    pendingCount,
    syncInProgress,
    isOnline,
    etaSummary,
  }
}
