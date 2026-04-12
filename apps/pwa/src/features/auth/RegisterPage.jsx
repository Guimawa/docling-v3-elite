import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { clearTrialSessionAccess } from '@/shared/lib/sessionManager'
import { useAppI18n } from '@/shared/i18n/appI18n'
import GoogleSignInButton from '@/components/GoogleSignInButton'

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
}

function validatePassword(password) {
  return (password || '').length >= 12
}

export default function RegisterPage() {
  const t = useAppI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      toast.error(t.auth.invalidEmail)
      return
    }
    if (!validatePassword(password)) {
      toast.error(t.auth.weakPassword)
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      formData.append('name', name || email.split('@')[0])
      const { data } = await apiClient.post(ENDPOINTS.register, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      })
      if (data?.user_id) {
        clearTrialSessionAccess()
        toast.success(t.auth.registerSuccess)
        navigate('/scan', { replace: true })
      } else {
        toast.error(t.auth.invalidServerResponse)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || t.auth.registerError
      toast.error(typeof msg === 'string' ? msg : t.auth.emailAlreadyUsed)
    } finally {
      setLoading(false)
    }
  }, [email, password, name, navigate, t])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-transparent p-6">
      <div
        className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-primary-pale via-amber-100/40 to-transparent blur-3xl opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-24 h-64 w-64 rounded-full bg-gradient-to-tr from-primary-light/15 via-transparent to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-primary/15 bg-elevated/95 p-6 shadow-[0_24px_60px_rgba(26,21,16,0.12)] backdrop-blur-xl sm:p-7">
        <p className="mb-2 inline-flex items-center rounded-full border border-primary/15 bg-primary-pale/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {t.auth.register.badge}
        </p>
        <h1 className="font-heading text-3xl font-bold text-text-primary">{t.auth.register.title}</h1>
        <p className="mb-6 mt-1 text-sm text-text-tertiary">{t.auth.register.subtitle}</p>

        <GoogleSignInButton label={t.auth.google.label} className="mb-5" />
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t.auth.register.divider}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-email" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              {t.auth.register.email}
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.register.emailPlaceholder}
              autoComplete="email"
              required
              className="w-full bg-page border border-border rounded-xl py-3 px-4
                text-text-primary placeholder-gray-600
                focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="register-name" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              {t.auth.register.nameOptional}
            </label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.register.namePlaceholder}
              autoComplete="name"
              className="w-full bg-page border border-border rounded-xl py-3 px-4
                text-text-primary placeholder-gray-600
                focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              {t.auth.register.password}
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.register.passwordPlaceholder}
              autoComplete="new-password"
              required
              className="w-full bg-page border border-border rounded-xl py-3 px-4
                text-text-primary placeholder-gray-600
                focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-bold text-white transition-colors hover:bg-cta-hover disabled:opacity-50"
          >
            {loading ? t.auth.register.submitLoading : t.auth.register.submitIdle}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-tertiary">
          {t.auth.register.hasAccount}{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            {t.auth.register.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
