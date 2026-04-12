import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { useDoclingStore } from '@/store/useStore'
import PageTransition from '@/components/PageTransition'
import { interpolate, useAppI18n } from '@/shared/i18n/appI18n'

// Sections
import ValidationHeader from './sections/ValidationHeader'
import ValidationInvoiceList from './sections/ValidationInvoiceList'
import ValidationPanel from './sections/ValidationPanel'

function isNewProduct(p) { return p?.is_new !== false }

function buildGroups(products, tv) {
  const groups = new Map()
  products.forEach((p, sourceIndex) => {
    if (!isNewProduct(p)) return
    const numero = (p.numero_facture || '').trim()
    const fournisseur = (p.fournisseur || '').trim() || tv.groupUnknownSupplier
    const date = (p.date_facture || '').trim() || tv.groupDateUnknown
    const key = numero ? `num:${numero}` : `meta:${fournisseur}|${date}`
    const title = numero
      ? interpolate(tv.groupTitleNum, { num: numero })
      : interpolate(tv.groupTitleMeta, { supplier: fournisseur })
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title,
        subtitle: numero ? `${fournisseur} \u2013 ${date}` : date,
        items: [],
      })
    }
    groups.get(key).items.push({ p, sourceIndex })
  })
  return Array.from(groups.values())
}

export default function ValidationPage() {
  const t = useAppI18n()
  const navigate = useNavigate()
  const products = useDoclingStore(s => s.extractedProducts)
  const pendingSource = useDoclingStore(s => s.pendingSource ?? 'pc')
  const updateProduct = useDoclingStore(s => s.updateProduct)
  const clearJob = useDoclingStore(s => s.clearJob)
  const productsList = useMemo(() => products ?? [], [products])

  const [activeGroup, setActiveGroup] = useState(null)
  const [doneGroupKeys, setDoneGroupKeys] = useState(new Set())
  const [allValidated, setAllValidated] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const groupsRef = useRef([])
  const doneKeysRef = useRef(new Set())
  const allValidatedRef = useRef([])
  const groupCommittedKeysRef = useRef(new Set())

  const hiddenDuplicatesCount = productsList.filter(p => !isNewProduct(p)).length
  const groups = useMemo(() => buildGroups(productsList, t.validation), [productsList, t.validation])
  const pendingGroups = groups.filter(g => !doneGroupKeys.has(g.key))
  const totalNew = pendingGroups.reduce((acc,g) => acc + g.items.length, 0)

  useEffect(() => { groupsRef.current = groups }, [groups])
  useEffect(() => { doneKeysRef.current = doneGroupKeys }, [doneGroupKeys])
  useEffect(() => { allValidatedRef.current = allValidated }, [allValidated])

  const doSave = useCallback(async (produits) => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const source = pendingSource ?? (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'mobile':'pc')
      await apiClient.post(ENDPOINTS.batch, { produits, source })
      clearJob()
      if (navigator.vibrate) navigator.vibrate([100,50,100])
      toast.success(interpolate(t.validation.saveOk, { count: produits.length }))
      navigate('/catalogue', { replace: true })
    } catch {
      toast.error(t.validation.saveErr)
      setIsSaving(false)
    }
  }, [pendingSource, clearJob, navigate, t, isSaving])

  const commitValidatedGroup = useCallback((groupKey, batch) => {
    if (groupCommittedKeysRef.current.has(groupKey)) return
    groupCommittedKeysRef.current.add(groupKey)
    const nextAll = [...allValidatedRef.current, ...batch]
    allValidatedRef.current = nextAll
    setAllValidated(nextAll)
    const newDone = new Set(doneKeysRef.current)
    newDone.add(groupKey)
    doneKeysRef.current = newDone
    setDoneGroupKeys(newDone)
    const remaining = groupsRef.current.filter((g) => !newDone.has(g.key))
    if (remaining.length === 0 && nextAll.length > 0) doSave(nextAll)
    else {
      toast.success(interpolate(t.validation.toastValidatedBatch, { count: batch.length, tel: batch.length > 1 ? 's' : '' }))
    }
  }, [doSave, t.validation])

  const handleGroupDone = useCallback((validated) => {
    const key = activeGroup?.key
    if (!key) return
    setActiveGroup(null)
    commitValidatedGroup(key, validated)
  }, [activeGroup, commitValidatedGroup])

  if (productsList.length === 0) return <Navigate to="/scan" replace/>

  return (
    <PageTransition variant="slideUp">
      <div className="relative flex min-h-screen flex-col bg-transparent overflow-x-hidden">
        <div className="aurora-bg opacity-30" aria-hidden="true">
          <div /><div /><div />
        </div>

        <AnimatePresence>
          {activeGroup && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={()=>setActiveGroup(null)}/>
          )}
        </AnimatePresence>

        <ValidationHeader totalNew={totalNew} doneGroupKeysCount={doneGroupKeys.size} t={t} />

        {hiddenDuplicatesCount > 0 && (
          <div className="mx-auto w-full max-w-lg px-4 sm:px-5 pt-3">
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              {interpolate(t.validation.duplicatesBanner, { count: hiddenDuplicatesCount, del: hiddenDuplicatesCount > 1 ? 's' : '' })}
            </div>
          </div>
        )}

        <ValidationInvoiceList 
          pendingGroups={pendingGroups} 
          allGroupsCount={groups.length} 
          allValidatedCount={allValidated.length} 
          setActiveGroup={setActiveGroup} 
          t={t} 
        />

        <AnimatePresence>
          {allValidated.length > 0 && (
            <motion.div initial={{y:80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:80,opacity:0}} className="fixed bottom-20 left-0 right-0 z-30 mx-auto max-w-lg px-4 sm:px-5">
              <button type="button" onClick={()=>doSave(allValidated)} disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-black text-white shadow-lg hover:bg-cta-hover disabled:opacity-60">
                <CheckCircle2 size={18}/>
                {isSaving ? t.validation.saveInProgress : interpolate(t.validation.expressSaveButton, { count: allValidated.length, pel: allValidated.length > 1 ? 's' : '' })}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeGroup && <ValidationPanel key={activeGroup.key} group={activeGroup} onClose={()=>setActiveGroup(null)} onGroupDone={handleGroupDone} updateProduct={updateProduct}/>}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
