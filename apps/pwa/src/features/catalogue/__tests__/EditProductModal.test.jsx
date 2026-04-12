import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditProductModal from '../EditProductModal'
import apiClient from '@/shared/lib/apiClient'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/shared/lib/apiClient', () => ({
  default: {
    put: vi.fn()
  }
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('EditProductModal', () => {
  const mockProduct = {
    id: 42,
    designation_fr: 'Béton C25/30',
    designation_raw: 'Béton brut C25/30',
    famille: 'Béton',
    fournisseur: 'CEMEX',
    unite: 'm³',
    prix_brut_ht: 150.0,
    remise_pct: 10.0,
    prix_remise_ht: 135.0,
    prix_ttc_iva21: 163.35
  }

  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.vibrate
    globalThis.navigator.vibrate = vi.fn()
  })

  afterEach(() => {
    delete globalThis.navigator.vibrate
  })

  it('returns null when product is null', () => {
    const { container } = render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={null} onSave={mockOnSave} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('does not render when isOpen is false', () => {
    render(
      <EditProductModal isOpen={false} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )
    expect(screen.queryByText('Éditer le produit')).not.toBeInTheDocument()
  })

  it('renders modal when isOpen is true with product', () => {
    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )
    expect(screen.getByText('Éditer le produit')).toBeInTheDocument()
    expect(screen.getByText('Modifiez les informations du produit')).toBeInTheDocument()
  })

  it('exposes dialog semantics and labelled title', () => {
    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )
    const dlg = screen.getByRole('dialog')
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAttribute('aria-labelledby', 'edit-product-modal-title')
    expect(document.getElementById('edit-product-modal-title')).toHaveTextContent('Éditer le produit')
  })

  it('initializes form with product data', () => {
    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    expect(screen.getByDisplayValue('Béton C25/30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Béton brut C25/30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CEMEX')).toBeInTheDocument()
    expect(screen.getByDisplayValue('m³')).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    expect(screen.getByPlaceholderText('Ex: Béton C25/30')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Désignation d\'origine')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex: CEMEX')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('u, m³, T...')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const backdrop = container.querySelector('.fixed.inset-0')
    await user.click(backdrop)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when X close button is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    // Le bouton X est le premier button dans le DOM (position absolute top-4 right-4)
    const closeButton = container.querySelector('button.absolute.top-4')
    expect(closeButton).toBeInTheDocument()

    await user.click(closeButton)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when Annuler button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const annulerButton = screen.getByText('Annuler')
    await user.click(annulerButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('saves product successfully', async () => {
    const user = userEvent.setup()
    const mockResponse = { data: { ...mockProduct, designation_fr: 'Updated' } }
    apiClient.put.mockResolvedValueOnce(mockResponse)

    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const saveButton = screen.getByText('Enregistrer')
    await user.click(saveButton)

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalogue/42'),
        expect.objectContaining({
          designation_fr: 'Béton C25/30',
          famille: 'Béton',
          fournisseur: 'CEMEX'
        })
      )
      expect(toast.success).toHaveBeenCalledWith('Produit modifié avec succès')
      expect(mockOnSave).toHaveBeenCalledWith(mockResponse.data)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('triggers haptic feedback on successful save', async () => {
    const user = userEvent.setup()
    const mockResponse = { data: mockProduct }
    apiClient.put.mockResolvedValueOnce(mockResponse)

    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const saveButton = screen.getByText('Enregistrer')
    await user.click(saveButton)

    await waitFor(() => {
      expect(globalThis.navigator.vibrate).toHaveBeenCalledWith([10, 30, 10])
    })
  })

  it('handles API error on save', async () => {
    const user = userEvent.setup()
    const mockError = {
      response: {
        data: {
          detail: 'Erreur serveur'
        }
      }
    }
    apiClient.put.mockRejectedValueOnce(mockError)

    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const saveButton = screen.getByText('Enregistrer')
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur serveur')
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  it('handles API error without detail message', async () => {
    const user = userEvent.setup()
    apiClient.put.mockRejectedValueOnce(new Error('Network error'))

    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const saveButton = screen.getByText('Enregistrer')
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la modification')
    })
  })

  it('disables save button while saving', async () => {
    const user = userEvent.setup()
    apiClient.put.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    const saveButton = screen.getByText('Enregistrer')
    await user.click(saveButton)

    // Button should be disabled during save
    expect(saveButton).toBeDisabled()
  })

  it('renders form with correct button labels', () => {
    render(
      <EditProductModal isOpen={true} onClose={mockOnClose} product={mockProduct} onSave={mockOnSave} />
    )

    expect(screen.getByText('Annuler')).toBeInTheDocument()
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()
  })
})
