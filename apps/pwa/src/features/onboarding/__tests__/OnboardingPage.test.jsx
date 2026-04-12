import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/shared/config/features', () => ({
  FEATURES: {
    AUTH_REQUIRED: true,
    AUTH_GOOGLE_ENABLED: true,
    AUTH_ONBOARDING_V2: true,
  },
}))

vi.mock('@/shared/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import apiClient from '@/shared/lib/apiClient'
import OnboardingPage from '../OnboardingPage'

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockResolvedValue({
      data: { user_id: 'u1', email: 'a@b.com', onboarding_completed: false },
    })
    apiClient.post.mockResolvedValue({ data: { ok: true } })
  })

  test('affiche l’étape 1 puis passe à l’entreprise après Suivant', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /Bienvenue sur Docling/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /^Identité$/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Nom complet/i), 'Marie Martin')
    await user.click(screen.getByRole('button', { name: /^Suivant$/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/onboarding/step'),
        expect.objectContaining({
          step: 1,
          display_name: 'Marie Martin',
          job_role: null,
        }),
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
      )
    })

    expect(await screen.findByRole('heading', { name: /^Entreprise$/i })).toBeInTheDocument()
  }, 15000)
})
