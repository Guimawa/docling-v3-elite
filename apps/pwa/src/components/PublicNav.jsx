import { Link } from 'react-router-dom'
import { PUBLIC_LANGUAGES, usePublicI18n } from '@/shared/i18n/publicI18n'

export default function PublicNav() {
  const { language, setLanguage, t } = usePublicI18n()
  const mainLinks = [
    { to: '/#fonctionnalites', label: t.nav.features },
    { to: '/tarifs', label: t.nav.pricing },
    { to: '/a-propos', label: t.nav.about },
    { to: '/aide', label: t.nav.help },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-primary/15 bg-page/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="font-heading text-xl font-bold tracking-tight">
          Docling<span className="text-primary">.</span>
        </Link>

        <nav className="hidden flex-wrap items-center gap-4 md:flex lg:gap-6" aria-label={t.nav.marketingAria}>
          {mainLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-text-secondary transition hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="rounded-full border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/35 hover:text-text-primary"
          >
            {t.nav.login}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="public-language-select">
            {t.nav.languageSr}
          </label>
          <select
            id="public-language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-full border border-border bg-elevated px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-primary/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            aria-label={t.nav.languageLabel}
          >
            {PUBLIC_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Link
            to="/register"
            className="hidden rounded-full border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/35 hover:text-text-primary sm:inline-flex"
          >
            {t.nav.register}
          </Link>
          <Link
            to="/scan?trial=1"
            className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-cta-hover hover-lift"
          >
            {t.nav.trial}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-primary/10 px-4 py-2 md:hidden">
        {mainLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
          >
            {link.label}
          </Link>
        ))}
        <Link
          to="/login"
          className="rounded-full border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-primary/35 hover:text-text-primary"
        >
          {t.nav.login}
        </Link>
      </div>
    </header>
  )
}
