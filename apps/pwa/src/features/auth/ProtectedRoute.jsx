import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { FEATURES } from '@/shared/config/features'
import { TRIAL_SESSION_STORAGE_KEY } from '@/shared/constants/trialAccess'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState(() =>
    FEATURES.AUTH_REQUIRED ? 'loading' : 'ok'
  )
  const [mePayload, setMePayload] = useState(null)

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    if (search.get('trial') === '1') {
      sessionStorage.setItem(TRIAL_SESSION_STORAGE_KEY, '1')
    }
  }, [location.search])

  useEffect(() => {
    if (!FEATURES.AUTH_REQUIRED) {
      return
    }

    apiClient.get(ENDPOINTS.me, { withCredentials: true })
      .then(({ data }) => {
        // Le backend peut répondre avec un compte invité en FREE_ACCESS_MODE.
        // Si FEATURES.AUTH_REQUIRED (VITE_AUTH_REQUIRED !== 'false'), l'invité n'est autorisé qu'avec le flux explicite "Essai gratuit".
        const isGuest = !data?.user_id || data?.email === 'guest@free.provisional'
        const trialAllowed = sessionStorage.getItem(TRIAL_SESSION_STORAGE_KEY) === '1'
        if (isGuest && !trialAllowed) {
          setStatus('unauth')
          setMePayload(null)
          return
        }
        setMePayload(data)
        setStatus('ok')
      })
      .catch(() => {
        setMePayload(null)
        setStatus('unauth')
      })
  }, [location.pathname, location.search])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'unauth') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const trialAllowed = sessionStorage.getItem(TRIAL_SESSION_STORAGE_KEY) === '1'
  const isGuest = !mePayload?.user_id || mePayload?.email === 'guest@free.provisional'
  const onboardingIncomplete =
    FEATURES.AUTH_ONBOARDING_V2 &&
    !trialAllowed &&
    !isGuest &&
    mePayload?.onboarding_completed === false

  if (onboardingIncomplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
