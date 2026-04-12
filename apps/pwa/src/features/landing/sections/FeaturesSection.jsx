import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Eye, Layers, FileOutput } from 'lucide-react'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

function SectionHeading({ subtitle, title, centered = false }) {
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-500">{subtitle}</p>
      <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl tracking-tight">{title}</h2>
    </div>
  )
}

export default function FeaturesSection() {
  const { t } = usePublicI18n()
  const landingT = t.landing
  const icons = [<Zap size={24} />, <Eye size={24} />, <Layers size={24} />, <FileOutput size={24} />]
  
  return (
    <section className="py-24 sm:py-32" id="fonctionnalites">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading subtitle="Innovation" title={landingT.featuresTitle} />

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {landingT.features.map((feat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/5 p-10 transition-all hover:bg-white/[0.08]"
            >
              <div className="absolute -left-12 -top-12 h-32 w-32 bg-blue-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                {icons[i]}
              </div>
              <h3 className="text-xl font-bold text-white">{feat.title}</h3>
              <p className="mt-4 text-slate-400 leading-relaxed text-sm">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
