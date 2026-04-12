import React from 'react'
import { Cpu, Zap, Bot, CheckCircle2, Scan, Layers } from 'lucide-react'
import Card from '@/components/Card'
import Input from '@/components/Input'
import { useDoclingStore } from '@/store/useStore'

export default function IntelligenceSection({ selectedModel, setModel, EXTRACTION_PROFILES }) {
  const ocrEngine = useDoclingStore(s => s.ocrEngine)
  const setOcrEngine = useDoclingStore(s => s.setOcrEngine)
  const preprocessMode = useDoclingStore(s => s.preprocessMode)
  const setPreprocessMode = useDoclingStore(s => s.setPreprocessMode)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <header><h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Cpu size={20} className="text-primary" /> Intelligence & Connecteurs</h2></header>
       
       <Card className="premium-card space-y-8">
          {/* MOTEUR D'OCR */}
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><Layers size={18} /></div>
                <h3 className="text-sm font-black text-text-primary">Moteur d'Intelligence Documentaire</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOcrEngine('standard')}
                  className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-start cursor-pointer ${ocrEngine === 'standard' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}
                >
                  <div>
                    <div className="text-xs font-bold text-text-primary">Standard</div>
                    <div className="text-[10px] text-text-tertiary mt-1">Gemini / Tesseract</div>
                  </div>
                  {ocrEngine === 'standard' && <CheckCircle2 size={14} className="text-primary mt-0.5" />}
                </button>
                <button
                  onClick={() => setOcrEngine('elite')}
                  className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-start cursor-pointer ${ocrEngine === 'elite' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}
                >
                  <div>
                    <div className="text-xs font-bold text-amber-500">Élite (IBM Docling)</div>
                    <div className="text-[10px] text-text-tertiary mt-1">Technologie de pointe IBM Research</div>
                  </div>
                  {ocrEngine === 'elite' && <CheckCircle2 size={14} className="text-amber-500 mt-0.5" />}
                </button>
             </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* TRAITEMENT D'IMAGE */}
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><Scan size={18} /></div>
                <h3 className="text-sm font-black text-text-primary">Traitement Photo Mobile</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPreprocessMode('basic')}
                  className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-start cursor-pointer ${preprocessMode === 'basic' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}
                >
                  <div>
                    <div className="text-xs font-bold text-text-primary">Basique</div>
                    <div className="text-[10px] text-text-tertiary mt-1">Nettoyage standard</div>
                  </div>
                  {preprocessMode === 'basic' && <CheckCircle2 size={14} className="text-primary mt-0.5" />}
                </button>
                <button
                  onClick={() => setPreprocessMode('pro_scan')}
                  className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-start cursor-pointer ${preprocessMode === 'pro_scan' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}
                >
                  <div>
                    <div className="text-xs font-bold text-primary">Pro Scan (Warp)</div>
                    <div className="text-[10px] text-text-tertiary mt-1">Redressement Perspective Adobe Scan</div>
                  </div>
                  {preprocessMode === 'pro_scan' && <CheckCircle2 size={14} className="text-primary mt-0.5" />}
                </button>
             </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* MODELES IA */}
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><Bot size={18} /></div>
                <h3 className="text-sm font-black text-text-primary">Modèle d'Extraction IA</h3>
             </div>
             <div className="space-y-2">
                {EXTRACTION_PROFILES.map((profile) => {
                  const isSelected = selectedModel === profile.id
                  return (
                    <button
                      key={profile.id}
                      onClick={() => setModel(profile.id)}
                      className={`flex w-full items-center justify-between p-4 rounded-2xl border transition-all text-left ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-4">
                         <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-white/5 text-text-tertiary'}`}>
                            <profile.icon size={20} />
                         </div>
                         <div>
                            <div className={`text-xs font-bold ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>{profile.label}</div>
                            <div className="text-[10px] text-text-tertiary">{profile.summary}</div>
                         </div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                    </button>
                  )
                })}
             </div>
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><Zap size={18} /></div>
                <h3 className="text-sm font-black text-text-primary">Clés API Docling</h3>
             </div>
             <Input label="Clé Secrète (API Key)" type="password" value="sk-••••••••••••••••" readOnly />
          </div>
       </Card>
    </div>
  )
}
