import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const featuresMock = vi.hoisted(() => ({
  AUTH_REQUIRED: true,
  AUTH_GOOGLE_ENABLED: true,
  AUTH_ONBOARDING_V2: false,
}))

vi.mock('@/shared/config/features', () => ({
  FEATURES: {
    get AUTH_REQUIRED() {
      return featuresMock.AUTH_REQUIRED
    },
    get AUTH_GOOGLE_ENABLED() {
      return featuresMock.AUTH_GOOGLE_ENABLED
    },
    get AUTH_ONBOARDING_V2() {
      return featuresMock.AUTH_ONBOARDING_V2
    },
  },
}))

vi.mock('@/shared/lib/apiClient', () => ({
  default: { get: vi.fn() },
}))

vi.mock('@/shared/config/api', () => ({
  ENDPOINTS: { me: '/api/v1/auth/me' },
}))

import apiClient from '@/shared/lib/apiClient'
import ProtectedRoute from '../ProtectedRoute'

const renderRoute = (initialEntry = '/protected') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Page login</div>} />
        <Route path="/onboarding" element={<div>Page onboarding</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Contenu protégé</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )

describe('ProtectedRoute', () => {
  beforeEach(() => {
    featuresMock.AUTH_REQUIRED = true
    featuresMock.AUTH_ONBOARDING_V2 = false
    featuresMock.AUTH_GOOGLE_ENABLED = true
    vi.clearAllMocks()
  })

  test('renders nothing while auth check is pending', () => {
    // Promise never resolves → stays in loading state
    apiClient.get.mockReturnValue(new Promise(() => {}))
    const { container } = renderRoute()
    expect(container.textContent).toBe('')
  })

  test('renders children when authenticated', async () => {
    apiClient.get.mockResolvedValue({ data: { user_id: 1, email: 'test@example.com' } })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
    })
  })

  test('redirects to /login when unauthenticated (401)', async () => {
    apiClient.get.mockRejectedValue(Object.assign(new Error('Unauthorized'), { response: { status: 401 } }))
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Page login')).toBeInTheDocument()
    })
  })

  test('redirects to /login on any network error', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'))
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Page login')).toBeInTheDocument()
    })
  })

  test('calls /api/v1/auth/me with withCredentials', async () => {
    apiClient.get.mockResolvedValue({ data: { user_id: 1 } })
    renderRoute()
    await waitFor(() => screen.getByText('Contenu protégé'))
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      { withCredentials: true }
    )
  })

  test('AUTH_REQUIRED false: pas d’appel /me, accès direct (dev)', async () => {
    featuresMock.AUTH_REQUIRED = false
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
    })
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  test('AUTH_REQUIRED false: pas d’écran de chargement même si /me en attente', () => {
    featuresMock.AUTH_REQUIRED = false
    apiClient.get.mockReturnValue(new Promise(() => {}))
    const { container } = renderRoute()
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })

  test('AUTH_REQUIRED true: invité sans essai → login', async () => {
    featuresMock.AUTH_REQUIRED = true
    sessionStorage.removeItem('docling_trial_access')
    apiClient.get.mockResolvedValue({
      data: { user_id: null, email: 'guest@free.provisional' },
    })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Page login')).toBeInTheDocument()
    })
  })

  test('AUTH_REQUIRED true: invité avec essai session → contenu', async () => {
    featuresMock.AUTH_REQUIRED = true
    sessionStorage.setItem('docling_trial_access', '1')
    apiClient.get.mockResolvedValue({
      data: { user_id: null, email: 'guest@free.provisional' },
    })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
    })
    sessionStorage.removeItem('docling_trial_access')
  })

  test('AUTH_ONBOARDING_V2: redirection /onboarding si onboarding_completed false', async () => {
    featuresMock.AUTH_ONBOARDING_V2 = true
    sessionStorage.removeItem('docling_trial_access')
    apiClient.get.mockResolvedValue({
      data: { user_id: 42, email: 'user@example.com', onboarding_completed: false },
    })
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Page login</div>} />
          <Route path="/onboarding" element={<div>Page onboarding</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Contenu protégé</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Page onboarding')).toBeInTheDocument()
    })
  })

  test('AUTH_ONBOARDING_V2: essai gratuit ignore onboarding même si false', async () => {
    featuresMock.AUTH_ONBOARDING_V2 = true
    sessionStorage.setItem('docling_trial_access', '1')
    apiClient.get.mockResolvedValue({
      data: { user_id: null, email: 'guest@free.provisional', onboarding_completed: false },
    })
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/onboarding" element={<div>Page onboarding</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Contenu protégé</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
    })
    sessionStorage.removeItem('docling_trial_access')
  })
})
