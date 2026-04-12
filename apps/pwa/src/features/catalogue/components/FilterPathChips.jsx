import React, { Fragment } from 'react'
import { ChevronRight, X } from 'lucide-react'

export default function FilterPathChips({ filters, setFilter, t }) {
  const segments = [
    { key: 'fournisseur', value: filters.fournisseur },
    { key: 'famille', value: filters.famille },
    { key: 'sous_famille', value: filters.sous_famille },
    { key: 'type_produit', value: filters.type_produit },
    { key: 'variante', value: filters.variante },
    { key: 'dimension', value: filters.dimension },
  ].filter((s) => Boolean(s.value))

  if (segments.length === 0) return null

  return (
    <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border border-primary/20 bg-primary-pale/50 px-3 py-2.5 shadow-xs">
      <span className="mr-1 text-2xs font-bold uppercase tracking-wider text-text-secondary">Parcours</span>
      {segments.map((seg, i) => (
        <Fragment key={seg.key}>
          {i > 0 && <ChevronRight size={14} className="shrink-0 text-text-tertiary opacity-70" />}
          <span className="inline-flex max-w-[min(100%,14rem)] items-center gap-0.5 rounded-full border border-border-medium bg-elevated py-0.5 pl-2.5 pr-0.5 text-xs font-semibold text-text-primary">
            <span className="min-w-0 truncate">{seg.value}</span>
            <button type="button" className="rounded-full p-1 text-text-tertiary transition hover:bg-error/10 hover:text-error" onClick={() => setFilter(seg.key, '')}>
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        </Fragment>
      ))}
    </nav>
  )
}
