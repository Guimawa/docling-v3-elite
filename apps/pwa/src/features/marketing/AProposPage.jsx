import MarketingLayout from './MarketingLayout'
import { usePublicI18n } from '@/shared/i18n/publicI18n'

export default function AProposPage() {
  const { t } = usePublicI18n()
  const about = t.marketing.about

  return (
    <MarketingLayout
      title={about.title}
      subtitle={about.subtitle}
    >
      <p>
        {about.body1}
      </p>
      <p className="mt-4">
        {about.body2}
      </p>
    </MarketingLayout>
  )
}
