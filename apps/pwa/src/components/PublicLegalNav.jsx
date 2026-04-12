import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

/**
 * Bande de liens juridiques / conformité — réutilisable sur la landing (fond sombre) et pages marketing (clair).
 */
export default function PublicLegalNav({ variant = 'dark', className = '' }) {
  const { t } = usePublicI18n()
  const l = t.landing

  const items = [
    { to: '/mentions-legales', label: l.footerMentions },
    { to: '/cgu', label: l.footerCgu },
    { to: '/confidentialite', label: l.footerPrivacy },
    { to: '/accessibilite', label: l.footerAccessibility },
    { to: '/cookies', label: l.footerCookies },
    { to: '/plan-du-site', label: l.footerSitemap },
    { to: '/confidentialite#signalement-fraude', label: l.footerFraud },
    { to: '/confidentialite#incident-donnees', label: l.footerDataIncident },
  ]

  const linkClass =
    variant === 'dark'
      ? 'text-white/75 transition hover:text-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'
      : 'text-text-secondary transition hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  const sepClass = variant === 'dark' ? 'text-white/35' : 'text-text-tertiary'

  return (
    <nav
      aria-label={l.footerLegalNavSr}
      className={`border-t pt-6 ${variant === 'dark' ? 'border-white/10' : 'border-border/80'} ${className}`}
    >
      <p className="sr-only">{l.footerLegalNavLabel}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-center text-[11px] sm:text-xs">
        {items.map((item, i) => (
          <Fragment key={item.to}>
            {i > 0 && (
              <span className={`mx-1.5 select-none sm:mx-2 ${sepClass}`} aria-hidden>
                ·
              </span>
            )}
            <Link to={item.to} className={`whitespace-nowrap font-medium ${linkClass}`}>
              {item.label}
            </Link>
          </Fragment>
        ))}
      </div>
    </nav>
  )
}
