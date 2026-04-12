import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'
import ProductBubble from '../components/ProductBubble'
import { interpolate, useAppI18n } from '@/shared/i18n/appI18n'

export default function ValidationPanel({ group, onClose, onGroupDone, updateProduct }) {
  const t = useAppI18n()
  const items = group.items
  const total = items.length
  const [index, setIndex] = useState(0)
  const [direction, setDir] = useState(1)
  const [validated, setValidated] = useState([])
  const [skipped, setSkipped] = useState([])
  const busy = useRef(false)
  const isDone = index >= total
  const progress = Math.round((index / total) * 100)

  const advance = useCallback((dir=1) => {
    if (busy.current) return
    busy.current = true
    setDir(dir)
    setTimeout(() => { setIndex(i=>i+1); busy.current = false }, 20)
  }, [])

  const handleValidate = useCallback((p) => { setValidated(prev=>[...prev,p]); advance(1) }, [advance])
  const handleSkip = useCallback(() => { setSkipped(prev=>[...prev,items[index]]); advance(-1) }, [advance,items,index])

  return (
    <motion.aside initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', stiffness:320, damping:32 }} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-elevated shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-text-secondary">{t.validation.expressTitle}</p>
          <p className="mt-0.5 truncate text-sm font-bold text-text-primary max-w-[220px]">{group.title}</p>
          <p className="text-2xs text-text-secondary truncate">{group.subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.validation.closePanel} className="ml-3 shrink-0 rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"><X size={16}/></button>
      </div>

      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <div className="mb-1.5 flex justify-between">
          <span className="text-2xs text-text-secondary">{isDone?'Terminé':`${index} / ${total}`}</span>
          {skipped.length>0&&<span className="text-2xs text-text-secondary">{skipped.length} ignoré{skipped.length>1?'s':''}</span>}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-stone-200">
          <motion.div className="h-full rounded-full bg-primary" animate={{ width:`${progress}%` }} transition={{ duration:0.35, ease:[0.34,1.56,0.64,1] }}/>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overflowX:'hidden' }}>
        <AnimatePresence mode="wait" initial={false}>
          {!isDone ? (
            <ProductBubble key={index} product={items[index].p} sourceIndex={items[index].sourceIndex} current={index+1} total={total} direction={direction} onValidate={handleValidate} onSkip={handleSkip} updateProduct={updateProduct}/>
          ) : (
            <motion.div key="done" initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', stiffness:340, damping:28 }} className="flex flex-col items-center gap-4 pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><CheckCircle2 size={32} className="text-primary"/></div>
              <div>
                <p className="text-lg font-black text-text-primary">{t.validation.expressDoneTitle}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {interpolate(t.validation.expressDoneLine, {
                    validated: validated.length,
                    pel: validated.length > 1 ? 's' : '',
                    skipPart:
                      skipped.length > 0
                        ? interpolate(t.validation.expressDoneSkippedSuffix, {
                            sk: skipped.length,
                            skel: skipped.length > 1 ? 's' : '',
                          })
                        : '',
                  })}
                </p>
              </div>
              {validated.length>0&&(
                <div className="w-full rounded-xl border border-border bg-stone-50 p-3 space-y-1.5 text-left">
                  {validated.map((p,i)=>(
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-text-primary">{p.designation_fr||'—'}</span>
                      <span className="shrink-0 text-xs font-black text-primary">{p.prix_remise_ht ? `${parseFloat(p.prix_remise_ht).toFixed(2)} €` : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={()=>onGroupDone(validated)} disabled={validated.length===0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-white hover:bg-cta-hover disabled:opacity-50">
                <CheckCircle2 size={16}/>
                {interpolate(t.validation.expressSaveButton, {
                  count: validated.length,
                  pel: validated.length > 1 ? 's' : '',
                })}
              </button>
              {validated.length === 0 && (
                <button type="button" onClick={onClose} className="text-sm text-text-secondary underline underline-offset-2">
                  {t.validation.closeWithoutSave}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
