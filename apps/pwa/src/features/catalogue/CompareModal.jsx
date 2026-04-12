import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Loader2, Search, TrendingUp, X } from 'lucide-react'
import EmptyStateIllustration from '@/shared/ui/EmptyStateIllustration'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function CompareModal({ isOpen, onClose, triggerRef, initialSearch = '' }) {
  const [search, setSearch] = useState(initialSearch)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = triggerRef?.current ?? document.activeElement
    }
  }, [isOpen, triggerRef])

  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => {
      document.getElementById('compare-search')?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = [...dialog.querySelectorAll(FOCUSABLE)]
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      previousFocusRef.current?.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      clearTimeout(debounceRef.current)
    }
  }, [])

  const doSearch = useCallback(async (q) => {
    const term = (q || search).trim()
    if (term.length < 2) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const { data } = await apiClient.get(ENDPOINTS.compare, {
        params: { search: term },
        signal: ctrl.signal,
      })
      setResults(data.results || [])
      if (data.results?.length === 0) toast.info('Aucun produit similaire')
    } catch (err) {
      if (err.name === 'CanceledError' || ctrl.signal.aborted) return
      toast.error('Erreur comparaison')
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [search])

  const handleInputChange = useCallback((e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 400)
    }
  }, [doSearch])

  const chartData = useMemo(() => {
    const all = []
    for (const r of results) {
      const hist = r.price_history || []
      for (const h of hist) {
        all.push({
          date: h.recorded_at ? new Date(h.recorded_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: '2-digit' }) : '',
          prix: parseFloat(h.prix_ht) || 0,
          fournisseur: r.fournisseur,
        })
      }
    }
    return all.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [results])

  const bestPrice = results.length > 0
    ? Math.min(...results.map(r => parseFloat(r.prix_remise_ht) || Infinity))
    : 0
  const maxPrice = results.length > 0
    ? Math.max(...results.map(r => parseFloat(r.prix_remise_ht) || 0))
    : 1

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              <h2 id="compare-modal-title" className="text-lg font-black text-text-primary">Comparateur Prix</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" className="text-text-secondary transition-colors hover:text-text-primary">
              <X size={20} />
            </button>
          </div>

          <div className="border-b border-border p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="compare-search" className="sr-only">Rechercher un produit à comparer</label>
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  id="compare-search"
                  value={search}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Ex: ciment, tube cuivre..."
                  className="w-full rounded-xl border border-border bg-stone-100 py-2.5 pl-9 pr-4 text-sm
                    text-text-primary placeholder-text-tertiary transition-all focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={() => doSearch()}
                disabled={loading || search.trim().length < 2}
                className="px-4 py-2.5 bg-primary hover:bg-cta-hover disabled:opacity-40
                  text-white rounded-xl font-bold text-sm transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Comparer'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-full max-w-[200px] h-32">
                  <EmptyStateIllustration className="w-full h-full min-h-[128px]" />
                </div>
                <p className="text-center text-sm text-text-secondary">
                  Recherchez un produit pour comparer les prix
                </p>
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {results.length > 0 && chartData.length > 0 && (
              <div className="mb-4 rounded-xl border border-border bg-stone-100 p-3">
                <p className="mb-2 flex items-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-secondary">
                  <TrendingUp size={12} />
                  Evolution des prix
                </p>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `${v}€`} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(v) => [`${parseFloat(v).toFixed(2)} €`, 'Prix HT']}
                        labelFormatter={(l) => l}
                      />
                      <Area type="monotone" dataKey="prix" stroke="#B45309" fill="#B453091A" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {results.map((r, i) => {
                const price = parseFloat(r.prix_remise_ht) || 0
                const isBest = price === bestPrice && price > 0
                const barWidth = maxPrice > 0 ? (price / maxPrice) * 100 : 0

                return (
                  <motion.div
                    key={r.id ?? `comp-${(r.fournisseur || '')}-${(r.designation_fr || '').slice(0, 50)}-${r.prix_remise_ht ?? 0}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-3 rounded-xl border ${
                      isBest
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-surface/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{r.designation_fr}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">{r.fournisseur}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-base font-black ${isBest ? 'text-primary' : 'text-text-primary'}`}>
                          {price.toFixed(2)} €
                        </span>
                        <span className="block text-2xs text-text-secondary">/{r.unite}</span>
                        {isBest && (
                          <span className="text-2xs font-bold uppercase text-primary">Meilleur prix</span>
                        )}
                      </div>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                      <div
                        className={`h-full rounded-full transition-all ${isBest ? 'bg-primary' : 'bg-gray-500'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    {r.remise_pct > 0 && (
                      <span className="text-2xs text-amber-500 font-bold mt-1 inline-block">
                        -{r.remise_pct}% remise
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
