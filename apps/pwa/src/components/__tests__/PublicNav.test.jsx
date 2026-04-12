import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import PublicNav from '../PublicNav'

describe('PublicNav', () => {
  test('smoke: marque et liens marketing', () => {
    render(
      <MemoryRouter>
        <PublicNav />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /^Docling\.$/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /Navigation marketing/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Tarifs/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('link', { name: /Essai gratuit/i }).length).toBeGreaterThanOrEqual(1)
  })
})
