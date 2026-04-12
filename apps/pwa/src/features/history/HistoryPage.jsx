import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import SkeletonCard from '@/shared/ui/SkeletonCard'
import PageTransition from '@/components/PageTransition'
import { useAppI18n } from '@/shared/i18n/appI18n'

// Sections
import HistoryHeader from './sections/HistoryHeader'
import HistoryStats from './sections/HistoryStats'
import HistoryFamilies from './sections/HistoryFamilies'
import HistoryList from './sections/HistoryList'
import HistoryEmptyState from './sections/HistoryEmptyState'

export default function HistoryPage() {
  const t = useAppI18n()
  const historyLoadErr = t.history.loadErr
  const navigate = useNavigate()
  
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState(null)
  const [retrying, setRetrying] = useState(null)
  const [loadingPdf, setLoadingPdf] = useState(null)

  const handleViewPdf = async (facture) => {
    if (!facture.pdf_url || !facture.id) return
    setLoadingPdf(facture.id)
    try {
      const { data } = await apiClient.get(ENDPOINTS.pdfUrl(facture.id))
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer')
      else toast.error(t.history.noPdfUrl)
    } catch {
      toast.error(t.history.pdfErr)
    } finally {
      setLoadingPdf(null)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [histRes, statsRes] = await Promise.all([
        apiClient.get(ENDPOINTS.history),
        apiClient.get(ENDPOINTS.stats),
      ])
      setHistory(histRes.data.history || [])
      setStats(statsRes.data)
    } catch {
      toast.error(historyLoadErr)
    } finally {
      setLoading(false)
    }
  }, [historyLoadErr])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRescan = async (facture) => {
    if (!facture.pdf_url) {
      toast.error(t.history.noCloudFile)
      return
    }
    setRetrying(facture.id)
    try {
      const { data } = await apiClient.get(ENDPOINTS.pdfUrl(facture.id))
      const pdfFetchUrl = data?.url || facture.pdf_url
      const response = await fetch(pdfFetchUrl)
      if (!response.ok) throw new Error(t.history.inaccessibleFile)
      const blob = await response.blob()
      const file = new File([blob], facture.filename || 'facture.pdf', { type: blob.type })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('model', facture.modele_ia || 'gemini-3.1-pro-preview')
      formData.append('source', facture.source || 'pc')

      const { data: jobInfo } = await apiClient.post(ENDPOINTS.process, formData)
      if (!jobInfo.job_id) throw new Error(t.history.noJobId)

      let attempts = 0
      while (attempts < 60) {
        const { data: status } = await apiClient.get(ENDPOINTS.status(jobInfo.job_id))
        if (status.status === 'completed') {
          toast.success(`Re-scan OK : ${status.result?.products_added || 0} produits`)
          fetchData()
          return
        }
        if (status.status === 'error') throw new Error(status.error || t.history.extractionError)
        attempts++
        await new Promise(r => setTimeout(r, 3000))
      }
      throw new Error(t.history.timeout)
    } catch (err) {
      toast.error(`Re-scan : ${err.message}`)
    } finally {
      setRetrying(null)
    }
  }

  const totalProduits = history.reduce((acc, f) => acc + (f.nb_produits_extraits || 0), 0)
  const totalCout     = history.reduce((acc, f) => acc + (parseFloat(f.cout_api_usd) || 0), 0)

  return (
    <PageTransition variant="fade">
      <div className="relative min-h-screen overflow-x-hidden bg-transparent">
        <div className="aurora-bg opacity-30" aria-hidden="true">
          <div /><div /><div />
        </div>
        
        <HistoryHeader loading={loading} fetchData={fetchData} t={t} />

        <div className="relative z-0 mx-auto max-w-4xl px-4 pb-28 sm:px-5">
          {loading ? (
            <SkeletonCard count={6} variant="history" />
          ) : history.length === 0 ? (
            <HistoryEmptyState navigate={navigate} t={t} />
          ) : (
            <>
              <HistoryStats history={history} totalProduits={totalProduits} totalCout={totalCout} t={t} />
              <HistoryFamilies stats={stats} t={t} />
              <HistoryList 
                history={history} 
                loadingPdf={loadingPdf} 
                handleViewPdf={handleViewPdf} 
                handleRescan={handleRescan} 
                retrying={retrying} 
                t={t} 
              />
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
