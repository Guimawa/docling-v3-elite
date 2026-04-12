import React from 'react'
import { ChevronDown } from 'lucide-react'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

function SectionHeading({ subtitle, title, centered = false }) {
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-500">{subtitle}</p>
      <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl tracking-tight">{title}</h2>
    </div>
  )
}

export default function FAQSection() {
  const { t } = usePublicI18n()
  const landingT = t.landing
  return (
    <section className="py-24 sm:py-32" id="faq">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHeading subtitle="FAQ" title={landingT.faqTitle} centered />
        <div className="mt-12 space-y-4">
          {landingT.faqCategories.flatMap(c => c.items).map((item, i) => (
            <details key={i} className="group rounded-3xl border border-white/5 bg-white/5 transition-all open:bg-white/[0.08]">
              <summary className="flex cursor-pointer items-center justify-between px-8 py-6 text-sm font-semibold text-white outline-none select-none">
                {item.q}
                <ChevronDown size={18} className="text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-8 pb-8 text-sm text-slate-400 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
