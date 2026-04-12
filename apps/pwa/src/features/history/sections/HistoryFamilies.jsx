import React from 'react'

export default function HistoryFamilies({ stats, t }) {
  if (!stats?.familles?.length) return null

  return (
    <div className="mb-5 rounded-2xl border border-border/80 bg-elevated p-4 shadow-xs">
      <p className="text-2xs font-black text-text-tertiary uppercase tracking-widest mb-3">
        {t.history.families}
      </p>
      <div className="space-y-2">
        {stats.familles.slice(0, 6).map(f => (
          <div key={`${f.famille}-${f.nb}`} className="flex items-center gap-2">
            <span className="text-xs text-text-secondary w-28 truncate">{f.famille}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-medium to-primary-light"
                style={{ width: `${Math.min((f.nb / stats.total_produits) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-text-tertiary w-8 text-right">{f.nb}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
