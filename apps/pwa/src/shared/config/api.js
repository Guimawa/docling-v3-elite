// Sanitize URL from env to prevent injection (SAFE-MCP-101)
function sanitizeUrl(value) {
  if (!value || typeof value !== 'string') return ''
  const cleaned = value.replace(/[\r\n\0]/g, '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//.test(cleaned)) return ''
  return cleaned
}

const _env = sanitizeUrl(import.meta.env.VITE_API_URL || '')

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function deriveDevApiFromCurrentHost() {
  if (typeof window === 'undefined') return ''
  const host = window.location.hostname || ''
  if (!host || isLoopbackHost(host)) return ''
  return `http://${host}:8000`
}

function resolveBaseURL() {
  if (_env) {
    // En dev mobile/LAN, un VITE_API_URL=localhost casse les requêtes depuis un autre device.
    // On remplace automatiquement par l'hôte courant (IP LAN du poste) pour éviter les "Network Error".
    if (!import.meta.env.PROD && typeof window !== 'undefined') {
      try {
        const envUrl = new URL(_env)
        if (isLoopbackHost(envUrl.hostname)) {
          const derived = deriveDevApiFromCurrentHost()
          if (derived) return derived
        }
      } catch {
        // URL invalide déjà gérée par sanitizeUrl -> fallback ci-dessous
      }
    }
    return _env
  }
  if (import.meta.env.PROD) {
    // Avec un reverse-proxy (ex: Netlify redirect), l'API est exposée sur la même origine (URL relative).
    return ''
  }
  const derived = deriveDevApiFromCurrentHost()
  if (derived) return derived
  return 'http://localhost:8000'
}

export const API_BASE_URL = resolveBaseURL()

export const ENDPOINTS = {
  // scan domain (domains/scan)
  process:      `${API_BASE_URL}/api/v1/invoices/process`,
  status:       (jobId) => `${API_BASE_URL}/api/v1/invoices/status/${jobId}`,
  /** SSE (text/event-stream) — repli : polling GET status */
  statusStream: (jobId) => `${API_BASE_URL}/api/v1/invoices/status/${jobId}/stream`,

  // catalogue domain (domains/catalogue)
  catalogue:    `${API_BASE_URL}/api/v1/catalogue`,
  fournisseurs: `${API_BASE_URL}/api/v1/catalogue/fournisseurs`,
  compare:      `${API_BASE_URL}/api/v1/catalogue/compare`,
  checkDuplicate: `${API_BASE_URL}/api/v1/catalogue/check-duplicate`,
  batch:        `${API_BASE_URL}/api/v1/catalogue/batch`,
  stats:        `${API_BASE_URL}/api/v1/stats`,

  // scan domain (history endpoints in domains/scan)
  history:      `${API_BASE_URL}/api/v1/history`,
  pdfUrl:       (factureId) => `${API_BASE_URL}/api/v1/history/${factureId}/pdf`,

  // auth domain (domains/auth)
  login:        `${API_BASE_URL}/api/v1/auth/login`,
  register:     `${API_BASE_URL}/api/v1/auth/register`,
  logout:       `${API_BASE_URL}/api/v1/auth/logout`,
  me:           `${API_BASE_URL}/api/v1/auth/me`,
  googleStart:  `${API_BASE_URL}/api/v1/auth/google/start`,

  // onboarding (auth domain)
  onboardingStep:    `${API_BASE_URL}/api/v1/auth/onboarding/step`,
  onboardingComplete: `${API_BASE_URL}/api/v1/auth/onboarding/complete`,

  // billing (domains/billing)
  checkoutSession: `${API_BASE_URL}/api/v1/billing/checkout-session`,
  billingPortal: `${API_BASE_URL}/api/v1/billing/portal-session`,

  // compliance domain (domains/compliance)
  exportMyData: `${API_BASE_URL}/api/v1/export/my-data`,

  // watchdog domain (domains/watchdog)
  syncStatus:   `${API_BASE_URL}/api/v1/sync/status`,

  // platform domain (domains/platform)
  health:       `${API_BASE_URL}/health`,
}
