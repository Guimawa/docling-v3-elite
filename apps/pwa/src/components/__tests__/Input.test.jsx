import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search, Mail } from 'lucide-react'
import Input from '../Input'

describe('Input', () => {
  it('renders input with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows required asterisk when required', () => {
    render(<Input label="Email" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Input id="email" label="Email" error="Email invalide" />)
    expect(screen.getByText('Email invalide')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('displays helper text when no error', () => {
    render(<Input id="email" label="Email" helperText="Format: nom@domaine.com" />)
    expect(screen.getByText('Format: nom@domaine.com')).toBeInTheDocument()
  })

  it('does not show helper text when error is present', () => {
    render(
      <Input
        id="email"
        label="Email"
        error="Email invalide"
        helperText="Format: nom@domaine.com"
      />
    )
    expect(screen.getByText('Email invalide')).toBeInTheDocument()
    expect(screen.queryByText('Format: nom@domaine.com')).not.toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('accepts user input', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Enter text" />)

    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'Hello World')
    expect(input).toHaveValue('Hello World')
  })

  it('calls onChange handler', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'A')
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders with left icon', () => {
    const { container } = render(<Input leftIcon={<Search size={20} />} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with right icon', () => {
    const { container } = render(<Input rightIcon={<Mail size={20} />} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies filled variant styles', () => {
    const { container } = render(<Input variant="filled" />)
    const input = container.querySelector('input')
    expect(input).toHaveClass('bg-bgLight')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('applies additional className', () => {
    const { container } = render(<Input className="custom-input" />)
    const input = container.querySelector('input')
    expect(input).toHaveClass('custom-input')
  })

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    const passwordInput = document.querySelector('input[type="password"]')
    expect(passwordInput).toBeInTheDocument()
  })
})
