import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  RotateCcw: () => <svg data-testid="icon-rotate" aria-hidden />,
}))

import * as Sentry from '@sentry/react'
import ErrorBoundary from '../ErrorBoundary'

// Composant qui peut lancer une erreur
const Bomb = ({ shouldThrow = false }) => {
  if (shouldThrow) throw new Error('Boom — test error')
  return <div>Rendu normal</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Supprime console.error pour ne pas polluer la sortie de test
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Rendu normal')).toBeInTheDocument()
  })

  test('catches error and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText(/quelque chose s.est mal passé/i)).toBeInTheDocument()
  })

  test('shows error description in fallback', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument()
  })

  test('shows "Réessayer" button in error state', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })

  test('shows "Accueil" link pointing to /', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    const link = screen.getByRole('link', { name: /accueil/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })

  test('calls Sentry.captureException when error is caught', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ extra: expect.any(Object) })
    )
  })

  test('Réessayer resets error state and renders children again', () => {
    // shouldThrow est une variable externe modifiable entre le premier et le second rendu
    let shouldThrow = true
    const RecoverableBomb = () => {
      if (shouldThrow) throw new Error('Erreur initiale')
      return <div>Récupéré</div>
    }
    render(
      <ErrorBoundary>
        <RecoverableBomb />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    expect(screen.getByText('Récupéré')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument()
  })

  test('does not show error UI when children render without error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.queryByText(/quelque chose s.est mal passé/i)).not.toBeInTheDocument()
  })
})
