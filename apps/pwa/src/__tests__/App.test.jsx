import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'

// ── Mocks de toutes les dépendances ──────────────────────────────────────────
vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
}))

vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar" />,
}))

vi.mock('../components/OfflineBanner', () => ({
  default: () => <div data-testid="offline-banner" />,
}))

vi.mock('../components/CommandPalette', () => ({
  default: () => <div data-testid="command-palette" />,
}))

vi.mock('../features/auth', () => ({
  ProtectedRoute: ({ children }) => <>{children}</>,
}))

vi.mock('@/shared/ui/SkeletonCard', () => ({
  default: () => <div data-testid="skeleton-card" />,
}))

vi.mock('@/shared/config/features', () => ({
  FEATURES: { AUTH_REQUIRED: false },
}))

// Pages lazy-loadées
vi.mock('../features/landing/LandingPage',     () => ({ default: () => <div>LandingPage</div> }))
vi.mock('../features/marketing/TarifsPage',    () => ({ default: () => <div>TarifsPage</div> }))
vi.mock('../features/marketing/AProposPage',   () => ({ default: () => <div>AProposPage</div> }))
vi.mock('../features/marketing/AidePage',      () => ({ default: () => <div>AidePage</div> }))
vi.mock('../features/scan/ScanPage',           () => ({ default: () => <div>ScanPage</div> }))
vi.mock('../features/validation/ValidationPage', () => ({ default: () => <div>ValidationPage</div> }))
vi.mock('../features/catalogue/CataloguePage', () => ({ default: () => <div>CataloguePage</div> }))
vi.mock('../features/history/HistoryPage',     () => ({ default: () => <div>HistoryPage</div> }))
vi.mock('../features/settings/SettingsPage',   () => ({ default: () => <div>SettingsPage</div> }))
vi.mock('../features/auth/LoginPage',          () => ({ default: () => <div>LoginPage</div> }))
vi.mock('../features/auth/RegisterPage',       () => ({ default: () => <div>RegisterPage</div> }))

import App from '../App'

const renderApp = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  )

describe('App', () => {
  test('renders Toaster', () => {
    renderApp()
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })

  test('renders OfflineBanner', () => {
    renderApp()
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument()
  })

  test('renders CommandPalette', () => {
    renderApp()
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
  })

  test('/ renders LandingPage without bottom Navbar', async () => {
    renderApp('/')
    await waitFor(() =>
      expect(screen.getByText('LandingPage')).toBeInTheDocument()
    )
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
  })

  test('/scan renders ScanPage', async () => {
    renderApp('/scan')
    await waitFor(() =>
      expect(screen.getByText('ScanPage')).toBeInTheDocument()
    )
  })

  test('/scan renders Navbar', async () => {
    renderApp('/scan')
    await waitFor(() =>
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
    )
  })

  test('/catalogue renders CataloguePage', async () => {
    renderApp('/catalogue')
    await waitFor(() =>
      expect(screen.getByText('CataloguePage')).toBeInTheDocument()
    )
  })

  test('/history renders HistoryPage', async () => {
    renderApp('/history')
    await waitFor(() =>
      expect(screen.getByText('HistoryPage')).toBeInTheDocument()
    )
  })

  test('/settings renders SettingsPage', async () => {
    renderApp('/settings')
    await waitFor(() =>
      expect(screen.getByText('SettingsPage')).toBeInTheDocument()
    )
  })

  test('/validation renders ValidationPage', async () => {
    renderApp('/validation')
    await waitFor(() =>
      expect(screen.getByText('ValidationPage')).toBeInTheDocument()
    )
  })

  test('/login renders LoginPage (no navbar)', async () => {
    renderApp('/login')
    await waitFor(() =>
      expect(screen.getByText('LoginPage')).toBeInTheDocument()
    )
  })

  test('/register renders RegisterPage', async () => {
    renderApp('/register')
    await waitFor(() =>
      expect(screen.getByText('RegisterPage')).toBeInTheDocument()
    )
  })

  test('/aide renders AidePage (public)', async () => {
    renderApp('/aide')
    await waitFor(() =>
      expect(screen.getByText('AidePage')).toBeInTheDocument()
    )
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
  })

  test('route interne inconnue affiche 404 avec liens utiles', async () => {
    renderApp('/route-interne-inexistante')
    expect(await screen.findByRole('heading', { level: 1, name: '404' })).toBeInTheDocument()
    expect(
      screen.getByText(/Cette page n'existe pas dans l'application Docling/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour au scanner/i })).toHaveAttribute('href', '/scan')
    expect(screen.getByRole('link', { name: /Accueil marketing/i })).toHaveAttribute('href', '/')
  }, 15000)

  test('layout principal expose min-h-screen (sous AppAmbientBackground)', () => {
    const { container } = renderApp()
    const mainShell = container.querySelector('.min-h-screen')
    expect(mainShell).toBeTruthy()
  })
})
