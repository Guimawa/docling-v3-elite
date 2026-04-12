import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import AidePage from '../AidePage'
import AProposPage from '../AProposPage'
import MarketingLayout from '../MarketingLayout'
import TarifsPage from '../TarifsPage'

vi.mock('@/components/PublicLegalNav', () => ({
  default: function PublicLegalNavStub() {
    return null
  },
}))

describe('Marketing pages', () => {
  test('TarifsPage smoke', () => {
    render(
      <MemoryRouter>
        <TarifsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /^Tarifs$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact@docling\.app/i })).toBeInTheDocument()
  })

  test('AProposPage smoke', () => {
    render(
      <MemoryRouter>
        <AProposPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /À propos/i })).toBeInTheDocument()
  })

  test('AidePage smoke', () => {
    render(
      <MemoryRouter>
        <AidePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /^Aide$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Connexion et essai/i })).toBeInTheDocument()
  })

  test('MarketingLayout rend titre et lien accueil', () => {
    render(
      <MemoryRouter>
        <MarketingLayout title="Titre test" subtitle="Sous-titre">
          <p>Contenu interne</p>
        </MarketingLayout>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /Titre test/i })).toBeInTheDocument()
    expect(screen.getByText('Sous-titre')).toBeInTheDocument()
    expect(screen.getByText('Contenu interne')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour à l’accueil/i })).toBeInTheDocument()
  })
})
