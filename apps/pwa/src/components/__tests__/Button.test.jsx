import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant class by default', () => {
    const { container } = render(<Button>Primary</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-cta')
  })

  it('applies correct variant classes', () => {
    const { container: container1 } = render(<Button variant="primary">Primary</Button>)
    expect(container1.querySelector('button')).toHaveClass('bg-cta')

    const { container: container2 } = render(<Button variant="secondary">Secondary</Button>)
    expect(container2.querySelector('button')).toHaveClass('bg-stone-200')

    const { container: container3 } = render(<Button variant="ghost">Ghost</Button>)
    expect(container3.querySelector('button')).toHaveClass('bg-transparent')

    const { container: container4 } = render(<Button variant="danger">Danger</Button>)
    expect(container4.querySelector('button')).toHaveClass('bg-error')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    await user.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('disables button when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    )

    await user.click(screen.getByText('Disabled'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('does not call onClick when loading', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <Button isLoading onClick={handleClick}>
        Loading
      </Button>
    )

    await user.click(screen.getByText('Chargement...'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies additional className', () => {
    const { container } = render(
      <Button className="custom-class">Button</Button>
    )
    const button = container.querySelector('button')
    expect(button).toHaveClass('custom-class')
  })

  it('forwards additional props to button element', () => {
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>
    )
    const button = screen.getByTestId('submit-btn')
    expect(button).toHaveAttribute('type', 'submit')
  })
})
