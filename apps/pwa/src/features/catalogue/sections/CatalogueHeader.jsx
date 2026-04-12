import React from 'react'
import { PackageSearch, FileSpreadsheet, Download } from 'lucide-react'
import Button from '@/components/Button'

export default function CatalogueHeader({ products, exportExcel, exportCSV, setCompareOpen, compareTriggerRef, t }) {
  return (
    <header className="relative z-10 shrink-0 px-4 pb-2 pt-5 sm:px-5">
      <div className="page mx-auto max-w-[580px] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-beige shadow-inner ring-1 ring-primary/10" aria-hidden>
              <PackageSearch size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-semibold text-text-primary">{t.catalogue.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <Button
              onClick={() => exportExcel(products, t)}
              disabled={products.length === 0}
              variant="ghost"
              className="rounded-xl border border-primary/30 bg-primary-pale px-2 py-1.5 text-xs font-bold text-primary"
            >
              <FileSpreadsheet size={11} /> Excel
            </Button>
            <Button
              onClick={() => exportCSV(products, t)}
              disabled={products.length === 0}
              variant="ghost"
              className="rounded-xl border border-border bg-elevated px-2 py-1.5 text-xs font-bold text-text-primary"
            >
              <Download size={11} /> CSV
            </Button>
            <Button
              ref={compareTriggerRef}
              onClick={() => setCompareOpen(true)}
              variant="ghost"
              className="rounded-xl border border-border bg-elevated px-2 py-1.5 text-xs font-bold text-text-primary"
            >
              {t.catalogue.compare}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
