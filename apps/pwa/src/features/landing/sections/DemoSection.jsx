import React from 'react'
import LandingInteractiveDemo from '../components/LandingInteractiveDemo'

function SectionHeading({ subtitle, title, centered = false }) {
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-500">{subtitle}</p>
      <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl tracking-tight">{title}</h2>
    </div>
  )
}

export default function DemoSection() {
  return (
    <section className="py-24 sm:py-32" id="demo">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading subtitle="En action" title="Voyez l'IA extraire vos prix" centered />
        <div className="mt-16">
          <LandingInteractiveDemo />
        </div>
      </div>
    </section>
  )
}
