import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { TRIAL_SESSION_STORAGE_KEY } from '@/shared/constants/trialAccess'

export function clearTrialSessionAccess() {
  sessionStorage.removeItem(TRIAL_SESSION_STORAGE_KEY)
}

export async function logoutAndRedirect({ navigate, redirectTo = '/' }) {
  try {
    await apiClient.post(ENDPOINTS.logout, {}, { withCredentials: true })
  } catch {
    // Session déjà expirée : on redirige quand même.
  } finally {
    clearTrialSessionAccess()
    navigate(redirectTo, { replace: true })
  }
}
