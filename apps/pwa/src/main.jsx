import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from '@/shared/ui/ErrorBoundary'
import { measureWebVitals } from './utils/reportWebVitals'
import './index.css'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: 'docling-agent@3.0.0',
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    tracePropagationTargets: [/^\//, new RegExp(`^${API_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)],
    // Sécurité : ne jamais envoyer de PII (cookies, IP, email) à Sentry
    sendDefaultPii: false,
    beforeSend(event) {
      // Supprimer les headers sensibles (auth, cookies) des traces réseau
      if (event.request?.headers) {
        const h = event.request.headers
        delete h['Authorization']
        delete h['Cookie']
        delete h['X-Auth-Token']
        delete h['Set-Cookie']
      }
      // Supprimer les données utilisateur identifiantes
      if (event.user) {
        delete event.user.ip_address
        delete event.user.email
        delete event.user.username
      }
      return event
    },
  })
}

measureWebVitals()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const root = ReactDOM.createRoot(document.getElementById('root'), {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    if (import.meta.env.DEV) console.warn('[Uncaught]', error, errorInfo?.componentStack)
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
})

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
