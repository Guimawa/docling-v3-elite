import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Card, { CardHeader, CardFooter } from '../Card'

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.firstChild
    expect(card).toHaveClass('bg-bgLight')
  })

  it('applies bordered variant', () => {
    const { container } = render(<Card variant="bordered">Content</Card>)
    const card = container.firstChild
    expect(card).toHaveClass('border')
  })

  it('applies correct padding styles', () => {
    const { container: container1 } = render(<Card padding="none">None</Card>)
    expect(container1.firstChild).toHaveClass('p-0')

    const { container: container2 } = render(<Card padding="sm">Small</Card>)
    expect(container2.firstChild).toHaveClass('p-3')

    const { container: container3 } = render(<Card padding="md">Medium</Card>)
    expect(container3.firstChild).toHaveClass('p-4')

    const { container: container4 } = render(<Card padding="lg">Large</Card>)
    expect(container4.firstChild).toHaveClass('p-6')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}>Clickable card</Card>)

    await user.click(screen.getByText('Clickable card'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('handles keyboard navigation when clickable', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}>Clickable</Card>)

    const card = screen.getByRole('button')
    card.focus()
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalled()
  })

  it('has cursor-pointer when clickable', () => {
    const { container } = render(<Card onClick={() => {}}>Click</Card>)
    expect(container.firstChild).toHaveClass('cursor-pointer')
  })

  it('has cursor-pointer when hover is enabled', () => {
    const { container } = render(<Card hover>Hover</Card>)
    expect(container.firstChild).toHaveClass('cursor-pointer')
  })

  it('has correct role and tabIndex when clickable', () => {
    const { container } = render(<Card onClick={() => {}}>Click</Card>)
    const card = container.firstChild
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  it('applies additional className', () => {
    const { container } = render(<Card className="custom-card">Content</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })
})

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="Card Title" />)
    expect(screen.getByText('Card Title')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />)
    expect(screen.getByText('Subtitle text')).toBeInTheDocument()
  })

  it('renders action element', () => {
    render(
      <CardHeader
        title="Title"
        action={<button>Action</button>}
      />
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  it('renders children', () => {
    render(
      <CardFooter>
        <button>Cancel</button>
        <button>Save</button>
      </CardFooter>
    )
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('applies border-top class', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>)
    expect(container.firstChild).toHaveClass('border-t')
  })
})
