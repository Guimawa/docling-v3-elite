import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScrollReveal from '../ScrollReveal'

// Mock framer-motion useInView
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    useInView: vi.fn(() => true) // Par défaut, l'élément est visible
  }
})

describe('ScrollReveal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children correctly', () => {
    render(
      <ScrollReveal>
        <div>Test Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies fadeIn variant by default', () => {
    render(
      <ScrollReveal>
        <div>Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies fadeIn variant correctly', () => {
    render(
      <ScrollReveal variant="fadeIn">
        <div>Fade Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Fade Content')).toBeInTheDocument()
  })

  it('applies slideUp variant correctly', () => {
    render(
      <ScrollReveal variant="slideUp">
        <div>SlideUp Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('SlideUp Content')).toBeInTheDocument()
  })

  it('applies slideLeft variant correctly', () => {
    render(
      <ScrollReveal variant="slideLeft">
        <div>SlideLeft Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('SlideLeft Content')).toBeInTheDocument()
  })

  it('applies slideRight variant correctly', () => {
    render(
      <ScrollReveal variant="slideRight">
        <div>SlideRight Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('SlideRight Content')).toBeInTheDocument()
  })

  it('applies scale variant correctly', () => {
    render(
      <ScrollReveal variant="scale">
        <div>Scale Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Scale Content')).toBeInTheDocument()
  })

  it('applies additional className', () => {
    const { container } = render(
      <ScrollReveal className="custom-reveal-class">
        <div>Content</div>
      </ScrollReveal>
    )
    const motionDiv = container.querySelector('.custom-reveal-class')
    expect(motionDiv).toBeInTheDocument()
    expect(motionDiv).toHaveClass('custom-reveal-class')
  })

  it('falls back to fadeIn variant for invalid variant', () => {
    render(
      <ScrollReveal variant="invalid-variant">
        <div>Fallback Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Fallback Content')).toBeInTheDocument()
  })

  it('renders multiple children correctly', () => {
    render(
      <ScrollReveal>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('accepts delay prop', () => {
    render(
      <ScrollReveal delay={0.5}>
        <div>Delayed Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Delayed Content')).toBeInTheDocument()
  })

  it('accepts once prop', () => {
    render(
      <ScrollReveal once={false}>
        <div>Repeating Content</div>
      </ScrollReveal>
    )
    expect(screen.getByText('Repeating Content')).toBeInTheDocument()
  })
})
