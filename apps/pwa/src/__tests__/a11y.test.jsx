/**
 * Tests d'accessibilité (WCAG 2.1 AA) via jest-axe + @testing-library/react.
 * Couvre les pages Auth (Login, Register) et les composants critiques.
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'

import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'

expect.extend(toHaveNoViolations)

// Mock sonner (toast) — pas de rendu réel en tests
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// Mock apiClient — évite les vraies requêtes HTTP
vi.mock('@/shared/lib/apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { baseURL: 'http://localhost:8000', withCredentials: true },
  },
}))

// Mock react-router-dom navigate
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => vi.fn() }
})

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Accessibilité — LoginPage', () => {
  test('aucune violation WCAG axe', async () => {
    const { container } = renderWithRouter(<LoginPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  test('champs email et mot de passe ont un label associé', () => {
    const { getByLabelText } = renderWithRouter(<LoginPage />)
    expect(getByLabelText(/email/i)).toBeTruthy()
    expect(getByLabelText(/mot de passe/i)).toBeTruthy()
  })

  test('bouton submit a un texte accessible', () => {
    const { getByRole } = renderWithRouter(<LoginPage />)
    const btn = getByRole('button', { name: /se connecter/i })
    expect(btn).toBeTruthy()
  })
})

describe('Accessibilité — RegisterPage', () => {
  test('aucune violation WCAG axe', async () => {
    const { container } = renderWithRouter(<RegisterPage />)
    // Avoid overlap with previous axe run on slower CI runners.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  test('champs email, nom et mot de passe ont un label associé', () => {
    const { getByLabelText } = renderWithRouter(<RegisterPage />)
    expect(getByLabelText(/email/i)).toBeTruthy()
    expect(getByLabelText(/nom/i)).toBeTruthy()
    expect(getByLabelText(/mot de passe/i)).toBeTruthy()
  })

  test('bouton submit a un texte accessible', () => {
    const { getByRole } = renderWithRouter(<RegisterPage />)
    const btn = getByRole('button', { name: /s'inscrire/i })
    expect(btn).toBeTruthy()
  })
})
