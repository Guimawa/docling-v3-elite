import React from 'react'
import { motion } from 'framer-motion'

const CHIP_BASE = 'chip inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all duration-150'
const CHIP_REST = 'border border-border bg-surface text-text-secondary hover:border-border-medium hover:bg-surface hover:text-text-primary'
const CHIP_ON = 'border-2 border-warning bg-elevated text-text-primary shadow-xs ring-1 ring-warning/15'

export default function CascadeLevel({ label, values, selected, onSelect }) {
  if (!values || values.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="cascade-level overflow-hidden">
      <div className="cascade-level-inner pb-2">
        <div className="cascade-label mb-2 flex items-baseline gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-text-secondary">
          <span className="inline-block w-4 shrink-0 border-t border-border-medium" />
          <span>— {label}</span>
        </div>
        <div className="chips flex flex-wrap gap-2">
          {values.map(v => {
            const active = selected === v
            return (
              <button key={v} type="button" onClick={() => onSelect(active ? '' : v)} className={`${CHIP_BASE} ${active ? `${CHIP_ON} active` : CHIP_REST}`}>
                {active && <span className="text-xs font-bold text-warning">✓ </span>}
                {v}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
