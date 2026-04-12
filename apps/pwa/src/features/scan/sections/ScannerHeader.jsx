import React from 'react'
import { Camera } from 'lucide-react'

export default function ScannerHeader({ t }) {
  return (
    <header className="relative z-10 px-4 pb-2 pt-5 sm:px-5">
      <div className="mx-auto max-w-4xl rounded-2xl border border-primary/10 bg-elevated/85 px-4 py-3.5 shadow-md shadow-black/[0.04] backdrop-blur-xl ring-1 ring-text-primary/[0.04]">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-beige shadow-inner ring-1 ring-primary/10"
            aria-hidden
          >
            <Camera size={22} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-pale/60 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_3px_rgba(5,150,105,0.2)]" />
              {t.scan.badge}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              {t.scan.title}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">{t.scan.subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
