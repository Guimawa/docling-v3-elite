import React from 'react'
import { motion } from 'framer-motion'
import { Cloud, ShieldCheck } from 'lucide-react'
import Card from '@/components/Card'
import BrandLogo from '../components/BrandLogo'

export default function CloudSection({ cloudConfig, setCloudProvider }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <header><h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Cloud size={20} className="text-primary" /> Archives & Synchronisation</h2></header>
       
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'docling-cloud', label: 'Docling Cloud', icon: ShieldCheck, color: 'text-primary' },
            { id: 'google',        label: 'Google Drive',   logo: 'google' },
            { id: 'onedrive',      label: 'OneDrive',      logo: 'microsoft' },
          ].map((p) => {
            const isSelected = cloudConfig.provider === p.id
            return (
              <button
                key={p.id}
                onClick={() => setCloudProvider(p.id)}
                className={`group relative p-6 rounded-[2.5rem] border transition-all text-center flex flex-col items-center ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xl' : 'border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/5'}`}
              >
                 <div className={`h-14 w-14 flex items-center justify-center rounded-2xl mb-4 transition-transform duration-500 group-hover:scale-110 ${isSelected ? 'bg-primary/10' : 'bg-white/5'}`}>
                    {p.id === 'docling-cloud' ? <ShieldCheck size={28} className="text-primary" /> : <BrandLogo name={p.logo} size={isSelected ? 32 : 28} opacity={isSelected ? 1 : 0.6} />}
                 </div>
                 <div className={`text-xs font-black tracking-tight ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>{p.label}</div>
                 {isSelected && (
                   <motion.div layoutId="cloud-dot" className="absolute bottom-3 h-1.5 w-1.5 rounded-full bg-primary" />
                 )}
              </button>
            )
          })}
       </div>

       <Card className="premium-card !p-8 border-white/5">
          {cloudConfig.provider === 'google' && (
            <div className="space-y-8 text-center">
               <div className="space-y-3">
                  <h3 className="text-lg font-black text-text-primary">Connecter Google Drive</h3>
                  <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">Archivage automatique de vos factures et exports Sheets.</p>
               </div>
               <button className="mx-auto flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-gray-900 text-sm font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all ring-1 ring-black/5">
                  <BrandLogo name="google" size={20} /> Se connecter
               </button>
            </div>
          )}
          {cloudConfig.provider === 'onedrive' && (
            <div className="space-y-8 text-center">
               <div className="space-y-3">
                  <h3 className="text-lg font-black text-text-primary">Lier Microsoft OneDrive</h3>
                  <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">Centralisez vos documents BTP sur votre espace Microsoft 365.</p>
               </div>
               <button className="mx-auto flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#0078d4] text-white text-sm font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                  <BrandLogo name="microsoft" size={20} invert /> Lier mon compte
               </button>
            </div>
          )}
          {cloudConfig.provider === 'docling-cloud' && (
            <div className="space-y-8">
               <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="h-20 w-20 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                     <ShieldCheck size={40} />
                  </div>
                  <div className="space-y-3 flex-1">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                        <span className="text-text-secondary">Espace Utilisé</span>
                        <span className="text-primary">1.2 Go / 5.0 Go</span>
                     </div>
                     <div className="h-2 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/5">
                        <motion.div initial={{ width: 0 }} animate={{ width: '24%' }} className="h-full bg-primary" />
                     </div>
                  </div>
               </div>
            </div>
          )}
       </Card>
    </div>
  )
}
