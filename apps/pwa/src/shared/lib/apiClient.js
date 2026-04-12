import axios from 'axios'
import { API_BASE_URL } from '@/shared/config/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
  withCredentials: true, // Envoie le cookie httpOnly docling-token
})

// Retry interceptor: max 3 retries, exponential backoff 500*2^n ms for 5xx/network errors
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config
    config._retryCount = config._retryCount ?? 0
    const maxRetries = 3
    const is5xx = err.response?.status >= 500
    const isNetworkError = !err.response && (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK')

    if ((is5xx || isNetworkError) && config._retryCount < maxRetries) {
      config._retryCount += 1
      const delay = 500 * Math.pow(2, config._retryCount - 1)
      await new Promise((r) => setTimeout(r, delay))
      return apiClient(config)
    }
    return Promise.reject(err)
  },
)

// Lit le cookie csrf_token (non-httpOnly) pour le double-submit CSRF pattern
function getCsrfToken() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// Cookie httpOnly envoyé automatiquement avec withCredentials
// X-CSRF-Token double-submit pour mutations (POST/PUT/PATCH/DELETE)
apiClient.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  const method = (config.method || '').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) config.headers['X-CSRF-Token'] = csrf
  }
  return config
})

// Verrou pour éviter les appels refresh simultanés
let _isRefreshing = false
let _refreshSubscribers = []

function _onRefreshed() {
  _refreshSubscribers.forEach((cb) => cb())
  _refreshSubscribers = []
}

function _addRefreshSubscriber(cb) {
  _refreshSubscribers.push(cb)
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    // Ne pas tenter de refresh si c'est /auth/refresh lui-même qui échoue
    // (évite les boucles infinies)
    if (err.response?.status === 401 && !originalRequest._isRefreshRetry) {
      const path = typeof window !== 'undefined' ? window.location.pathname : ''

      // Ne pas tenter de refresh sur les pages d'auth
      if (path.startsWith('/login') || path.startsWith('/register')) {
        return Promise.reject(err)
      }

      // Si un refresh est déjà en cours, mettre la requête en file d'attente
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _addRefreshSubscriber(() => {
            originalRequest._isRefreshRetry = true
            apiClient(originalRequest).then(resolve).catch(reject)
          })
        })
      }

      originalRequest._isRefreshRetry = true
      _isRefreshing = true

      try {
        // Appel refresh — le cookie docling-refresh est envoyé automatiquement
        await apiClient.post('/api/v1/auth/refresh')
        _isRefreshing = false
        _onRefreshed()
        // Rejouer la requête originale avec le nouveau access token (cookie mis à jour)
        return apiClient(originalRequest)
      } catch (_refreshErr) {
        _isRefreshing = false
        _refreshSubscribers = []
        // Refresh échoué → déconnexion et redirection
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(_refreshErr)
      }
    }

    return Promise.reject(err)
  },
)

export default apiClient
