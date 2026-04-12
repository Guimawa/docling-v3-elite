import React, { useState, useId } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Pencil, X } from 'lucide-react'
import Badge from '@/components/Badge'
import Select from '@/components/Select'
import { FAMILLES } from '@/constants/categories'
import { interpolate, useAppI18n } from '@/shared/i18n/appI18n'

const TVA_RATE = parseFloat(import.meta.env.VITE_TVA_RATE || '0.21')
const EDIT_INPUT_FOCUS = 'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-elevated'

function fmt(val) {
  const n = parseFloat(val)
  return Number.isNaN(n) || n === 0 ? '—' : `${n.toFixed(2)} €`
}
function fmtRemisePct(val) {
  const n = parseFloat(val)
  if (Number.isNaN(n) || n === 0) return '—'
  return n % 1 === 0 ? `${n.toFixed(0)} %` : `${n.toFixed(1)} %`
}

export default function ProductBubble({ product, sourceIndex, current, total, direction, onValidate, onSkip, updateProduct }) {
  const t = useAppI18n()
  const editFieldId = useId()
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState({
    designation_fr: product.designation_fr || '',
    fournisseur: product.fournisseur || '',
    famille: product.famille || '',
    prix_brut_ht: product.prix_brut_ht ?? '',
    remise_pct: product.remise_pct ?? '',
    prix_remise_ht: product.prix_remise_ht ?? '',
    prix_ttc_remise: product.prix_ttc_remise ?? product.prix_ttc_iva21 ?? '',
    prix_ttc_non_remise: product.prix_ttc_non_remise ?? '',
    unite: product.unite || '',
  })

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))
  const isSuspect = !draft.prix_remise_ht || parseFloat(draft.prix_remise_ht) === 0 || !draft.unite?.trim() || !draft.designation_fr?.trim()
  const netHt = parseFloat(product.prix_remise_ht) || 0
  const brutHt = parseFloat(product.prix_brut_ht) || 0
  const ttcRemiseRaw = parseFloat(product.prix_ttc_remise)
  const ttcNonRaw = parseFloat(product.prix_ttc_non_remise)
  const ttcLegacy = parseFloat(product.prix_ttc_iva21)
  
  const displayTtcRemise = (!Number.isNaN(ttcRemiseRaw) && ttcRemiseRaw > 0) ? ttcRemiseRaw : (!Number.isNaN(ttcLegacy) && ttcLegacy > 0 ? ttcLegacy : netHt * (1 + TVA_RATE))
  const displayTtcNonRemise = (!Number.isNaN(ttcNonRaw) && ttcNonRaw > 0) ? ttcNonRaw : (brutHt > 0 ? brutHt * (1 + TVA_RATE) : null)
  const numericDraftKeys = new Set(['prix_brut_ht', 'remise_pct', 'prix_remise_ht', 'prix_ttc_remise', 'prix_ttc_non_remise'])

  const handleConfirm = () => {
    if (editMode) {
      Object.entries(draft).forEach(([k, v]) => {
        const out = numericDraftKeys.has(k) ? (parseFloat(v) || 0) : v
        updateProduct(sourceIndex, k, out)
      })
    }
    const m = editMode ? { ...product, ...draft } : { ...product }
    const gn = (k, def = 0) => {
      const v = parseFloat(m[k])
      return Number.isNaN(v) ? def : v
    }
    const netHtVal = gn('prix_remise_ht', 0)
    const brutHtVal = gn('prix_brut_ht', 0)
    let prixTtcRemise = gn('prix_ttc_remise', 0) || gn('prix_ttc_iva21', 0)
    if (prixTtcRemise <= 0) prixTtcRemise = netHtVal * (1 + TVA_RATE)
    let prixTtcNonRemise = gn('prix_ttc_non_remise', 0)
    if (prixTtcNonRemise <= 0 && brutHtVal > 0) prixTtcNonRemise = brutHtVal * (1 + TVA_RATE)

    onValidate({
      ...m,
      prix_brut_ht: brutHtVal,
      remise_pct: gn('remise_pct', 0),
      prix_remise_ht: netHtVal,
      prix_ttc_remise: prixTtcRemise,
      prix_ttc_iva21: prixTtcRemise,
      prix_ttc_non_remise: prixTtcNonRemise,
    })
  }

  const enterVariant = direction === 1 ? { x: 60, opacity: 0, scale: 0.97 } : { x: -60, opacity: 0, scale: 0.97 }
  const exitVariant  = direction === 1 ? { x: -60, opacity: 0, scale: 0.97, transition: { duration: 0.2 } } : { x: 60, opacity: 0, scale: 0.97, transition: { duration: 0.2 } }

  return (
    <motion.div key={`p-${sourceIndex}`} initial={enterVariant} animate={{ x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 340, damping: 28 } }} exit={exitVariant} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-text-secondary">
          {interpolate(t.validation.productProgress, { current, total })}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {product.confidence === 'low' && <Badge variant="warning" size="sm">{t.validation.confidenceLow}</Badge>}
          {product.confidence === 'high' && <Badge variant="success" size="sm">{t.validation.confidenceHigh}</Badge>}
          {isSuspect && <span className="flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning"><AlertCircle size={10} aria-hidden />{t.validation.verifyRecommended}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-elevated p-4 shadow-sm space-y-3">
        {!editMode ? (
          <>
            <div>
              <p className="text-base font-black leading-snug text-text-primary">{product.designation_fr || '—'}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{product.fournisseur}</p>
              {product.famille && <span className="mt-1.5 inline-block rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-bold text-text-secondary">{product.famille}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: t.validation.gross, value: brutHt > 0 ? fmt(brutHt) : '—' },
                { label: t.validation.discount, value: fmtRemisePct(product.remise_pct) },
                { label: t.validation.net, value: fmt(product.prix_remise_ht), hl: true },
                { label: t.validation.ttcRemise, value: displayTtcRemise > 0 ? fmt(displayTtcRemise) : '—' },
                { label: t.validation.ttcNonRemise, value: displayTtcNonRemise > 0 ? fmt(displayTtcNonRemise) : '—' },
              ].map(({ label, value, hl }) => (
                <div key={label} className={`rounded-xl px-2.5 py-2 ${hl ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-surface'}`}>
                  <p className={`text-sm font-bold uppercase tracking-wider ${hl ? 'text-primary/70' : 'text-text-secondary'}`}>{label}</p>
                  <p className={`mt-0.5 text-sm font-black ${hl ? 'text-primary' : 'text-text-primary'}`}>{value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <div>
              <label htmlFor={`${editFieldId}-designation`} className="text-sm font-bold uppercase tracking-wider text-text-secondary">{t.validation.designation}</label>
              <input id={`${editFieldId}-designation`} value={draft.designation_fr} onChange={(e) => set('designation_fr', e.target.value)} className={`mt-0.5 w-full rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-bold text-text-primary ${EDIT_INPUT_FOCUS}`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${editFieldId}-supplier`} className="text-sm font-bold uppercase tracking-wider text-text-secondary">{t.validation.supplier}</label>
                <input id={`${editFieldId}-supplier`} value={draft.fournisseur} onChange={(e) => set('fournisseur', e.target.value)} className={`mt-0.5 w-full rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-text-primary ${EDIT_INPUT_FOCUS}`} />
              </div>
              <div>
                <Select id={`${editFieldId}-famille`} label={t.validation.family} value={draft.famille} onChange={(e) => set('famille', e.target.value)} options={FAMILLES.map((f) => ({ value: f, label: f }))} placeholder={t.validation.chooseFamily} className="mt-0.5 text-sm w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[{key:'prix_brut_ht',label:t.validation.gross,icon:'€'},{key:'remise_pct',label:t.validation.discount,icon:'%'},{key:'prix_remise_ht',label:t.validation.priceHt,icon:'€',hl:true},{key:'unite',label:t.validation.unit,text:true}].map(({key,label,icon,hl,text})=>(
                <div key={key}>
                  <label htmlFor={`${editFieldId}-${key}`} className={`text-sm font-bold uppercase tracking-wider ${hl?'text-primary':'text-text-secondary'}`}>{label}</label>
                  <div className="relative mt-0.5">
                    <input id={`${editFieldId}-${key}`} type={text?'text':'number'} step="0.01" value={draft[key]} onChange={(e)=>set(key,e.target.value)} className={`w-full rounded-lg border bg-input px-2 py-1.5 text-sm font-bold ${EDIT_INPUT_FOCUS} ${icon?'pr-4':''} ${hl?'border-primary/40 text-primary':'border-border text-text-primary'}`} />
                    {icon&&<span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-2xs text-text-secondary" aria-hidden="true">{icon}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[{key:'prix_ttc_remise',label:t.validation.ttcRemise,icon:'€'},{key:'prix_ttc_non_remise',label:t.validation.ttcNonRemise,icon:'€'}].map(({key,label,icon})=>(
                <div key={key}>
                  <label htmlFor={`${editFieldId}-${key}`} className="text-sm font-bold uppercase tracking-wider text-text-secondary">{label}</label>
                  <div className="relative mt-0.5">
                    <input id={`${editFieldId}-${key}`} type="number" step="0.01" value={draft[key]} onChange={(e)=>set(key,e.target.value)} className={`w-full rounded-lg border border-border bg-input px-2 py-1.5 pr-4 text-sm font-bold text-text-primary ${EDIT_INPUT_FOCUS}`} />
                    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-2xs text-text-secondary" aria-hidden="true">{icon}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!editMode?(
          <>
            <button type="button" onClick={handleConfirm} aria-label="Valider" className="flex flex-1 items-center justify-center rounded-xl bg-primary py-3 text-white transition-colors hover:bg-cta-hover active:scale-[0.97]"><CheckCircle2 size={20}/></button>
            <button type="button" onClick={()=>setEditMode(true)} className="flex items-center gap-1.5 rounded-xl border border-border bg-elevated px-4 py-3 text-sm font-bold text-text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"><Pencil size={13}/>Modifier</button>
            <button type="button" onClick={onSkip} aria-label="Ignorer" className="rounded-xl border border-border bg-elevated p-3 text-text-secondary transition-colors hover:border-error/30 hover:text-error"><X size={16}/></button>
          </>
        ):(
          <>
            <button type="button" onClick={handleConfirm} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white hover:bg-cta-hover"><CheckCircle2 size={16}/>Valider</button>
            <button type="button" onClick={()=>setEditMode(false)} className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm font-bold text-text-secondary">Annuler</button>
          </>
        )}
      </div>
    </motion.div>
  )
}
