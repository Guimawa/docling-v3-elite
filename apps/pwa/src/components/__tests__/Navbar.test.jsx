import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Navbar from '../Navbar'

vi.mock('lucide-react', () => ({
  Camera:        () => <svg data-testid="icon-camera" aria-hidden />,
  CheckCircle2:  () => <svg data-testid="icon-validation" aria-hidden />,
  PackageSearch: () => <svg data-testid="icon-catalogue" aria-hidden />,
  Clock:         () => <svg data-testid="icon-clock" aria-hidden />,
  Settings:      () => <svg data-testid="icon-settings" aria-hidden />,
  Home:          () => <svg data-testid="icon-home" aria-hidden />,
  LogOut:        () => <svg data-testid="icon-logout" aria-hidden />,
  WifiOff:       () => <svg data-testid="icon-wifi-off" aria-hidden />,
}))

const renderNavbar = (initialEntry = '/scan') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Navbar />
    </MemoryRouter>
  )

describe('Navbar', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true, writable: true, configurable: true,
    })
  })

  afterEach(() => {
    // Reset online status after each test
    Object.defineProperty(navigator, 'onLine', {
      value: true, writable: true, configurable: true,
    })
  })

  test('renders nav element with aria-label', () => {
    renderNavbar()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
  })

  test('renders navigation links (sidebar desktop)', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Scanner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Validation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Catalogue' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Historique' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Réglages' })).toBeInTheDocument()
  })

  test('nav links have correct hrefs', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Scanner' })).toHaveAttribute('href', '/scan')
    expect(screen.getByRole('link', { name: 'Validation' })).toHaveAttribute('href', '/validation')
    expect(screen.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/catalogue')
    expect(screen.getByRole('link', { name: 'Historique' })).toHaveAttribute('href', '/history')
    expect(screen.getByRole('link', { name: 'Réglages' })).toHaveAttribute('href', '/settings')
  })

  test('renders nav label text', () => {
    renderNavbar()
    expect(screen.getByText('Scanner')).toBeInTheDocument()
    expect(screen.getByText('Validation')).toBeInTheDocument()
    expect(screen.getByText('Catalogue')).toBeInTheDocument()
    expect(screen.getByText('Historique')).toBeInTheDocument()
    expect(screen.getByText('Réglages')).toBeInTheDocument()
  })

  test('renders data-testid attributes', () => {
    renderNavbar()
    expect(screen.getByTestId('nav-scan')).toBeInTheDocument()
    expect(screen.getByTestId('nav-validation')).toBeInTheDocument()
    expect(screen.getByTestId('nav-catalogue')).toBeInTheDocument()
    expect(screen.getByTestId('nav-history')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })

  test('does not show offline indicator when online', () => {
    renderNavbar()
    expect(screen.queryByText(/hors ligne/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('icon-wifi-off')).not.toBeInTheDocument()
  })

  test('shows offline indicator when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    renderNavbar()
    expect(screen.getByText(/hors ligne/i)).toBeInTheDocument()
    expect(screen.getByTestId('icon-wifi-off')).toBeInTheDocument()
  })

  test('shows offline indicator after window offline event', () => {
    renderNavbar()
    expect(screen.queryByText(/hors ligne/i)).not.toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(screen.getByText(/hors ligne/i)).toBeInTheDocument()
  })

  test('hides offline indicator after window online event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    renderNavbar()
    expect(screen.getByText(/hors ligne/i)).toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(screen.queryByText(/hors ligne/i)).not.toBeInTheDocument()
  })

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderNavbar()
    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
})
