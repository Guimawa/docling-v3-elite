import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, CheckCircle2, FileText, ChevronRight } from 'lucide-react'
import { interpolate } from '@/shared/i18n/appI18n'

function InvoiceCard({ group, onOpen, done, t }) {
  const count = group.items.length
  return (
    <motion.button layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.95, transition:{ duration:0.2 } }}
      onClick={()=>onOpen(group)}
      className={`w-full rounded-2xl border bg-elevated px-4 py-4 text-left shadow-xs transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.99] ${done?'border-primary/30':count>0?'border-warning/40':'border-border'}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${done?'bg-primary/10':count>0?'bg-warning-bg':'bg-surface'}`}>
          {done?<CheckCircle2 size={18} className="text-primary"/>:<FileText size={18} className={count>0?'text-warning':'text-text-secondary'}/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">{group.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xs text-text-secondary">{group.subtitle}</span>
            {!done && count > 0 && (
              <span className="rounded-full bg-warning-bg px-2 py-0.5 text-2xs font-black text-warning">
                {interpolate(t.validation.invoiceNewBadge, { count, nel: count > 1 ? 'x' : '' })}
              </span>
            )}
            {!done && count === 0 && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-2xs font-bold text-text-secondary">
                {t.validation.alreadyInCatalogue}
              </span>
            )}
            {done && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-black text-primary">
                {t.validation.invoiceSavedBadge}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={15} className="shrink-0 text-text-secondary"/>
      </div>
    </motion.button>
  )
}

export default function ValidationInvoiceList({ pendingGroups, allGroupsCount, allValidatedCount, setActiveGroup, t }) {
  const hiddenDuplicatesCount = 0 // Will be passed as prop if needed or logic moved here

  return (
    <main className="relative z-0 mx-auto w-full max-w-lg flex-1 space-y-2.5 px-4 pb-32 pt-3 sm:px-5">
      <AnimatePresence initial={false}>
        {pendingGroups.map((group, i) => (
          <motion.div key={group.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
            <InvoiceCard group={group} onOpen={setActiveGroup} done={false} t={t}/>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {pendingGroups.length === 0 && allGroupsCount > 0 && allValidatedCount > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary-pale/40 px-3 py-3 text-center text-sm text-text-secondary">
          {t.validation.readyToSaveHint}
        </div>
      )}

      {allGroupsCount === 0 && (
        <div className="flex flex-col items-center gap-4 pt-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface"><CheckCircle size={28} className="text-primary"/></div>
          <div>
            <p className="font-bold text-text-primary">{t.validation.allUpToDateTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{t.validation.allUpToDateHint}</p>
          </div>
        </div>
      )}
    </main>
  )
}
