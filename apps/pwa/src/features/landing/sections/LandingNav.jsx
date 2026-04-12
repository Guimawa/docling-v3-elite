import React from 'react'
import { Link } from 'react-router-dom'
import { usePublicI18n, PUBLIC_LANGUAGES } from '@/shared/i18n/publicI18n'

export default function LandingNav() {
  const { language, setLanguage } = usePublicI18n()
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <nav className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-3 shadow-2xl backdrop-blur-2xl">
          <Link to="/" className="text-xl font-bold text-white tracking-tight">
            Docling<span className="text-blue-500">.</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#fonctionnalites" className="text-sm text-slate-300 hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#demo" className="text-sm text-slate-300 hover:text-white transition-colors">Démo</a>
            <Link to="/a-propos" className="text-sm text-slate-300 hover:text-white transition-colors">À propos</Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="mr-2 hidden items-center gap-2 md:flex">
              {PUBLIC_LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                    language === l.value
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Link to="/login" className="hidden text-sm font-semibold text-slate-300 hover:text-white transition-colors sm:inline-block">Connexion</Link>
            <Link to="/scan?trial=1" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xl transition-all hover:bg-blue-500 hover:-translate-y-px active:translate-y-0">Essai gratuit</Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
