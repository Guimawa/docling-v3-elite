import { Link } from 'react-router-dom'
import PublicNav from '@/components/PublicNav'
import PublicLegalNav from '@/components/PublicLegalNav'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

export default function MarketingLayout({ title, subtitle, children }) {
  const { t } = usePublicI18n()

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-text-primary">
      <PublicNav />
      <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <header className="rounded-2xl border border-border/70 bg-elevated/90 px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t.marketing.brand}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-base text-text-secondary">{subtitle}</p>}
        </header>
        <div className="mt-5 rounded-2xl border border-border/70 bg-elevated/80 p-5 shadow-xs">
          <div className="space-y-4 text-sm leading-relaxed text-text-secondary [&_a]:font-medium [&_a]:text-primary [&_a]:underline">
          {children}
          </div>
          <p className="mt-8 border-t border-border/80 pt-4">
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">
              {t.marketing.backHome}
            </Link>
          </p>
        </div>
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 sm:px-6">
        <PublicLegalNav variant="light" />
      </footer>
    </div>
  )
}
