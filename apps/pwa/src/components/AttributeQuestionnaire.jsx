// components/AttributeQuestionnaire.jsx
/**
 * Questionnaire IA post-validation produit.
 *
 * Logique :
 *  1. Appelle GET /api/v1/catalogue/attributes?designation=...&famille=...
 *  2. Affiche les attributs TROUVÉS → chips cliquables pour corriger (choix cohérents)
 *  3. Pose les questions MANQUANTES une par une avec chips de réponse
 *  4. onComplete({ ...found, ...answers }) → stocké en JSONB
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'

const LABEL = {
  sous_famille:    'Matière',
  type_produit:    'Type',
  variante:        'Variante',
  dimension:       'Dimension',
  longueur:        'Longueur',
  conditionnement: 'Conditionnement',
}

// ─── Bulle IA ──────────────────────────────────────────────────────────────────
function IaBubble({ children }) {
  return (
    <motion.div className="flex items-end gap-2"
      initial={{ opacity:0, x:-12, scale:0.96 }}
      animate={{ opacity:1, x:0, scale:1 }}
      transition={{ type:'spring', stiffness:340, damping:28 }}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles size={12} className="text-primary" />
      </div>
      <div className="max-w-[230px] rounded-2xl rounded-bl-sm border border-border bg-elevated px-3 py-2 text-sm text-text-primary leading-snug">
        {children}
      </div>
    </motion.div>
  )
}

// ─── Bulle utilisateur ─────────────────────────────────────────────────────────
function UserBubble({ children }) {
  return (
    <motion.div className="flex justify-end"
      initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.2 }}>
      <div className="rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm font-medium text-white">
        {children}
      </div>
    </motion.div>
  )
}

// ─── Typing ────────────────────────────────────────────────────────────────────
function Typing() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles size={12} className="text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-elevated px-3 py-2.5">
        {[0,1,2].map(i => (
          <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-text-secondary"
            animate={{ y:[0,-4,0] }} transition={{ repeat:Infinity, duration:1, delay:i*0.2 }} />
        ))}
      </div>
    </div>
  )
}

// ─── Options chips ─────────────────────────────────────────────────────────────
function OptionChips({ options, selected, onSelect }) {
  return (
    <motion.div className="flex flex-wrap gap-2 pl-9"
      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.22 }}>
      {options.map(opt => (
        <button type="button" key={opt} onClick={() => !selected && onSelect(opt)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
            selected === opt
              ? 'border-warning/60 bg-warning-bg text-warning'
              : selected
              ? 'border-border bg-stone-50 text-text-secondary opacity-40 cursor-default'
              : 'border-border bg-elevated text-text-primary hover:border-warning/40 hover:bg-warning-bg/40 hover:scale-[1.02]'
          }`}
        >{opt}</button>
      ))}
      {!selected && (
        <button type="button" onClick={() => onSelect('__skip__')}
          className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary">
          Passer →
        </button>
      )}
    </motion.div>
  )
}

// ─── Attribut trouvé modifiable ────────────────────────────────────────────────
function FoundAttrChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(value)

  const choose = (opt) => {
    setCurrent(opt)
    onChange(opt)
    setOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
        <span className="text-xs text-text-secondary">{label}</span>
        <button type="button" onClick={() => setOpen(o => !o)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
            open
              ? 'border-warning/60 bg-warning-bg text-warning'
              : 'border-primary/25 bg-primary-pale text-primary hover:border-primary/45'
          }`}>
          {current}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            transition={{ duration:0.2 }}
            className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 pb-2 pt-1.5">
              {options.map(opt => (
                <button type="button" key={opt} onClick={() => choose(opt)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                    opt === current
                      ? 'border-warning/60 bg-warning-bg text-warning font-medium'
                      : 'border-border text-text-secondary hover:border-warning/40 hover:text-text-primary'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Options cohérentes par type d'attribut (fallback si LLM ne les fournit pas)
const CORRECTION_OPTIONS = {
  sous_famille:    ['Cuivre','PER','PVC','Acier','Inox','Multicouche','Fonte','Laiton'],
  type_produit:    ['Tube','Raccord','Coude','Manchon','Té','Barre','Sac','Bidon','Rouleau'],
  variante:        ['90°','45°','Égal','Réduit','M/F','F/F','M/M'],
  dimension:       ['12mm','14mm','16mm','20mm','22mm','28mm','32mm','40mm','50mm','100mm'],
  longueur:        ['0,5m','1m','2m','3m','5m','6m','25m','50m'],
  conditionnement: ['Unitaire','Lot 2','Lot 5','Lot 10','Sac 5kg','Sac 25kg','Bidon 5L','Bidon 20L'],
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function AttributeQuestionnaire({ designation, famille, fournisseur, onComplete, onSkip }) {
  const [loading,   setLoading]   = useState(true)
  const [found,     setFound]     = useState({})       // attributs détectés par le LLM
  const [questions, setQuestions] = useState([])       // questions manquantes contextuelles
  const [corrected, setCorrected] = useState({})       // corrections sur attributs trouvés
  const [answers,   setAnswers]   = useState({})       // réponses aux questions
  const [qIndex,    setQIndex]    = useState(0)        // question courante
  const [typing,    setTyping]    = useState(false)
  const [chatLog,   setChatLog]   = useState([])       // historique affiché

  // Appel API extraction attributs
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await apiClient.get('/api/v1/catalogue/attributes', {
          params: { designation, famille, fournisseur }
        })
        if (cancelled) return
        setFound(data.found || {})
        setQuestions(data.questions || [])
        // Première question dans le chat
        if ((data.questions || []).length > 0) {
          setChatLog([{ type: 'ia', text: data.questions[0].question, key: data.questions[0].key, options: data.questions[0].options }])
        }
      } catch {
        toast.error('Impossible de charger les attributs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [designation, famille, fournisseur])

  const correctFound = useCallback((key, val) => {
    setCorrected(prev => ({ ...prev, [key]: val }))
  }, [])

  const answerQuestion = useCallback((val) => {
    const q = questions[qIndex]
    if (!q) return

    // Ajoute la réponse dans le chat
    const userAnswer = val === '__skip__' ? '—' : val
    setChatLog(prev => [...prev, { type: 'user', text: userAnswer }])

    const newAnswers = val === '__skip__' ? answers : { ...answers, [q.key]: val }
    setAnswers(newAnswers)

    const nextIdx = qIndex + 1

    if (nextIdx < questions.length) {
      // Question suivante avec typing indicator
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        const nextQ = questions[nextIdx]
        setChatLog(prev => [...prev, { type: 'ia', text: nextQ.question, key: nextQ.key, options: nextQ.options }])
        setQIndex(nextIdx)
      }, 800)
    } else {
      // Terminé
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setChatLog(prev => [...prev, { type: 'done' }])
        setQIndex(nextIdx)
      }, 600)
    }
  }, [qIndex, questions, answers])

  const handleComplete = useCallback(() => {
    const allAttrs = { ...found, ...corrected, ...answers }
    onComplete(allAttrs)
  }, [found, corrected, answers, onComplete])

  const isDone = qIndex >= questions.length && !loading

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <Typing />
      </div>
    )
  }

  const hasFoundAttrs = Object.keys(found).length > 0
  const hasQuestions  = questions.length > 0

  // Si rien à faire (tout trouvé, aucune question)
  if (!hasFoundAttrs && !hasQuestions) {
    return (
      <div className="rounded-xl border border-border bg-stone-50 px-3 py-2.5 text-xs text-text-secondary">
        Aucun attribut supplémentaire à renseigner pour ce produit.
        <button type="button" onClick={onSkip} className="ml-2 underline">Continuer</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Attributs trouvés automatiquement */}
      {hasFoundAttrs && (
        <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <p className="mb-2 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-primary">
            <Sparkles size={10} className="text-primary" />
            IA a détecté — cliquer pour corriger
          </p>
          <div className="space-y-0">
            {Object.entries(found).map(([key, val]) => (
              <FoundAttrChip
                key={key}
                label={LABEL[key] || key}
                value={corrected[key] ?? val}
                options={CORRECTION_OPTIONS[key] || [val]}
                onChange={(v) => correctFound(key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Questions manquantes — style chat */}
      {hasQuestions && (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence mode="sync">
            {chatLog.map((entry, i) => {
              if (entry.type === 'ia') {
                const isCurrentQ = i === chatLog.length - 1 && qIndex < questions.length
                return (
                  <div key={i} className="flex flex-col gap-2">
                    <IaBubble>{entry.text}</IaBubble>
                    {isCurrentQ && (
                      <OptionChips
                        options={entry.options}
                        selected={answers[entry.key] ?? (chatLog.find((e,j) => j>i && e.type==='user') ? chatLog.find((e,j) => j>i && e.type==='user').text : null)}
                        onSelect={answerQuestion}
                      />
                    )}
                  </div>
                )
              }
              if (entry.type === 'user') return <UserBubble key={i}>{entry.text}</UserBubble>
              if (entry.type === 'done') return (
                <IaBubble key={i}>
                  <span className="font-medium text-primary">Parfait, tout est renseigné ✓</span>
                </IaBubble>
              )
              return null
            })}
            {typing && <Typing key="typing" />}
          </AnimatePresence>
        </div>
      )}

      {/* Bouton terminer */}
      {isDone && (
        <motion.button
          type="button"
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          onClick={handleComplete}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white hover:bg-cta-hover">
          <CheckCircle2 size={16} />
          Enregistrer dans le catalogue
        </motion.button>
      )}

      {/* Skip global */}
      <button type="button" onClick={onSkip} className="text-center text-xs text-text-secondary underline underline-offset-2">
        Passer cette étape
      </button>
    </div>
  )
}
