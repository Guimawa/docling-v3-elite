import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Package, ExternalLink, RotateCcw, Smartphone, Monitor, Folder } from 'lucide-react'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import Button from '@/components/Button'

const SOURCE_CONFIG = {
  mobile:   { icon: <Smartphone size={12} />, label: 'Mobile',   color: 'text-info',   bg: 'bg-info-bg' },
  pc:       { icon: <Monitor    size={12} />, label: 'PC',        color: 'text-text-secondary',   bg: 'bg-gray-500/10' },
  watchdog: { icon: <Folder     size={12} />, label: 'Dossier',   color: 'text-primary',  bg: 'bg-primary-pale' },
}

function formatDate(iso) {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function HistoryList({ 
  history, loadingPdf, handleViewPdf, handleRescan, retrying, t 
}) {
  return (
    <AnimatePresence>
      <div className="space-y-2">
        {history.map((f, i) => {
          const src = SOURCE_CONFIG[f.source] || SOURCE_CONFIG.pc
          const isOk = f.statut === 'traite'
          const isRetrying = retrying === f.id

          return (
            <Card
              key={f.id}
              as={motion.div}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="border border-border bg-elevated p-4 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isOk
                    ? <CheckCircle2 size={16} className="text-primary shrink-0" />
                    : <AlertCircle  size={16} className="text-red-500 shrink-0" />
                  }
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {f.filename || t.history.unknownFile}
                  </p>
                </div>
                <Badge
                  variant={f.source === 'mobile' ? 'info' : f.source === 'watchdog' ? 'success' : 'neutral'}
                  size="sm"
                  className="shrink-0"
                >
                  {src.icon}
                  {src.label}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                {isOk && (
                  <Badge variant="success" size="sm">
                    <Package size={11} />
                    {f.nb_produits_extraits} produit{f.nb_produits_extraits > 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-xs text-text-secondary">{f.modele_ia}</span>
                {parseFloat(f.cout_api_usd) > 0 && (
                  <Badge variant="warning" size="sm">
                    ${parseFloat(f.cout_api_usd).toFixed(4)}
                  </Badge>
                )}
                <span className="text-xs text-text-secondary ml-auto">{formatDate(f.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border">
                {f.pdf_url && (
                  <Button
                    onClick={() => handleViewPdf(f)}
                    disabled={loadingPdf === f.id}
                    isLoading={loadingPdf === f.id}
                    variant="ghost"
                    className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-xs text-text-primary transition-colors hover:border-primary/30 hover:bg-primary-pale/50 focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {!loadingPdf && <ExternalLink size={12} />}
                    {t.history.viewPdf}
                  </Button>
                )}
                {!isOk && f.pdf_url && (
                  <Button
                    onClick={() => handleRescan(f)}
                    disabled={isRetrying}
                    isLoading={isRetrying}
                    variant="ghost"
                    className="rounded-xl border border-warning/40 bg-warning-bg px-3 py-1.5 text-xs text-warning transition-colors hover:bg-warning-bg/80 focus-visible:ring-2 focus-visible:ring-warning/40"
                  >
                    {!isRetrying && <RotateCcw size={12} />}
                    {t.history.rescan}
                  </Button>
                )}
                {!f.pdf_url && (
                  <span className="text-2xs text-text-secondary italic">{t.history.noCloud}</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </AnimatePresence>
  )
}
