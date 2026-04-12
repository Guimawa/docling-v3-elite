import React from 'react'
import { motion } from 'framer-motion'
import Card from '@/components/Card'

export default function HistoryStats({ history, totalProduits, totalCout, t }) {
  if (history.length === 0) return null

  return (
    <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
      <StatCard label={t.history.stats.invoices}  value={history.length}          color="text-text-secondary" />
      <StatCard label={t.history.stats.products}  value={totalProduits}           color="text-primary" />
      <StatCard label={t.history.stats.apiCost}  value={`$${totalCout.toFixed(3)}`} color="text-amber-400" />
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <Card
      as={motion.div}
      className="rounded-xl border border-border bg-elevated p-3 text-center shadow-xs transition-shadow duration-200 hover:shadow-sm"
    >
      <div className={`text-lg font-black ${color}`}>{value}</div>
      <div className="text-2xs text-text-tertiary uppercase tracking-wider mt-0.5">{label}</div>
    </Card>
  )
}
