import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Trash2, UploadCloud } from 'lucide-react'
import JobStatusCard from './JobStatusCard'

/**
 * Liste des fichiers en attente avec stats, barre de progression et actions batch.
 */
export default function BatchQueue({
  batchQueue,
  stats,
  totalProducts,
  removeFromQueue,
  clearQueue,
  startBatch,
  etaSummary,
}) {
  if (batchQueue.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-5"
      >
        {stats.total > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Total',    val: stats.total,   color: 'text-indigo-400' },
              { label: 'En cours', val: stats.running, color: 'text-blue-400' },
              { label: 'OK',       val: stats.done,    color: 'text-emerald-400' },
              { label: 'Produits', val: totalProducts, color: 'text-indigo-300' },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="premium-card !p-3 text-center"
              >
                <div className={`font-heading text-xl font-bold ${color}`}>{val}</div>
                <div className="mt-0.5 text-2xs font-bold uppercase tracking-wider text-text-tertiary">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {stats.total > 0 && (
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-white/[0.05]">
            <motion.div
              className="h-full rounded-full bg-indigo-500"
              animate={{ width: `${(stats.done / stats.total) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {etaSummary && (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
            Traitement optimisé: les fichiers rapides sont lancés en premier.
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <AnimatePresence>
            {batchQueue.map((item) => (
              <JobStatusCard key={item.id} item={item} onRemove={removeFromQueue} />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startBatch}
            disabled={stats.pending === 0 || stats.running > 0}
            data-testid="scan-lancer-btn"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            {stats.running > 0
              ? <><Loader2 size={18} className="animate-spin" /> Traitement en cours...</>
              : <><UploadCloud size={18} /> Lancer ({stats.pending} fichier{stats.pending > 1 ? 's' : ''})</>
            }
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (window.confirm('Vider toute la file d\'attente ?')) clearQueue()
            }}
            disabled={stats.running > 0}
            aria-label="Vider la file"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-4 text-text-secondary shadow-sm transition-all hover:bg-white/10 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          >
            <Trash2 size={18} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
