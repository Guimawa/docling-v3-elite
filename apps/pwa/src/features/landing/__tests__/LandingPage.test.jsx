import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import LandingPage from '../LandingPage'
import { useDoclingStore } from '@/store/useStore'

describe('LandingPage', () => {
  test('smoke: hero, CTA et liens essentiels', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /structurées en quelques secondes/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Essai gratuit/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Se connecter/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Continuer avec Google/i })).toBeInTheDocument()
    const fonctionnalites = document.getElementById('fonctionnalites')
    expect(fonctionnalites).toBeTruthy()
    expect(
      within(fonctionnalites).getByRole('heading', {
        name: /flux réel des factures fournisseurs/i,
      }),
    ).toBeInTheDocument()
  }, 20000)

  test('pastilles thème: change appTheme dans le store', async () => {
    const user = userEvent.setup()
    useDoclingStore.setState({ appTheme: 'ivory' })
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('radio', { name: /Aurore/i }))
    expect(useDoclingStore.getState().appTheme).toBe('aurora')
  }, 20000)
})
