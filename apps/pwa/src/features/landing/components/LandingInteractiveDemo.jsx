import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scan, Sparkles, CheckCircle2, FileText, Database } from 'lucide-react'

export default function LandingInteractiveDemo() {
  const [step, setStep] = useState(0) // 0: Idle, 1: Scanning, 2: Extracting, 3: Success

  useEffect(() => {
    if (step === 0) return
    
    let timer
    if (step === 1) timer = setTimeout(() => setStep(2), 2000)
    if (step === 2) timer = setTimeout(() => setStep(3), 2500)
    if (step === 3) timer = setTimeout(() => setStep(0), 4000)

    return () => clearTimeout(timer)
  }, [step])

  const steps = [
    {
      title: "Déposez votre facture",
      desc: "PDF ou simple photo de chantier",
      icon: <FileText className="text-slate-400" size={24} />
    },
    {
      title: "Scan en cours...",
      desc: "Analyse haute précision par Gemini 1.5 Pro",
      icon: <Scan className="text-sky-500 animate-pulse" size={24} />
    },
    {
      title: "Extraction des données",
      desc: "Détection des articles et des prix unitaires",
      icon: <Database className="text-amber-500 animate-bounce" size={24} />
    },
    {
      title: "Prêt pour export !",
      desc: "Données structurées et catalogue mis à jour",
      icon: <CheckCircle2 className="text-emerald-500" size={24} />
    }
  ]

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900/40 p-1 backdrop-blur-2xl shadow-2xl grainy group">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-950/80 p-8 sm:p-12">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Animated Main Icon */}
          <div className="mb-8 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                transition={{ type: "spring", damping: 15 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner"
              >
                {steps[step].icon}
              </motion.div>
            </AnimatePresence>
            
            {/* Sparkles effect for step 2/3 */}
            {step >= 2 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -right-4 -top-4 text-sky-400"
              >
                <Sparkles size={24} className="animate-pulse" />
              </motion.div>
            )}
          </div>

          {/* Text Content */}
          <div className="h-24">
            <h3 className="text-xl font-bold text-white tracking-tight">
              {steps[step].title}
            </h3>
            <p className="mt-2 text-slate-400 text-sm max-w-xs mx-auto">
              {steps[step].desc}
            </p>
          </div>

          {/* Action Button */}
          {step === 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(1)}
              className="mt-6 flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-xl transition-all hover:bg-sky-50"
            >
              Simuler un scan
              <Scan size={16} />
            </motion.button>
          )}

          {/* Progress Indicators */}
          <div className="mt-12 flex gap-3">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 w-12 rounded-full transition-all duration-500 ${
                  i === step ? 'bg-sky-500 w-20 shadow-[0_0_12px_rgba(14,165,233,0.5)]' : i < step ? 'bg-emerald-500/50' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Floating Code Snippet (Elite touch) */}
        {step === 3 && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute right-4 bottom-4 hidden lg:block"
          >
            <div className="rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-[10px] text-emerald-400/80 backdrop-blur-md">
              <p>{"{"}</p>
              <p className="ml-4">"vendor": "Brico Pro",</p>
              <p className="ml-4">"total": 1240.50,</p>
              <p className="ml-4">"items_count": 12</p>
              <p>{"}"}</p>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Visual Scan Line */}
      {step === 1 && (
        <motion.div 
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent blur-sm z-50 pointer-events-none"
        />
      )}
    </div>
  )
}
