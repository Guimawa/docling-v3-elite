import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LegalDocumentPage from '../LegalDocumentPage'

describe('LegalDocumentPage', () => {
  it('affiche les mentions légales', () => {
    render(
      <MemoryRouter initialEntries={['/mentions-legales']}>
        <Routes>
          <Route path="/mentions-legales" element={<LegalDocumentPage pageKey="mentions" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: /mentions légales/i })).toBeInTheDocument()
  })

  it('affiche le plan du site avec des liens', () => {
    render(
      <MemoryRouter initialEntries={['/plan-du-site']}>
        <Routes>
          <Route path="/plan-du-site" element={<LegalDocumentPage pageKey="sitemap" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: /plan du site/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /accueil/i }).length).toBeGreaterThan(0)
  })
})
