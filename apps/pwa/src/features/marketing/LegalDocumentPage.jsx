import { useLayoutEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MarketingLayout from './MarketingLayout'
import { usePublicI18n } from '@/shared/i18n/publicI18n'
import { injectLegalContactPlaceholders } from '@/shared/config/publicContacts'

function renderInlineBold(text) {
  const parts = String(injectLegalContactPlaceholders(text)).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/**
 * @param {{ pageKey: 'mentions' | 'cgu' | 'privacy' | 'accessibility' | 'cookies' | 'sitemap' }} props
 */
export default function LegalDocumentPage({ pageKey }) {
  const { t } = usePublicI18n()
  const location = useLocation()
  const doc = t.legal.pages[pageKey]

  useLayoutEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace(/^#/, '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, location.pathname, pageKey])

  if (pageKey === 'sitemap') {
    return (
      <MarketingLayout title={doc.title} subtitle={doc.subtitle}>
        <p>{injectLegalContactPlaceholders(doc.intro)}</p>
        <ul className="mt-4 list-none space-y-2.5 pl-0">
          {doc.links.map((entry) => (
            <li key={entry.to}>
              <Link to={entry.to} className="font-medium text-primary underline-offset-2 hover:underline">
                {entry.label}
              </Link>
              <span className="ml-2 font-mono text-[11px] text-text-tertiary">{entry.to}</span>
            </li>
          ))}
        </ul>
      </MarketingLayout>
    )
  }

  return (
    <MarketingLayout title={doc.title} subtitle={doc.subtitle}>
      {doc.sections.map((section, sIdx) => (
        <section
          key={section.id ?? `${section.h2}-${sIdx}`}
          id={section.id}
          className="scroll-mt-24"
        >
          <h2 className="font-heading text-lg font-semibold text-text-primary">{section.h2}</h2>
          {section.paragraphs.map((p, idx) => (
            <p key={idx} className="mt-2">
              {renderInlineBold(p)}
            </p>
          ))}
        </section>
      ))}
    </MarketingLayout>
  )
}
