import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// ── Framer Motion (motion.button = carte facture) ─────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, style, role, 'aria-modal': am, 'aria-label': al }) => (
      <div className={className} onClick={onClick} style={style} role={role} aria-modal={am} aria-label={al}>{children}</div>
    ),
    aside: ({ children, className, onClick }) => (
      <aside className={className} onClick={onClick}>{children}</aside>
    ),
    img: ({ src, alt, className }) => <img src={src} alt={alt} className={className} />,
    button: ({ children, onClick, 'aria-label': al, className, disabled }) => (
      <button type="button" onClick={onClick} aria-label={al} className={className} disabled={disabled}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

// ── Store ─────────────────────────────────────────────────────────────────────
const mockUpdateProduct = vi.fn()
const mockClearJob = vi.fn()

let mockProducts = []
let mockPendingSource = 'pc'

vi.mock('@/store/useStore', () => ({
  useDoclingStore: (selector) => selector({
    extractedProducts: mockProducts,
    pendingSource: mockPendingSource,
    updateProduct: mockUpdateProduct,
    clearJob: mockClearJob,
  }),
}))

vi.mock('@/shared/lib/apiClient', () => ({
  default: { post: vi.fn() },
}))

vi.mock('@/shared/config/api', () => ({
  ENDPOINTS: { batch: '/api/v1/catalogue/batch' },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/components/PageTransition', () => ({ default: ({ children }) => <>{children}</> }))

vi.mock('@/components/Select', () => ({
  default: ({ value, onChange, id, label, options = [], placeholder, className }) => (
    <select id={id} value={value} onChange={onChange} aria-label={label} className={className}>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('lucide-react', () => ({
  AlertCircle: () => <svg aria-hidden />,
  CheckCircle: () => <svg aria-hidden />,
  CheckCircle2: () => <svg aria-hidden />,
  ChevronRight: () => <svg aria-hidden />,
  FileText: () => <svg aria-hidden />,
  Pencil: () => <svg aria-hidden />,
  ShieldCheck: () => <svg aria-hidden />,
  Sparkles: () => <svg aria-hidden />,
  X: () => <svg aria-hidden />,
}))

vi.mock('@/constants/categories', () => ({
  FAMILLES: ['Béton', 'Ferraille', 'Bois'],
}))

import apiClient from '@/shared/lib/apiClient'
import { toast } from 'sonner'
import ValidationPage from '../ValidationPage'

const PRODUCT = {
  _key: 'p1',
  designation_fr: 'Ciment BTP',
  fournisseur: 'BIGMAT',
  famille: 'Béton',
  prix_brut_ht: 10.5,
  remise_pct: 5,
  prix_remise_ht: 9.975,
  unite: 'm²',
  confidence: 'high',
}

const PRODUCT2 = { ...PRODUCT, _key: 'p3', designation_fr: 'Sable fin', confidence: 'high' }

/** Données incomplètes → badge « Vérification recommandée » dans le panneau */
const SUSPECT_PRODUCT = { ...PRODUCT, _key: 'p-sus', designation_fr: 'Incomplet', prix_remise_ht: 0, unite: '' }

const INV = (num, overrides = {}) => ({
  ...PRODUCT,
  _key: `k-${num}`,
  numero_facture: String(num),
  ...overrides,
})

const renderPage = (initialEntry = '/validation') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/scan" element={<div>ScanPage</div>} />
        <Route path="/catalogue" element={<div>CataloguePage</div>} />
        <Route path="/validation" element={<ValidationPage />} />
      </Routes>
    </MemoryRouter>
  )

async function openFirstInvoiceCard() {
  const card = screen.getAllByRole('button', { name: /Facture/i })[0]
  fireEvent.click(card)
  await waitFor(() => {
    expect(screen.getByText('Validation express')).toBeInTheDocument()
  })
}

describe('ValidationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProducts = [PRODUCT]
    mockPendingSource = 'pc'
  })

  test('redirige vers /scan sans produits', () => {
    mockProducts = []
    renderPage()
    expect(screen.getByText('ScanPage')).toBeInTheDocument()
  })

  test('affiche le titre Validation IA', () => {
    renderPage()
    expect(screen.getByText('Validation IA')).toBeInTheDocument()
  })

  test('affiche le nombre de nouveaux produits à valider dans le sous-titre', () => {
    renderPage()
    expect(screen.getByText(/1 nouveau produit à valider/i)).toBeInTheDocument()
  })

  test(
    'affiche une carte facture pour le groupe (sans numéro de facture)',
    () => {
      renderPage()
      expect(screen.getByRole('button', { name: /Facture \(BIGMAT\)/i })).toBeInTheDocument()
    },
    15000,
  )

  test('ouvre le panneau express au clic sur la carte', async () => {
    renderPage()
    await openFirstInvoiceCard()
    expect(screen.getByText('Ciment BTP')).toBeInTheDocument()
  })

  test('affiche la recommandation de vérification pour un produit suspect (données incomplètes)', async () => {
    mockProducts = [SUSPECT_PRODUCT]
    renderPage()
    await openFirstInvoiceCard()
    expect(screen.getByText(/Vérification recommandée/i)).toBeInTheDocument()
  })

  test('n’affiche pas la recommandation pour un produit complet', async () => {
    renderPage()
    await openFirstInvoiceCard()
    expect(screen.queryByText(/Vérification recommandée/i)).not.toBeInTheDocument()
  })

  test(
    'la carte facture disparaît de la liste après validation du lot',
    async () => {
      mockProducts = [INV('001'), INV('002', { designation_fr: 'Autre ligne' })]
      renderPage()
      expect(screen.getByRole('button', { name: /Facture #001/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Facture #002/i })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Facture #001/i }))
      await waitFor(() => screen.getByText('Validation express'))
      fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
      await waitFor(() => screen.getByRole('button', { name: /Enregistrer 1 produit/i }))
      fireEvent.click(screen.getByRole('button', { name: /Enregistrer 1 produit/i }))

      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: /Facture #001/i })).not.toBeInTheDocument()
        },
        { timeout: 10_000 },
      )
      expect(screen.getByRole('button', { name: /Facture #002/i })).toBeInTheDocument()
      expect(toast.success).toHaveBeenCalled()
    },
    20_000,
  )

  test('enregistrement final : POST batch, toast succès, navigation catalogue', async () => {
    apiClient.post.mockResolvedValue({ data: {} })
    renderPage()
    await openFirstInvoiceCard()
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => screen.getByRole('button', { name: /Enregistrer 1 produit/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer 1 produit/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/catalogue/batch',
        expect.objectContaining({
          produits: expect.any(Array),
          source: 'pc',
        })
      )
      expect(toast.success).toHaveBeenCalled()
      expect(screen.getByText('CataloguePage')).toBeInTheDocument()
    })
    expect(mockClearJob).toHaveBeenCalled()
  })

  test('erreur API : toast erreur et possibilité de réessayer depuis la barre fixe', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Server Error'))
    renderPage()
    await openFirstInvoiceCard()
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => screen.getByRole('button', { name: /Enregistrer 1 produit/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer 1 produit/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur de sauvegarde')
    })
    expect(screen.queryByText('CataloguePage')).not.toBeInTheDocument()

    apiClient.post.mockResolvedValueOnce({ data: {} })
    const bottomSave = screen.getByRole('button', { name: /Enregistrer 1 produit/i })
    fireEvent.click(bottomSave)

    await waitFor(() => {
      expect(screen.getByText('CataloguePage')).toBeInTheDocument()
    })
  })

  test('après échec d’enregistrement, affiche le message d’invite (tous les lots validés)', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('fail'))
    renderPage()
    await openFirstInvoiceCard()
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => screen.getByRole('button', { name: /Enregistrer 1 produit/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer 1 produit/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(
      screen.getByText(/Tous les lots sont validés/i)
    ).toBeInTheDocument()
  })

  test('bannière doublons masqués quand is_new false', () => {
    mockProducts = [{ ...PRODUCT, is_new: false }, { ...PRODUCT2, is_new: true }]
    renderPage()
    const main = screen.getByRole('main')
    expect(main.textContent).toMatch(/1 doublon/)
    expect(main.textContent).toMatch(/masqu/i)
    expect(main.textContent).toMatch(/automatiquement/i)
    expect(screen.getByText(/1 nouveau produit à valider/i)).toBeInTheDocument()
  })

  test('deux produits même facture : un seul groupe, libellé Enregistrer 2 produits', async () => {
    mockProducts = [PRODUCT, { ...PRODUCT2, fournisseur: 'BIGMAT', date_facture: PRODUCT.date_facture }]
    renderPage()
    await openFirstInvoiceCard()
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => {
      expect(screen.getByText('Sable fin')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enregistrer 2 produits/i })).toBeInTheDocument()
    })
  })

  test('mode édition puis Valider appelle updateProduct pour les champs numériques', async () => {
    renderPage()
    await openFirstInvoiceCard()
    fireEvent.click(screen.getByRole('button', { name: /Modifier/i }))
    const designation = screen.getByDisplayValue('Ciment BTP')
    fireEvent.change(designation, { target: { value: 'Ciment modifié' } })
    fireEvent.click(screen.getByRole('button', { name: /Valider/i }))

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith(0, 'designation_fr', 'Ciment modifié')
    })
  })

  test('sauvegarde depuis la barre fixe avec deux factures (sans enregistrement auto du dernier lot)', async () => {
    apiClient.post.mockResolvedValue({ data: {} })
    mockProducts = [INV('A'), INV('B', { designation_fr: 'Ligne B' })]
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Facture #A/i }))
    await waitFor(() => screen.getByText('Validation express'))
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => screen.getByRole('button', { name: /Enregistrer 1 produit/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer 1 produit/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Facture #A/i })).not.toBeInTheDocument()
    })

    const bottomSave = await screen.findByRole('button', { name: /Enregistrer 1 produit/i })
    fireEvent.click(bottomSave)

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled()
      expect(screen.getByText('CataloguePage')).toBeInTheDocument()
    })
  })
})
