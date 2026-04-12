import { motion } from 'framer-motion'
import { Package, Pencil, Sparkles, X } from 'lucide-react'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import { useAppI18n } from '@/shared/i18n/appI18n'

function fmtEuro(val) {
  const n = parseFloat(val)
  return Number.isNaN(n) || n === 0 ? '—' : `${n.toFixed(2)} €`
}

/** Enrichissement IA en cours ou encore absent (pas de statut API explicite). */
function isIaEnrichmentSearching(product) {
  if (product.enrichment_status === 'pending') return true
  if (product.enrichment_status === 'failed' || product.enrichment_status === 'skipped') return false
  if (product.enrichment_status === 'complete') return false
  return !product.photo_url && !product.description_ia
}

export default function ProductSheet({ product, onClose, onEdit, onCompare }) {
  const t = useAppI18n()
  if (!product) return null
  const net = parseFloat(product.prix_remise_ht || 0)
  const brut = parseFloat(product.prix_brut_ht || 0)
  const tva = parseFloat(import.meta.env.VITE_TVA_RATE || '0.21')
  const ttcRem =
    parseFloat(product.prix_ttc_remise || 0) ||
    parseFloat(product.prix_ttc_iva21 || 0) ||
    (net > 0 ? net * (1 + tva) : 0)
  const ttcNon =
    parseFloat(product.prix_ttc_non_remise || 0) ||
    (brut > 0 ? brut * (1 + tva) : 0)
  const conseille = parseFloat(product.prix_conseille_vente || 0)
  const iaSearching = isIaEnrichmentSearching(product)

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-elevated shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <h2 className="min-w-0 font-heading text-lg font-semibold text-text-primary">Fiche produit</h2>
            {iaSearching && (
              <Badge variant="warning" size="sm" dot className="motion-safe:animate-pulse">
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={11} className="shrink-0" aria-hidden />
                  IA en recherche…
                </span>
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border p-2 text-text-secondary hover:text-text-primary"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {product.photo_url ? (
            <img src={product.photo_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
          ) : (
            <div className="mb-4 flex min-h-[8rem] w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface px-3 py-4 text-center">
              <Package size={40} className="text-text-tertiary" aria-hidden />
              {iaSearching && (
                <p className="text-xs leading-snug text-text-secondary">
                  Photo et fiche peuvent être complétées automatiquement (enrichissement en arrière-plan).
                </p>
              )}
            </div>
          )}
          <p className="text-base font-bold leading-snug text-text-primary">{product.designation_fr}</p>
          <p className="mt-1 text-sm text-text-secondary">{product.fournisseur}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.famille && <Badge variant="neutral">{product.famille}</Badge>}
            {product.unite && <Badge variant="neutral">{product.unite}</Badge>}
          </div>
          {product.description_ia && <p className="mt-4 text-sm text-text-secondary">{product.description_ia}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-stone-50/80 p-3 text-sm">
            <div>
              <p className="text-2xs font-bold uppercase text-text-secondary">{t.catalogue.columns.gross}</p>
              <p className="font-bold text-text-primary">{brut > 0 ? `${brut.toFixed(2)} €` : '—'}</p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-text-secondary">{t.catalogue.columns.discount}</p>
              <p className="font-bold text-text-primary">{parseFloat(product.remise_pct || 0)} %</p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-text-secondary">{t.catalogue.columns.net}</p>
              <p className="text-lg font-black text-primary">{net.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-text-secondary">{t.catalogue.columns.ttcRemise}</p>
              <p className="font-bold text-text-primary">{ttcRem > 0 ? fmtEuro(ttcRem) : '—'}</p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-text-secondary">{t.catalogue.columns.ttcNonRemise}</p>
              <p className="font-bold text-text-primary">{ttcNon > 0 ? fmtEuro(ttcNon) : '—'}</p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-text-secondary">{t.catalogue.columns.recommendedSale}</p>
              <p className="font-bold text-primary">{conseille > 0 ? fmtEuro(conseille) : '—'}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 space-y-2 border-t border-border p-4">
          <Button type="button" className="w-full" onClick={() => onEdit?.(product)}>
            <Pencil size={14} className="mr-2 inline" />
            Modifier
          </Button>
          {onCompare && (
            <Button type="button" variant="ghost" className="w-full border border-border" onClick={onCompare}>
              Comparer
            </Button>
          )}
        </div>
    </motion.aside>
  )
}
