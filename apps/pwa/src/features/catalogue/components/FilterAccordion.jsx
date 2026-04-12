import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const CHIP_BASE = 'chip inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all duration-150'
const CHIP_REST = 'border border-border bg-surface text-text-secondary hover:border-border-medium hover:bg-surface hover:text-text-primary'
const CHIP_ON = 'border-2 border-warning bg-elevated text-text-primary shadow-xs ring-1 ring-warning/15'

export default function FilterAccordion({ groupKey, title, subtitleEmpty, icon: IconComponent, selected, options = [], expandedKey, onExpand, onSelect, onClear, decorateOption }) {
  const open = expandedKey === groupKey
  const hasSel = Boolean(selected)
  const borderClass = hasSel ? 'border-warning shadow-amber-sm' : open ? 'border-border-medium' : 'border-border'

  const pick = (opt) => {
    if (selected === opt) onClear()
    else onSelect(opt)
    onExpand(null)
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-elevated transition-colors duration-150 ${borderClass}`}>
      <button type="button" aria-expanded={open} onClick={() => onExpand(open ? null : groupKey)} className={`filter-trigger flex w-full cursor-pointer select-none items-center justify-between gap-2 px-3.5 py-2.5 text-left ${hasSel ? 'has-selection' : ''}`}>
        <div className="filter-trigger-left flex min-w-0 flex-1 items-center gap-2">
          <div className={`filter-trigger-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${hasSel ? 'bg-warning-bg' : 'bg-surface'}`}>
            <IconComponent size={13} className={hasSel ? 'text-warning' : 'text-text-secondary'} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="filter-trigger-label text-base font-medium text-text-primary">{title}</p>
            <p className="filter-trigger-sub mt-px truncate text-xs text-text-secondary">{selected || subtitleEmpty}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasSel && <span className="filter-badge max-w-[7.5rem] truncate rounded-full border border-border-medium bg-elevated px-2.5 py-1 text-2xs font-semibold text-text-primary shadow-xs">{selected}</span>}
          <ChevronDown size={16} className={`filter-chevron shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0.6 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0.6 }} className="filter-panel overflow-hidden border-t border-border bg-surface/60">
            <div className="filter-panel-inner max-h-[300px] overflow-y-auto px-3.5 pb-3 pt-2.5">
              {options.length === 0 ? (
                <p className="text-center text-sm text-text-secondary">Aucune option</p>
              ) : (
                <div className="chips flex flex-wrap gap-2">
                  {options.map(opt => {
                    const active = selected === opt
                    const label = decorateOption ? decorateOption(opt) : opt
                    return (
                      <button key={opt} type="button" onClick={() => pick(opt)} className={`${CHIP_BASE} ${active ? `${CHIP_ON} active` : CHIP_REST}`}>
                        {active && <span className="text-xs font-bold text-warning">✓ </span>}
                        <span className="truncate">{label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
