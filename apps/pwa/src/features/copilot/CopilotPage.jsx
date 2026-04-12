import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Mic, Layout, Settings, History, PackageSearch, Bot } from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import { useAppI18n } from '@/shared/i18n/appI18n'

const SUGGESTIONS = [
  { icon: Layout, label: 'Organiser mes chantiers', color: 'text-blue-400' },
  { icon: History, label: 'Analyser mes dépenses de Mars', color: 'text-indigo-400' },
  { icon: PackageSearch, label: 'Trouver le meilleur prix pour le cuivre', color: 'text-amber-400' },
  { icon: Settings, label: 'Configurer mon Cloud Google', color: 'text-emerald-400' },
]

export default function CopilotPage() {
  const t = useAppI18n()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: t.copilot.welcome }
  ])

  const handleSend = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: input }])
    setInput('')
    // Simulate thinking
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "Je commence à analyser votre demande. C'est une excellente idée pour optimiser votre rentabilité !" }])
    }, 1000)
  }

  return (
    <PageTransition variant="slideUp">
      <div className="relative flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-100px)]">
        {/* Header Profiel */}
        <header className="shrink-0 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-lg">
              <Sparkles size={24} className="text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-text-primary">{t.copilot.label}</h1>
              <p className="text-sm text-text-secondary">Votre assistant BTP intelligent disponible 24/7</p>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary text-white font-medium' 
                    : 'bg-elevated border border-border text-text-primary backdrop-blur-md'
                }`}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                       <Bot size={14} className="text-primary" />
                       <span className="text-[10px] uppercase font-black tracking-widest text-primary/70">{t.copilot.assistantName}</span>
                    </div>
                  )}
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6">
            {SUGGESTIONS.map((s, i) => {
              const Icon = s.icon
              return (
                <button
                  key={i}
                  onClick={() => setInput(s.label)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-elevated/50 p-3.5 text-left text-sm font-bold text-text-primary transition-all hover:bg-white/5 hover:border-primary/30"
                >
                  <Icon size={18} className={s.color} />
                  {s.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Input Area */}
        <div className="shrink-0 pt-4">
          <div className="relative flex items-center gap-2 rounded-2xl border border-primary/20 bg-elevated/60 p-2 shadow-xl ring-1 ring-primary/5 backdrop-blur-xl focus-within:ring-primary/40 focus-within:border-primary/40 transition-all">
            <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-white/10 hover:text-primary transition-colors">
              <Mic size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.copilot.placeholder}
              className="flex-1 bg-transparent border-none text-sm text-text-primary placeholder:text-text-tertiary focus:ring-0 outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg hover:bg-cta-hover disabled:opacity-50 transition-all active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-text-tertiary">
            {t.copilot.errorIa}
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
