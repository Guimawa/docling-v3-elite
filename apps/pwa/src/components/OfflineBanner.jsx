/**
 * Bannière fixe en haut de l'écran : fichiers en attente (hors ligne).
 * Visible sur toutes les pages quand offline ou pending > 0.
 * Inclut bouton "Réessayer" pour forcer sync manuelle.
 */
import { AlertCircle, PackagePlus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getPendingCount, processQueue } from '@/shared/lib/offlineQueue'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { toast } from 'sonner'

export default function OfflineBanner() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [processing, setProcessing] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch {
      setPendingCount(0)
    }
  }, [])

  const handleProcessQueue = useCallback(async () => {
    if (processing || pendingCount === 0) return

    setProcessing(true)
    try {
      const uploadFn = async (file, model, source) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('model_id', model)
        formData.append('source', source)

        const { data } = await apiClient.post(ENDPOINTS.process, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        return data.job_id
      }

      const result = await processQueue(uploadFn)

      if (result.success > 0) {
        toast.success(`${result.success} upload(s) réussi(s)`)
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} upload(s) échoué(s)`)
      }

      await refresh()
    } catch (error) {
      console.error('Queue processing error:', error)
      toast.error('Erreur traitement queue')
    } finally {
      setProcessing(false)
    }
  }, [processing, pendingCount, refresh])

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      await refresh()
      // Auto-process queue when back online
      if (pendingCount > 0) {
        handleProcessQueue()
      }
    }
    const onOffline = () => setIsOnline(false)
    const onQueueUpdated = () => refresh()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('docling-offline-queue-updated', onQueueUpdated)
    queueMicrotask(() => refresh())
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('docling-offline-queue-updated', onQueueUpdated)
    }
  }, [refresh, pendingCount, handleProcessQueue])

  if (isOnline && pendingCount === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3
        bg-amber-600/90 backdrop-blur-xl text-white text-sm font-bold px-4 py-2.5
        border-b border-amber-500/40 shadow-lg"
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        <>
          <AlertCircle size={18} />
          Hors ligne — {pendingCount} fichier(s) en attente
        </>
      ) : (
        <>
          <PackagePlus size={18} />
          <span>{pendingCount} fichier(s) en attente</span>
          <button
            onClick={handleProcessQueue}
            disabled={processing}
            className="ml-2 flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30
              rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={processing ? 'animate-spin' : ''} />
            Réessayer
          </button>
        </>
      )}
    </div>
  )
}
