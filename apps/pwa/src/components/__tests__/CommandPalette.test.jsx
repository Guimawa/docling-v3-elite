import { forwardRef } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: {
    div: forwardRef(
      ({ children, className, onClick, onMouseEnter, onKeyDown, ...rest }, ref) => (
        <div
          ref={ref}
          className={className}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onKeyDown={onKeyDown}
          {...rest}
        >
          {children}
        </div>
      ),
    ),
    button: ({ children, className, onClick, onMouseEnter, type = 'button', ...rest }) => (
      <button
        type={type}
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        {...rest}
      >
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('lucide-react', () => ({
  Camera:        () => <svg data-testid="icon-camera" />,
  CheckCircle2:  () => <svg data-testid="icon-validation" />,
  Clock:         () => <svg data-testid="icon-clock" />,
  FileText:      () => <svg data-testid="icon-file" />,
  HelpCircle:    () => <svg data-testid="icon-help" />,
  Home:          () => <svg data-testid="icon-home" />,
  PackageSearch: () => <svg data-testid="icon-pkg" />,
  Settings:      () => <svg data-testid="icon-settings" />,
}))

import CommandPalette from '../CommandPalette'

const renderPalette = () =>
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  )

describe('CommandPalette', () => {
  test('renders without crashing (palette closed by default)', () => {
    renderPalette()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('opens on Ctrl+K', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByText('Scanner')).toBeInTheDocument()
  })

  test('closes on Escape when open (capture)', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByText('Scanner')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('navigates with ArrowDown on listbox + aria-activedescendant', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('aria-activedescendant', 'command-palette-home')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(listbox).toHaveAttribute('aria-activedescendant', 'command-palette-scan')
  })

  test('navigates with ArrowUp on listbox', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const listbox = screen.getByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    fireEvent.keyDown(listbox, { key: 'ArrowUp' })
    expect(listbox).toHaveAttribute('aria-activedescendant', 'command-palette-home')
  })

  test('clicking a command item calls handleSelect', async () => {
    const user = userEvent.setup()
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const firstCommand = await screen.findByRole('option', { name: /Accueil \(marketing\)/i })
    await user.click(firstCommand)
    await waitFor(() => {
      expect(screen.queryByText('Scanner')).not.toBeInTheDocument()
    })
  }, 15000)

  test('hovering an item updates selection', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const options = screen.getAllByRole('option')
    fireEvent.mouseEnter(options[2])
    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-activedescendant',
      'command-palette-validation',
    )
  })

  test('clicking backdrop closes palette', () => {
    const { container } = renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByText('Scanner')).toBeInTheDocument()
    const veil = container.querySelector('.backdrop-blur-sm')
    expect(veil).toBeTruthy()
    fireEvent.click(veil)
    expect(screen.queryByText('Scanner')).not.toBeInTheDocument()
  })

  test('clicking inner panel does not close palette (stopPropagation)', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const innerPanels = document.querySelectorAll('.rounded-2xl')
    if (innerPanels.length > 0) {
      fireEvent.click(innerPanels[0])
      expect(screen.getByText('Scanner')).toBeInTheDocument()
    }
  })

  test('dialog a11y: role, aria-modal, titre associé, listbox + options', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const dlg = screen.getByRole('dialog')
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAttribute('aria-labelledby', 'command-palette-title')
    expect(document.getElementById('command-palette-title')).toHaveTextContent('Navigation rapide')
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('aria-labelledby', 'command-palette-title')
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
  })

  test('focus initial sur le listbox à l’ouverture', async () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    await waitFor(() => {
      const lb = screen.getByRole('listbox')
      expect(document.activeElement).toBe(lb)
      expect(lb).toHaveAttribute('aria-activedescendant', 'command-palette-home')
    })
  })

  test('Tab sur le listbox garde le focus dans le dialogue (piège à focus)', async () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const listbox = await screen.findByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'Tab' })
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(document.activeElement).toBe(listbox)
    })
  })
})
