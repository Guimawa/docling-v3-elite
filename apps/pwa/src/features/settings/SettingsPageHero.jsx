/**
 * En-tête visuel de la page Réglages (hero + titre).
 */
export default function SettingsPageHero({ icon, badge, title, description, footnote }) {
  const IconComponent = icon
  return (
    <header className="relative z-10 px-4 pb-2 pt-5 sm:px-5">
      <div className="mx-auto max-w-4xl rounded-2xl border border-primary/10 bg-elevated/85 px-4 py-3.5 shadow-md shadow-black/[0.04] backdrop-blur-xl ring-1 ring-text-primary/[0.04]">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-beige shadow-inner ring-1 ring-primary/10"
            aria-hidden
          >
            <IconComponent size={22} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-pale/60 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
              {badge}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
            {footnote ? (
              <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-text-tertiary">{footnote}</p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
