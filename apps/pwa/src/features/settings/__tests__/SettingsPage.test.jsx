import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

vi.mock('@/shared/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

import apiClient from '@/shared/lib/apiClient'
import SettingsPage from '../SettingsPage'

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastMock.success.mockClear()
    toastMock.error.mockClear()
    localStorage.removeItem('docling_settings')
    apiClient.get.mockImplementation((url) => {
      const u = String(url)
      if (u.includes('/health')) {
        return Promise.resolve({ data: { version: 'test-1' } })
      }
      if (u.includes('/stats')) {
        return Promise.resolve({ data: { total_produits: 3, total_fournisseurs: 2, cette_semaine: 1 } })
      }
      if (u.includes('/sync/status')) {
        return Promise.resolve({ data: { running: false, folder: '/tmp', total_processed: 0 } })
      }
      if (u.includes('/export/my-data')) {
        return Promise.resolve({ data: { ok: true } })
      }
      return Promise.resolve({ data: {} })
    })
    apiClient.patch.mockResolvedValue({ data: {} })
  })

  test('smoke: titre et sections principales', async () => {
    renderSettings()
    expect(await screen.findByRole('heading', { name: /Réglages/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Mon entreprise/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Apparence/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Préférences export \(PDF\)/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled()
    })
  }, 15000)

  test('tester la connexion API met à jour le statut', async () => {
    const user = userEvent.setup()
    renderSettings()
    const tester = await screen.findByRole('button', { name: /Tester/i })
    await user.click(tester)
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ timeout: 5000 }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText(/Connecté/i)).toBeInTheDocument()
    })
  }, 15000)

  test('sélection d’un modèle IA déclenche le feedback toast', async () => {
    const user = userEvent.setup()
    renderSettings()
    const flashBtn = await screen.findByRole('button', { name: /Gemini 2\.5 Flash/i }, { timeout: 15000 })
    await user.click(flashBtn)
    await waitFor(
      () => {
        expect(toastMock.success).toHaveBeenCalledWith(
          expect.stringMatching(/Gemini 2\.5 Flash/),
        )
      },
      { timeout: 15000 },
    )
  }, 25000)
})
