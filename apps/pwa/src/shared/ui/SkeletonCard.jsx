/**
 * Skeleton loader — pattern Emmet : div.rounded-xl.border*N
 * Réutilisable pour App, CataloguePage, HistoryPage
 */
export default function SkeletonCard({ count = 4, variant = 'card' }) {
  const configs = {
    card: {
      grid: 'grid gap-4 grid-cols-1 sm:grid-cols-2',
      item: 'rounded-2xl bg-surface border border-border/60 overflow-hidden',
      image: 'h-24 bg-border/20 animate-pulse motion-reduce:animate-none',
      body: 'p-4 space-y-2',
      line1: 'h-4 bg-border/20 rounded-md animate-pulse motion-reduce:animate-none',
      line2: 'h-3 bg-border/20 rounded-md animate-pulse motion-reduce:animate-none',
      widths: { line1: '80%', line2: '50%' },
    },
    catalogue: {
      grid: 'grid gap-3 p-2 sm:grid-cols-2 lg:grid-cols-3',
      item: 'rounded-2xl bg-surface border border-border/60 overflow-hidden animate-pulse motion-reduce:animate-none',
      image: 'h-20 bg-border/20',
      body: 'p-3 space-y-2',
      line1: 'h-4 bg-border/20 rounded-md w-[80%]',
      line2: 'h-3 bg-border/20 rounded-md w-[50%]',
    },
    history: {
      grid: 'grid gap-4 sm:grid-cols-2 pt-4',
      item: 'rounded-2xl bg-surface border border-border/60 p-5 animate-pulse motion-reduce:animate-none',
      image: null,
      body: 'space-y-0',
      line1: 'h-4 bg-border/20 rounded-md w-[75%] mb-3',
      line2: 'h-3 bg-border/20 rounded-md w-[50%]',
    },
  }

  const c = configs[variant] || configs.card
  const items = Array.from({ length: count }, (_, i) => i + 1)

  return (
    <div className={c.grid} role="status" aria-live="polite" aria-busy="true" aria-label="Chargement">
      {items.map((itemId) => (
        <div key={`skeleton-${variant}-${itemId}`} className={c.item}>
          {c.image && <div className={c.image} />}
          <div className={c.body}>
            <div className={c.line1} {...(c.widths && { style: { width: c.widths.line1 } })} />
            <div className={c.line2} {...(c.widths && { style: { width: c.widths.line2 } })} />
          </div>
        </div>
      ))}
    </div>
  )
}
