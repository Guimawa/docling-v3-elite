import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { FEATURES } from '@/shared/config/features'
import { useAppI18n } from '@/shared/i18n/appI18n'

const STEP_COUNT = 5

/** step = valeur API (onboarding_step après ce passage), alignée sur persistStep (step UI + 1). */
function buildPayload(apiStep, state) {
  switch (apiStep) {
    case 1:
      return {
        display_name: state.fullName.trim() || null,
        job_role: state.jobTitle.trim() || null,
      }
    case 2:
      return { company_name: state.companyName.trim(), company_size: state.companySize || null }
    case 3:
      return { job_role: state.role }
    case 4:
      return { primary_goal: state.primaryGoal }
    case 5:
      return {
        locale_pref: state.localePref,
        notifications_email: state.notificationsEmail,
      }
    default:
      return {}
  }
}

export default function OnboardingPage() {
  const t = useAppI18n()
  const ob = t.onboarding
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [role, setRole] = useState('artisan')
  const [primaryGoal, setPrimaryGoal] = useState('catalogue_speed')
  const [localePref, setLocalePref] = useState('fr')
  const [notificationsEmail, setNotificationsEmail] = useState(true)

  const roleOptions = useMemo(
    () => [
      { value: 'artisan', label: ob.roles.artisan },
      { value: 'purchase', label: ob.roles.purchase },
      { value: 'site_manager', label: ob.roles.site_manager },
      { value: 'admin', label: ob.roles.admin },
      { value: 'other', label: ob.roles.other },
    ],
    [ob.roles],
  )

  const goalOptions = useMemo(
    () => [
      { value: 'catalogue_speed', label: ob.goals.catalogue_speed },
      { value: 'quotes', label: ob.goals.quotes },
      { value: 'compliance', label: ob.goals.compliance },
      { value: 'explore', label: ob.goals.explore },
    ],
    [ob.goals],
  )

  useEffect(() => {
    if (!FEATURES.AUTH_ONBOARDING_V2) {
      navigate('/scan', { replace: true })
      return
    }
    let cancelled = false
    apiClient
      .get(ENDPOINTS.me, { withCredentials: true })
      .then(({ data }) => {
        if (cancelled) return
        if (data?.onboarding_completed !== false) {
          navigate('/scan', { replace: true })
        }
      })
      .catch(() => {
        /* laisser ProtectedRoute gérer l’auth */
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  const validateStep = useCallback(() => {
    if (step === 0 && !fullName.trim()) {
      toast.error(ob.errors.fullName)
      return false
    }
    if (step === 1 && !companyName.trim()) {
      toast.error(ob.errors.companyName)
      return false
    }
    return true
  }, [step, fullName, companyName, ob.errors])

  const persistStep = useCallback(async () => {
    const apiStep = step + 1
    const payload = buildPayload(apiStep, {
      fullName,
      jobTitle,
      companyName,
      companySize,
      role,
      primaryGoal,
      localePref,
      notificationsEmail,
    })
    await apiClient.post(
      ENDPOINTS.onboardingStep,
      { step: apiStep, ...payload },
      { headers: { 'Content-Type': 'application/json' } },
    )
  }, [step, fullName, jobTitle, companyName, companySize, role, primaryGoal, localePref, notificationsEmail])

  const handleNext = useCallback(async () => {
    if (!validateStep()) return
    setSaving(true)
    try {
      await persistStep()
      if (step >= STEP_COUNT - 1) {
        await apiClient.post(ENDPOINTS.onboardingComplete, {}, { headers: { 'Content-Type': 'application/json' } })
        toast.success(ob.completeToast)
        navigate('/scan', { replace: true })
        return
      }
      setStep((s) => s + 1)
    } catch (err) {
      const msg = err.response?.data?.detail
      toast.error(typeof msg === 'string' ? msg : ob.errors.saveFailed)
    } finally {
      setSaving(false)
    }
  }, [validateStep, persistStep, step, navigate, ob.completeToast, ob.errors.saveFailed])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const handleSkip = useCallback(async () => {
    setSaving(true)
    try {
      await apiClient.post(
        ENDPOINTS.onboardingComplete,
        {},
        { headers: { 'Content-Type': 'application/json' } },
      )
      toast.success(ob.skipToast)
      navigate('/scan', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail
      toast.error(typeof msg === 'string' ? msg : ob.errors.saveFailed)
    } finally {
      setSaving(false)
    }
  }, [navigate, ob.errors.saveFailed, ob.skipToast])

  const progress = ((step + 1) / STEP_COUNT) * 100

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 md:py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{ob.badge}</p>
      <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary md:text-3xl">{ob.title}</h1>
      <p className="mt-1 text-sm text-text-secondary">{ob.subtitle}</p>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        {ob.stepIndicator.replace('{current}', String(step + 1)).replace('{total}', String(STEP_COUNT))}
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-elevated/90 p-5 shadow-sm md:p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">{ob.steps.identity}</h2>
            <div>
              <label htmlFor="ob-fullname" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                {ob.fields.fullName}
              </label>
              <input
                id="ob-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="ob-job" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                {ob.fields.jobTitle}
              </label>
              <input
                id="ob-job"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">{ob.steps.company}</h2>
            <div>
              <label htmlFor="ob-company" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                {ob.fields.companyName}
              </label>
              <input
                id="ob-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="ob-size" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                {ob.fields.companySize}
              </label>
              <select
                id="ob-size"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{ob.placeholders.selectSize}</option>
                <option value="1-5">1–5</option>
                <option value="6-20">6–20</option>
                <option value="21-50">21–50</option>
                <option value="50+">50+</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">{ob.steps.role}</h2>
            <fieldset>
              <legend className="sr-only">{ob.steps.role}</legend>
              <div className="grid gap-2">
                {roleOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      role === opt.value ? 'border-primary bg-primary-pale/50' : 'border-border bg-page hover:border-primary/25'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ob-role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">{ob.steps.objective}</h2>
            <fieldset>
              <legend className="sr-only">{ob.steps.objective}</legend>
              <div className="grid gap-2">
                {goalOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      primaryGoal === opt.value ? 'border-primary bg-primary-pale/50' : 'border-border bg-page hover:border-primary/25'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ob-goal"
                      value={opt.value}
                      checked={primaryGoal === opt.value}
                      onChange={() => setPrimaryGoal(opt.value)}
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">{ob.steps.preferences}</h2>
            <div>
              <label htmlFor="ob-locale" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                {ob.fields.localePref}
              </label>
              <select
                id="ob-locale"
                value={localePref}
                onChange={(e) => setLocalePref(e.target.value)}
                className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="fr">FR</option>
                <option value="es">ES</option>
                <option value="ca">CA</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-page px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={notificationsEmail}
                onChange={(e) => setNotificationsEmail(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              {ob.fields.notificationsEmail}
            </label>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0 || saving}
          className="rounded-xl border border-border bg-page px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/35 disabled:opacity-40"
        >
          {ob.back}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-cta-hover disabled:opacity-50"
        >
          {saving ? ob.saving : step >= STEP_COUNT - 1 ? ob.finish : ob.next}
        </button>
      </div>

      <p className="mt-6 text-center">
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="text-sm font-medium text-text-tertiary underline decoration-border underline-offset-2 transition hover:text-text-secondary disabled:opacity-40"
        >
          {ob.skipForNow}
        </button>
      </p>
    </div>
  )
}
