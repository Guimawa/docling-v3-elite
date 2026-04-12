import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import Badge, { StatusBadge } from '../Badge'

describe('Badge', () => {
  test('renders children', () => {
    render(<Badge>Label</Badge>)
    expect(screen.getByText('Label')).toBeInTheDocument()
  })

  test('applies neutral variant by default', () => {
    const { container } = render(<Badge>Neutral</Badge>)
    expect(container.firstChild).toHaveClass('bg-primary/10')
  })

  test('applies success variant', () => {
    const { container } = render(<Badge variant="success">OK</Badge>)
    expect(container.firstChild).toHaveClass('bg-success/10')
  })

  test('renders dot when dot=true', () => {
    const { container } = render(<Badge dot>With dot</Badge>)
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  test('renders label', () => {
    render(<StatusBadge label="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  test('renders icon when provided', () => {
    const Icon = () => <svg data-testid="test-icon" />
    render(<StatusBadge icon={Icon} label="Active" />)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  test('applies variant to underlying Badge', () => {
    const { container } = render(<StatusBadge label="Error" variant="error" />)
    expect(container.firstChild).toHaveClass('bg-error/10')
  })
})
