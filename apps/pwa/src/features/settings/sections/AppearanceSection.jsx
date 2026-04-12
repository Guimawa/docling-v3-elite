import React from 'react'
import { Palette, Zap, ZapOff } from 'lucide-react'
import Card from '@/components/Card'

export default function AppearanceSection({ 
  appTheme, setAppTheme, isDarkMode, 
  appearance, setAppearance, FONT_OPTIONS 
}) {
  return (
    <div className="space-y-6">
      <header><h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Palette size={20} className="text-primary" /> Confort Visuel</h2></header>
      <Card className="premium-card">
        <div className="space-y-12 py-4">
          {/* Theme Toggle */}
          <div className="flex flex-col items-center">
            <label className="text-2xs font-black uppercase tracking-[0.2em] text-text-tertiary mb-6">Mode d'Immersion</label>
            <div className="flex p-1 bg-surface rounded-2xl w-full max-w-sm ring-1 ring-border shadow-inner">
              <button 
                onClick={() => setAppTheme('aurora')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${isDarkMode ? 'bg-indigo-600 text-white shadow-xl ring-1 ring-white/20' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Zap size={14} /> Elite Dark
              </button>
              <button 
                onClick={() => setAppTheme('ivory')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${!isDarkMode ? 'bg-elevated text-primary shadow-xl ring-1 ring-primary/10' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <ZapOff size={14} /> Clair Ivory
              </button>
            </div>
          </div>

          {/* Font Family Selection */}
          <div className="space-y-4">
            <label className="text-2xs font-black uppercase tracking-[0.2em] text-text-tertiary block text-center">Style Typographique</label>
            <div className="flex flex-wrap justify-center gap-3">
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setAppearance(p => ({ ...p, fontFamily: f.id }))}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${appearance.fontFamily === f.id ? 'bg-primary/10 text-primary ring-1 ring-primary/30 shadow-lg' : 'bg-surface text-text-tertiary hover:text-text-secondary hover:bg-border/30'}`}
                  style={{ fontFamily: f.family }}
                >
                  {f.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="max-w-md mx-auto w-full">
             <div className="flex justify-between items-center mb-6 px-1">
                <label className="text-2xs font-black uppercase tracking-[0.2em] text-text-tertiary">Taille de l'interface</label>
                <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{appearance.fontSize}px</span>
             </div>
             <div className="relative flex items-center gap-5 px-3">
                <span className="text-[10px] font-black text-text-tertiary">Aa</span>
                <input 
                   type="range" min="11" max="17" step="1"
                   value={appearance.fontSize}
                   onChange={(e) => {
                     const val = parseInt(e.target.value)
                     setAppearance(p => ({ ...p, fontSize: val }))
                     document.documentElement.style.fontSize = `${val}px`
                   }}
                   className="flex-1 h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-primary hover:bg-border/50 transition-all shadow-inner border border-border"
                />
                <span className="text-lg font-black text-text-tertiary">Aa</span>
             </div>
          </div>
        </div>
      </Card>
      <p className="text-center text-[10px] text-text-tertiary italic opacity-30">Studio Engine v2026.4 — Confort optimisé.</p>
    </div>
  )
}
