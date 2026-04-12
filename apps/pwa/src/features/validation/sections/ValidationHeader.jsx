import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { interpolate } from '@/shared/i18n/appI18n'

export default function ValidationHeader({ totalNew, doneGroupKeysCount, t }) {
  return (
    <header className="relative z-10 shrink-0 px-4 pb-2 pt-5 sm:px-5">
      <div className="mx-auto max-w-lg rounded-2xl border border-primary/10 bg-elevated/85 px-4 py-3.5 shadow-md backdrop-blur-xl ring-1 ring-text-primary/[0.04]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-beige shadow-inner ring-1 ring-primary/10" aria-hidden>
            <ShieldCheck size={22} className="text-primary"/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-pale/60 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
              {t.validation.quality}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
              {t.validation.title}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {totalNew > 0
                ? interpolate(t.validation.headerNewProducts, {
                    count: totalNew,
                    nel: totalNew > 1 ? 'x' : '',
                    pel: totalNew > 1 ? 's' : '',
                  })
                : doneGroupKeysCount > 0
                  ? t.validation.headerAllValidated
                  : t.validation.headerNoNewProducts}
            </p>
          </div>
          {totalNew > 0 && (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-warning px-1.5 text-xs font-black text-white">
              {totalNew}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
