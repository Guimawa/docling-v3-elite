import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, FileCheck, ScanLine } from 'lucide-react'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export default function HeroSection() {
  const { t } = usePublicI18n()
  const landingT = t.landing

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20" id="hero">
      <div className="relative z-10 mx-auto max-w-5xl px-5 text-center">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeUp} className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-xs font-semibold text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            IA Gemini 1.5 Pro pour le BTP
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Docling
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-8 mx-auto max-w-2xl text-lg text-slate-300 sm:text-xl leading-relaxed">
            {landingT.heroDescription}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link to="/scan?trial=1" className="premium-button group">
              Démarrer l'essai gratuit
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#fonctionnalites" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10">
              Voir les fonctionnalités
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-20 flex flex-wrap justify-center gap-8 text-sm text-slate-500">
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <ShieldCheck size={16} className="text-blue-500" />
              Sécurisé
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <ScanLine size={16} className="text-blue-500" />
              Scan HD
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <FileCheck size={16} className="text-blue-500" />
              Validation IA
            </span>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
    </section>
  )
}
