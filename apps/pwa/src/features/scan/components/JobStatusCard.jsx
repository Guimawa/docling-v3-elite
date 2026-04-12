import { AlertCircle, CheckCircle2, Loader2, PackagePlus, X } from 'lucide-react'
import { motion } from 'framer-motion'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

const STATUS_CONFIG = {
  pending: { color: 'text-text-secondary', bg: 'bg-surface', label: 'En attente' },
  uploading: { color: 'text-info', bg: 'bg-info-bg', label: 'Envoi...' },
  processing: { color: 'text-warning', bg: 'bg-warning-bg', label: 'Analyse IA...' },
  done: { color: 'text-primary', bg: 'bg-primary-pale', label: 'Terminé' },
  error: { color: 'text-error', bg: 'bg-error-bg', label: 'Erreur' },
}

/**
 * Carte affichant le statut d'un job (fichier en cours / terminé / erreur).
 */
export default function JobStatusCard({ item, onRemove }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 premium-card !px-4 !py-3 hover:bg-white/[0.05]"
    >
      <div className={`shrink-0 ${cfg.color}`}>
        {item.status === 'done'
          ? <CheckCircle2 size={18} />
          : item.status === 'error'
          ? <AlertCircle size={18} />
          : ['uploading', 'processing'].includes(item.status)
          ? <Loader2 size={18} className="animate-spin" />
          : <PackagePlus size={18} className="text-text-secondary" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-secondary truncate">
          {item.name || item.file?.name || 'Fichier'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-2xs font-bold uppercase tracking-wider ${cfg.color}`}>
            {cfg.label}
          </span>
          {item.status === 'done' && item.productsAdded > 0 && (
            <span className="text-2xs text-primary font-bold">
              +{item.productsAdded} produits
            </span>
          )}
          {item.status === 'error' && (
            <span className="truncate text-2xs text-error">{item.error}</span>
          )}
          <span className="text-2xs text-text-secondary ml-auto">{formatSize(item.size)}</span>
        </div>
        {['uploading', 'processing'].includes(item.status) && (
          <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-surface ring-1 ring-text-primary/[0.04]">
            <motion.div
              className="h-full rounded-full bg-gradient-coral-btn"
              animate={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
      {(item.status === 'pending' || item.status === 'error') && (
        <button
          onClick={() => onRemove(item.id)}
          aria-label="Retirer de la file"
          className="shrink-0 rounded-lg p-1 text-text-secondary transition-colors hover:bg-error-bg hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/25"
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  )
}
