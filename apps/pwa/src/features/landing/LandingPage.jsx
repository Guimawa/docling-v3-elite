/**
 * LandingPage.jsx — Orchestrateur Redesign 2026
 * 
 * Architecture modulaire Senior 2026
 * Sections isolées pour une performance maximale et une maintenance facilitée.
 */
import { useEffect } from 'react'
import LandingNav from './sections/LandingNav'
import HeroSection from './sections/HeroSection'
import FeaturesSection from './sections/FeaturesSection'
import DemoSection from './sections/DemoSection'
import FAQSection from './sections/FAQSection'
import CTASection from './sections/CTASection'
import Footer from './sections/Footer'

export default function LandingPage() {
  // SEO Structured Data
  useEffect(() => {
    const base = (import.meta.env.VITE_SITE_URL || window.location.origin || '').replace(/\/$/, '')
    const json = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Docling',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Application web pour structurer les factures fournisseurs du BTP : import PDF ou photo, extraction assistée par IA, validation utilisateur, catalogue de prix et exports CSV ou Excel.',
      url: base || undefined,
      inLanguage: ['fr', 'es', 'ca'],
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-docling-seo', 'jsonld-software')
    script.textContent = JSON.stringify(json)
    document.head.appendChild(script)
    return () => script.remove()
  }, [])

  return (
    <div className="relative min-h-screen text-slate-200 selection:bg-blue-500/30 font-inter overflow-x-hidden">
      {/* GlobalBackground is provided by App.jsx or parent context */}
      
      <div className="relative z-10 grainy">
        <LandingNav />
        <main>
          <HeroSection />
          <FeaturesSection />
          <DemoSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </div>
  )
}
