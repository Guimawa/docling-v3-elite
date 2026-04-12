import React from 'react'
import { LifeBuoy, Mail, MessageSquare, ExternalLink } from 'lucide-react'
import Card from '@/components/Card'

export default function SupportSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header><h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><LifeBuoy size={20} className="text-primary" /> Centre de Support</h2></header>
      <div className="grid grid-cols-3 gap-3">
         <SupportCard icon={Mail} label="SAV" />
         <SupportCard icon={MessageSquare} label="Feedback" />
         <SupportCard icon={ExternalLink} label="Doc" />
      </div>
      <Card className="premium-card !p-0 overflow-hidden divide-y divide-white/5">
          <InfoLine label="Version logicielle" val="v4.2.1-elite" />
          <InfoLine label="Région Cloud" val="EU-Paris-1 (AWS/GCP)" />
          <InfoLine label="Disponibilité" val="99.98% SLA" />
      </Card>
    </div>
  )
}

function InfoLine({ label, val }) {
  return (
    <div className="flex justify-between items-center px-6 py-4">
       <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{label}</span>
       <span className="text-sm font-black text-text-primary">{val}</span>
    </div>
  )
}

function SupportCard({ icon: Icon, label }) {
  return (
    <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border border-white/5 bg-white/2 hover:bg-white/10 transition-all">
       <div className="text-primary"><Icon size={24} /></div>
       <span className="text-xs font-bold text-text-primary">{label}</span>
    </button>
  )
}
