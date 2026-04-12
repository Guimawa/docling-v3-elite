import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('lucide-react', () => ({
  ChevronDown: () => <svg data-testid="chevron" />,
}))

vi.mock('@/design-system/tokens', () => ({
  colors: {},
}))

import Select from '../Select'

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('Select', () => {
  test('renders with placeholder', () => {
    render(<Select options={OPTIONS} id="sel" />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders label when provided', () => {
    render(<Select options={OPTIONS} id="sel" label="Choisir" />)
    expect(screen.getByText('Choisir')).toBeInTheDocument()
  })

  test('shows required asterisk', () => {
    render(<Select options={OPTIONS} id="sel" label="Champ" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  test('renders all options', () => {
    render(<Select options={OPTIONS} id="sel" />)
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument()
  })

  test('shows error message', () => {
    render(<Select options={OPTIONS} id="sel" error="Champ requis" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Champ requis')
  })

  test('shows helper text when no error', () => {
    render(<Select options={OPTIONS} id="sel" helperText="Aide ici" />)
    expect(screen.getByText('Aide ici')).toBeInTheDocument()
  })

  test('is disabled when disabled=true', () => {
    render(<Select options={OPTIONS} id="sel" disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  test('renders chevron icon', () => {
    render(<Select options={OPTIONS} id="sel" />)
    expect(screen.getByTestId('chevron')).toBeInTheDocument()
  })
})
