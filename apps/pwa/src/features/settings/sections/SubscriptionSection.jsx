import React from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import Card from '@/components/Card'
import Badge from '@/components/Badge'

export default function SubscriptionSection({ meData, handleOpenBillingPortal, portalLoading, PRICING_PLANS }) {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <CreditCard size={20} className="text-primary" /> État du Service
         </h2>
         <Badge variant={meData?.subscription_status ? 'success' : 'warning'}>
           {meData?.subscription_status ? 'Membre Actif' : 'Essai Gratuit'}
         </Badge>
      </header>

      {/* Current Usage Card */}
      <Card className="premium-card !p-8 border-primary/10 bg-surface">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div>
            <p className="text-2xs font-black uppercase tracking-[0.2em] text-text-tertiary mb-1">Votre Engagement</p>
            <h3 className="text-2xl font-black text-text-primary">Plan {meData?.subscription_status ? meData?.subscription_status.toUpperCase() : 'FREE'}</h3>
          </div>
          <button 
            onClick={handleOpenBillingPortal}
            disabled={portalLoading}
            className="px-6 py-2.5 rounded-2xl bg-elevated border border-border text-sm font-bold text-text-primary hover:bg-surface transition-all flex items-center gap-2 shadow-sm"
          >
            {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
            Gérer sur Stripe
          </button>
        </div>

        <div className="space-y-3">
           <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-text-secondary">Utilisation Mensuelle</span>
              <span className="text-sm font-black text-text-primary">428 / 1000 <span className="text-text-tertiary font-normal">Docs</span></span>
           </div>
           <div className="h-2 rounded-full bg-border/20 overflow-hidden ring-1 ring-border shadow-inner">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: '42.8%' }} 
                className="h-full bg-gradient-to-r from-primary to-primary-light shadow-[0_0_12px_rgba(var(--c-primary),0.3)]"
              />
           </div>
        </div>
      </Card>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRICING_PLANS.map((plan) => (
          <Card key={plan.id} className={`!p-5 border transition-all hover:scale-[1.02] ${plan.popular ? 'border-primary/30 ring-1 ring-primary/20 bg-primary/5' : 'border-border bg-elevated'}`}>
             {plan.popular && <div className="mb-3"><Badge variant="primary" size="sm">Populaire</Badge></div>}
             <h4 className="text-sm font-black text-text-primary">{plan.name}</h4>
             <div className="flex items-baseline gap-1 my-3">
                <span className="text-2xl font-black text-text-primary">{plan.price}€</span>
                <span className="text-xs text-text-tertiary">/mois</span>
             </div>
             <p className="text-xs text-text-secondary mb-4 leading-relaxed">{plan.desc}</p>
             <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary">
                    <CheckCircle2 size={12} className="text-primary/60" /> {f}
                  </li>
                ))}
             </ul>
             <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${plan.popular ? 'bg-primary text-white shadow-lg' : 'bg-surface text-text-secondary hover:bg-border/30 hover:text-text-primary'}`}>
                Mettre à jour
             </button>
          </Card>
        ))}
      </div>
    </div>
  )
}
