import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count = 0 }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 68,
        size: 68,
        key: index,
      })),
    getTotalSize: () => count * 68,
    measureElement: () => {},
  }),
}))

vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(() => ({
      addWorksheet: vi.fn(() => ({
        columns: [],
        addRows: vi.fn(),
      })),
      xlsx: { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) },
    })),
  },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const mockGet = vi.fn()
vi.mock('@/shared/lib/apiClient', () => ({
  default: { get: (...args) => mockGet(...args) },
}))

vi.mock('@/shared/config/api', () => ({
  ENDPOINTS: {
    catalogue: 'http://localhost:8000/api/v1/catalogue',
    fournisseurs: 'http://localhost:8000/api/v1/catalogue/fournisseurs',
  },
}))

import CataloguePage from '../CataloguePage'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderWithRouter(initialPath = '/catalogue') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/catalogue" element={<CataloguePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const emptyFacets = {
  fournisseurs: [],
  familles: [],
  sous_familles: [],
  types_produit: [],
  variantes: [],
  dimensions: [],
  total: 0,
}

describe('CataloguePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url) => {
      if (url?.includes?.('/facets')) {
        return Promise.resolve({ data: emptyFacets })
      }
      if (url?.includes?.('/search')) {
        return Promise.resolve({ data: { products: [], total: 0, offset: 0, limit: 200 } })
      }
      return Promise.resolve({ data: {} })
    })
  })

  test('au chargement : appelle /facets uniquement (pas /search) si aucun critère', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/facets'),
        expect.any(Object),
      )
    })
    const searchCalls = mockGet.mock.calls.filter(([u]) => String(u).includes('/search'))
    expect(searchCalls.length).toBe(0)
  })

  test('catalogue vide (facets total 0) : message premier scan', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('Catalogue vide')).toBeInTheDocument()
    })
    expect(screen.getByText(/première facture/i)).toBeInTheDocument()
  })

  test('catalogue avec produits mais sans recherche : invite sans appeler /search', async () => {
    mockGet.mockImplementation((url) => {
      if (url?.includes?.('/facets')) {
        return Promise.resolve({
          data: {
            fournisseurs: ['ACME'],
            familles: ['Outillage'],
            sous_familles: [],
            types_produit: [],
            variantes: [],
            dimensions: [],
            total: 3,
          },
        })
      }
      if (url?.includes?.('/search')) {
        return Promise.resolve({ data: { products: [], total: 0, offset: 0, limit: 200 } })
      }
      return Promise.resolve({ data: {} })
    })
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText(/au moins 2 lettres/i)).toBeInTheDocument()
    })
    const searchCalls = mockGet.mock.calls.filter(([u]) => String(u).includes('/search'))
    expect(searchCalls.length).toBe(0)
  })

  test('avec ?q=ab : appelle /search et affiche les produits', async () => {
    mockGet.mockImplementation((url) => {
      if (url?.includes?.('/facets')) {
        return Promise.resolve({
          data: {
            fournisseurs: ['ACME'],
            familles: ['Outillage'],
            sous_familles: [],
            types_produit: [],
            variantes: [],
            dimensions: [],
            total: 1,
          },
        })
      }
      if (url?.includes?.('/search')) {
        return Promise.resolve({
          data: {
            products: [{
              id: 1,
              designation_fr: 'Marteau test',
              fournisseur: 'ACME',
              famille: 'Outillage',
              unite: 'u',
              prix_brut_ht: 10,
              remise_pct: 0,
              prix_remise_ht: 10,
              prix_ttc_iva21: 12.1,
            }],
            total: 1,
            offset: 0,
            limit: 200,
          },
        })
      }
      return Promise.resolve({ data: {} })
    })
    renderWithRouter('/catalogue?q=ab')
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          params: expect.objectContaining({ q: 'ab' }),
        }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Marteau test')).toBeInTheDocument()
    })
  })
})
