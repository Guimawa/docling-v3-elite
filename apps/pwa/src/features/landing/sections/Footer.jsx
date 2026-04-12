import React from 'react'
import { Link } from 'react-router-dom'
import { usePublicI18n, PUBLIC_LANGUAGES } from '@/shared/i18n/publicI18n'

export default function Footer() {
  const { t, language, setLanguage } = usePublicI18n()
  const landingT = t.landing
  return (
    <footer className="border-t border-white/5 bg-slate-950 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <span className="text-2xl font-bold text-white">Docling<span className="text-blue-500">.</span></span>
            <p className="mt-6 max-w-sm text-slate-400 text-sm leading-relaxed">{landingT.footerDescription}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Produit</h4>
            <nav className="mt-6 flex flex-col gap-4 text-sm text-slate-500">
              <Link to="/login" className="hover:text-white transition-colors">Audit Prix</Link>
              <Link to="/login" className="hover:text-white transition-colors">Scan Intelligent</Link>
              <Link to="/tarifs" className="hover:text-white transition-colors">Abonnement</Link>
            </nav>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Légal</h4>
            <nav className="mt-6 flex flex-col gap-4 text-sm text-slate-500">
              <Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions Légales</Link>
              <div className="flex gap-4 pt-4 border-t border-white/5">
                {PUBLIC_LANGUAGES.map((l) => (
                  <button key={l.value} onClick={() => setLanguage(l.value)} className={`text-[10px] uppercase font-bold ${language === l.value ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}>
                    {l.value}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 text-[10px] text-slate-600 uppercase tracking-widest text-center">
          © {new Date().getFullYear()} Docling — Fabriqué pour les bâtisseurs.
        </div>
      </div>
    </footer>
  )
}
