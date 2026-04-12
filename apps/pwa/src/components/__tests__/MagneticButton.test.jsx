import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MagneticButton from '../MagneticButton'

// Mock framer-motion hooks
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    useMotionValue: vi.fn(() => ({
      set: vi.fn(),
      get: vi.fn(() => 0)
    })),
    useSpring: vi.fn((value) => value)
  }
})

describe('MagneticButton', () => {
  it('renders children correctly', () => {
    render(
      <MagneticButton>
        <button>Click me</button>
      </MagneticButton>
    )
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <MagneticButton onClick={handleClick}>
        <button>Click</button>
      </MagneticButton>
    )

    await user.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies additional className', () => {
    const { container } = render(
      <MagneticButton className="custom-magnetic-class">
        <button>Magnetic</button>
      </MagneticButton>
    )
    const motionDiv = container.querySelector('.custom-magnetic-class')
    expect(motionDiv).toBeInTheDocument()
    expect(motionDiv).toHaveClass('custom-magnetic-class')
  })

  it('forwards additional props', () => {
    render(
      <MagneticButton data-testid="magnetic-wrapper" aria-label="Magnetic wrapper">
        <button>Button</button>
      </MagneticButton>
    )
    const wrapper = screen.getByTestId('magnetic-wrapper')
    expect(wrapper).toHaveAttribute('aria-label', 'Magnetic wrapper')
  })

  it('accepts custom strength prop', () => {
    render(
      <MagneticButton strength={0.5}>
        <button>Strong Magnetic</button>
      </MagneticButton>
    )
    expect(screen.getByText('Strong Magnetic')).toBeInTheDocument()
  })

  it('accepts custom distance prop', () => {
    render(
      <MagneticButton distance={200}>
        <button>Far Magnetic</button>
      </MagneticButton>
    )
    expect(screen.getByText('Far Magnetic')).toBeInTheDocument()
  })

  it('handles mouse move event', () => {
    const { container } = render(
      <MagneticButton>
        <button>Hover me</button>
      </MagneticButton>
    )
    const wrapper = container.firstChild

    fireEvent.mouseMove(wrapper, {
      clientX: 100,
      clientY: 100
    })

    expect(wrapper).toBeInTheDocument()
  })

  it('handles mouse leave event', () => {
    const { container } = render(
      <MagneticButton>
        <button>Leave me</button>
      </MagneticButton>
    )
    const wrapper = container.firstChild

    fireEvent.mouseLeave(wrapper)
    expect(wrapper).toBeInTheDocument()
  })

  it('renders complex children correctly', () => {
    render(
      <MagneticButton>
        <div>
          <span>Nested</span>
          <button>Content</button>
        </div>
      </MagneticButton>
    )
    expect(screen.getByText('Nested')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('has inline-block className by default', () => {
    const { container } = render(
      <MagneticButton>
        <button>Button</button>
      </MagneticButton>
    )
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('inline-block')
  })
})
