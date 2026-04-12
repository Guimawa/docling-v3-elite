import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }) => <div className={className} style={style}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useReducedMotion: () => false,
}))

vi.mock('@/shared/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('@/shared/config/api', () => ({
  ENDPOINTS: {
    history:  '/api/v1/history',
    stats:    '/api/v1/stats',
    pdfUrl:   (id) => `/api/v1/invoices/${id}/pdf-url`,
    process:  '/api/v1/invoices/process',
    status:   (id) => `/api/v1/invoices/status/${id}`,
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/shared/ui/SkeletonCard', () => ({
  default: () => <div data-testid="skeleton-card" />,
}))

vi.mock('@/shared/ui/EmptyStateIllustration', () => ({
  default: () => <div data-testid="empty-illustration" />,
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick, disabled, 'aria-label': ariaLabel, isLoading }) => (
    <button onClick={onClick} disabled={disabled || isLoading} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/Card', () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}))

vi.mock('@/components/Badge', () => ({
  default: ({ children }) => <span>{children}</span>,
}))

vi.mock('lucide-react', () => ({
  AlertCircle:  () => <svg aria-hidden />,
  CheckCircle2: () => <svg aria-hidden />,
  Clock:        () => <svg aria-hidden />,
  ExternalLink: () => <svg aria-hidden />,
  Folder:       () => <svg aria-hidden />,
  Loader2:      () => <svg aria-hidden />,
  Monitor:      () => <svg aria-hidden />,
  Package:      () => <svg aria-hidden />,
  RefreshCw:    ({ className }) => <svg className={className} aria-hidden />,
  RotateCcw:    () => <svg aria-hidden />,
  Smartphone:   () => <svg aria-hidden />,
}))

import apiClient from '@/shared/lib/apiClient'
import { toast } from 'sonner'
import HistoryPage from '../HistoryPage'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const FACTURE_TRAITEE = {
  id: 1,
  filename: 'facture-bigmat.pdf',
  statut: 'traite',
  source: 'mobile',
  nb_produits_extraits: 5,
  cout_api_usd: '0.0042',
  modele_ia: 'gemini-flash',
  pdf_url: 'https://storj.example.com/pdf/1',
  created_at: '2026-01-15T10:30:00Z',
}

const FACTURE_ERREUR = {
  id: 2,
  filename: 'facture-erreur.pdf',
  statut: 'erreur',
  source: 'pc',
  nb_produits_extraits: 0,
  cout_api_usd: '0',
  modele_ia: 'gemini-flash',
  pdf_url: 'https://storj.example.com/pdf/2',
  created_at: '2026-01-14T09:00:00Z',
}

const STATS = {
  total_factures: 2,
  total_produits: 5,
  familles: [
    { famille: 'Béton', nb: 3 },
    { famille: 'Ferraille', nb: 2 },
  ],
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>
  )

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('HistoryPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Loading state
  test('shows skeleton while loading', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument()
  })

  // Empty state
  test('shows empty state title when no history', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [] } })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Aucune facture traitée')).toBeInTheDocument()
    )
  })

  test('shows empty illustration in empty state', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [] } })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    await waitFor(() =>
      expect(screen.getByTestId('empty-illustration')).toBeInTheDocument()
    )
  })

  // Page header
  test('renders "Historique" page title', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [] } })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Historique')).toBeInTheDocument()
    )
  })

  // History items
  test('renders facture filename', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('facture-bigmat.pdf')).toBeInTheDocument()
    )
  })

  test('renders multiple history items', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE, FACTURE_ERREUR] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('facture-bigmat.pdf')).toBeInTheDocument()
      expect(screen.getByText('facture-erreur.pdf')).toBeInTheDocument()
    })
  })

  // Stat cards
  test('renders stat card labels', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Factures')).toBeInTheDocument()
      expect(screen.getByText('Produits')).toBeInTheDocument()
      expect(screen.getByText('Coût API')).toBeInTheDocument()
    })
  })

  test('does not show stat cards when history is empty', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [] } })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    await waitFor(() => screen.getByText('Aucune facture traitée'))
    expect(screen.queryByText('Factures')).not.toBeInTheDocument()
  })

  // Famille distribution
  test('renders famille distribution when stats have familles', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Béton')).toBeInTheDocument()
      expect(screen.getByText('Ferraille')).toBeInTheDocument()
    })
  })

  // Refresh
  test('refresh button triggers another API call', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [] } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { history: [] } })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /actualiser/i }))
    fireEvent.click(screen.getByRole('button', { name: /actualiser/i }))
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4)
    })
  })

  // PDF button
  test('shows "Voir PDF" button for factures with pdf_url', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Voir PDF')).toBeInTheDocument()
    )
  })

  test('clicking Voir PDF calls pdfUrl endpoint and opens window', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE] } })
      .mockResolvedValueOnce({ data: STATS })
      .mockResolvedValueOnce({ data: { url: 'https://cdn.example.com/pdf/signed' } })
    renderPage()
    await waitFor(() => screen.getByText('Voir PDF'))
    fireEvent.click(screen.getByText('Voir PDF'))
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://cdn.example.com/pdf/signed',
        '_blank',
        'noopener,noreferrer'
      )
    })
    openSpy.mockRestore()
  })

  test('shows error toast when pdf URL is unavailable', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_TRAITEE] } })
      .mockResolvedValueOnce({ data: STATS })
      .mockResolvedValueOnce({ data: {} }) // no url field
    renderPage()
    await waitFor(() => screen.getByText('Voir PDF'))
    fireEvent.click(screen.getByText('Voir PDF'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('URL PDF indisponible')
    })
  })

  // Re-scan button
  test('shows "Re-scanner" button for erreur factures with pdf_url', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [FACTURE_ERREUR] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Re-scanner')).toBeInTheDocument()
    )
  })

  test('shows "Pas de fichier cloud" for factures without pdf_url', async () => {
    const noCloud = { ...FACTURE_TRAITEE, pdf_url: null }
    apiClient.get
      .mockResolvedValueOnce({ data: { history: [noCloud] } })
      .mockResolvedValueOnce({ data: STATS })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Pas de fichier cloud')).toBeInTheDocument()
    )
  })

  // Error handling
  test('shows error toast when data fetch fails', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Impossible de charger l'historique")
    })
  })
})
