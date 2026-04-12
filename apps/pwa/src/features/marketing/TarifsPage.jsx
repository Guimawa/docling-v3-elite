import { useState } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout from './MarketingLayout'
import { usePublicI18n } from '@/shared/i18n/publicI18n'
import { getPublicContactEmail } from '@/shared/config/publicContacts'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'

export default function TarifsPage() {
  const { t } = usePublicI18n()
  const pricing = t.marketing.pricing
  const contactEmail = getPublicContactEmail()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubscribe(tier) {
    setError(null)
    setLoading(tier)
    try {
      const { data } = await apiClient.post(
        ENDPOINTS.checkoutSession, 
        { plan_tier: tier }, 
        { withCredentials: true }
      )
      if (data?.url) window.location.assign(data.url)
      else setError(pricing.subscribeError)
    } catch (e) {
      const status = e.response?.status
      if (status === 403 || status === 401) setError(pricing.subscribeLoginRequired)
      else if (status === 503) setError(pricing.subscribeUnavailable)
      else setError(pricing.subscribeError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MarketingLayout
      title={pricing.title}
      subtitle={pricing.subtitle}
    >
      <ul className="list-none space-y-4 pl-0">
        <li className="rounded-2xl border border-border bg-elevated p-5 shadow-sm">
          <p className="font-heading text-lg font-semibold text-text-primary">Starter - 9€</p>
          <p className="mt-1 text-sm">{pricing.starterDescription || 'Idéal pour débuter.'}</p>
          <button
            type="button"
            onClick={() => handleSubscribe('starter_9')}
            disabled={!!loading}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading === 'starter_9' ? pricing.subscribeLoading : pricing.subscribeCta}
          </button>
        </li>
        <li className="rounded-2xl border border-primary/30 bg-elevated p-5 shadow-md ring-1 ring-primary/20">
          <div className="flex items-center justify-between">
            <p className="font-heading text-lg font-semibold text-text-primary">Pro - 19€</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Populaire</span>
          </div>
          <p className="mt-1 text-sm">{pricing.proDescription}</p>
          <button
            type="button"
            onClick={() => handleSubscribe('pro_19')}
            disabled={!!loading}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading === 'pro_19' ? pricing.subscribeLoading : pricing.subscribeCta}
          </button>
        </li>
        <li className="rounded-2xl border border-border bg-elevated p-5 shadow-sm">
          <p className="font-heading text-lg font-semibold text-text-primary">Elite - 29€</p>
          <p className="mt-1 text-sm">{pricing.eliteDescription || 'Souveraineté totale & Cloud Privé.'}</p>
          <button
            type="button"
            onClick={() => handleSubscribe('elite_29')}
            disabled={!!loading}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading === 'elite_29' ? pricing.subscribeLoading : pricing.subscribeCta}
          </button>
        </li>
      </ul>
      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive" role="alert">
          {error}{' '}
          {(error === pricing.subscribeLoginRequired) && (
            <Link to="/login" className="font-bold underline ml-1">
              {t.nav.login}
            </Link>
          )}
        </p>
      )}
      <p className="mt-6 text-sm">
        {pricing.contactPrefix}{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
    </MarketingLayout>
  )
}
