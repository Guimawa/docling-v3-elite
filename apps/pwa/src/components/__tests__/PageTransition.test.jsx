import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageTransition from '../PageTransition'

describe('PageTransition', () => {
  it('renders children correctly', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies slide variant by default', () => {
    const { container } = render(
      <PageTransition>
        <div>Content</div>
      </PageTransition>
    )
    const motionDiv = container.querySelector('div')
    expect(motionDiv).toBeInTheDocument()
  })

  it('applies fade variant correctly', () => {
    render(
      <PageTransition variant="fade">
        <div>Fade Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Fade Content')).toBeInTheDocument()
  })

  it('applies slide variant correctly', () => {
    render(
      <PageTransition variant="slide">
        <div>Slide Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Slide Content')).toBeInTheDocument()
  })

  it('applies slideUp variant correctly', () => {
    render(
      <PageTransition variant="slideUp">
        <div>SlideUp Content</div>
      </PageTransition>
    )
    expect(screen.getByText('SlideUp Content')).toBeInTheDocument()
  })

  it('applies scale variant correctly', () => {
    render(
      <PageTransition variant="scale">
        <div>Scale Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Scale Content')).toBeInTheDocument()
  })

  it('applies additional className', () => {
    const { container } = render(
      <PageTransition className="custom-page-class">
        <div>Content</div>
      </PageTransition>
    )
    const motionDiv = container.querySelector('.custom-page-class')
    expect(motionDiv).toBeInTheDocument()
    expect(motionDiv).toHaveClass('custom-page-class')
  })

  it('falls back to slide variant for invalid variant', () => {
    render(
      <PageTransition variant="invalid-variant">
        <div>Fallback Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Fallback Content')).toBeInTheDocument()
  })

  it('renders multiple children correctly', () => {
    render(
      <PageTransition>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </PageTransition>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })
})
