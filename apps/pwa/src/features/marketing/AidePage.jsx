import MarketingLayout from './MarketingLayout'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

export default function AidePage() {
  const { t } = usePublicI18n()
  const help = t.marketing.help

  return (
    <MarketingLayout
      title={help.title}
      subtitle={help.subtitle}
    >
      <h2 className="font-heading text-xl font-semibold text-text-primary">{help.authTitle}</h2>
      <p className="mt-2">
        {help.authBody}
      </p>
      <h2 className="mt-8 font-heading text-xl font-semibold text-text-primary">{help.resetTitle}</h2>
      <p className="mt-2">
        {help.resetBody}
      </p>
      <h2 className="mt-8 font-heading text-xl font-semibold text-text-primary">{help.shortcutsTitle}</h2>
      <p className="mt-2">
        {help.shortcutsBody}
      </p>
      <h2 className="mt-8 font-heading text-xl font-semibold text-text-primary">{help.trustExportsTitle}</h2>
      <p className="mt-2">
        {help.trustExportsBody}
      </p>
      <h2 className="mt-8 font-heading text-xl font-semibold text-text-primary">{help.integrationTitle}</h2>
      <p className="mt-2">
        {help.integrationBody}
      </p>
    </MarketingLayout>
  )
}
