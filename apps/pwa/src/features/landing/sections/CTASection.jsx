import React from 'react'
import { Link } from 'react-router-dom'

export default function CTASection() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-5xl px-5">
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-20 text-center shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20" />
          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-white sm:text-5xl">Prêt à moderniser votre gestion ?</h2>
            <p className="mt-6 mx-auto max-w-lg text-blue-100 text-lg">
              Essayez Docling gratuitement pendant 14 jours. Aucune carte bancaire requise.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Link to="/scan?trial=1" className="rounded-full bg-white px-10 py-4 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-all active:scale-95">
                Commencer maintenant
              </Link>
              <Link to="/register" className="rounded-full border border-white/20 bg-white/10 px-10 py-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 transition-all">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
