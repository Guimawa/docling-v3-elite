import React from 'react'
import { motion } from 'framer-motion'
const DOT_CLASS = ['bg-primary-light', 'bg-success', 'bg-info']
function productDotClass(p) {
  const n = Number(p?.id) || 0
  return DOT_CLASS[Math.abs(n) % DOT_CLASS.length]
}

export default function ProductCard({ p, onClick, t }) {
  const dot = productDotClass(p)
  const conseille = parseFloat(p.prix_conseille_vente || 0)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.995 }}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-[11px] border border-border bg-elevated px-3.5 py-2.5 text-left transition-colors duration-100 hover:border-border-medium"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-text-primary">{p.designation_fr}</p>
        <p className="mt-px truncate text-xs text-text-secondary">
          {p.fournisseur}
          {p.famille ? ` · ${p.famille}` : ''}
        </p>
        {conseille > 0 && (
          <p className="mt-0.5 truncate text-2xs font-semibold text-primary">
            {t.catalogue.columns.recommendedSale} {conseille.toFixed(2)} €
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span className="text-base font-medium text-text-primary">
          {parseFloat(p.prix_remise_ht || 0).toFixed(2)} €
        </span>
        {p.remise_pct > 0 && (
          <span className="ml-1 text-2xs font-semibold text-warning">-{p.remise_pct}%</span>
        )}
      </div>
    </motion.button>
  )
}
