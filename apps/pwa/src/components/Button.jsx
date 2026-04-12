import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { buttonHover, buttonTap } from '@/design-system/animations'

/**
 * Button Component — Design System
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'ghost' | 'danger' — Style du bouton
 * - isLoading: boolean — État de chargement
 * - disabled: boolean — État désactivé
 * - children: ReactNode — Contenu du bouton
 * - className: string — Classes additionnelles
 * - ...rest: ButtonHTMLAttributes — Props HTML button natives
 */
const Button = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-cta hover:bg-cta-hover text-white font-semibold shadow-amber-md hover:shadow-amber-lg active:shadow-amber-sm',
      secondary:
        'bg-stone-200 hover:bg-stone-300 text-text-primary font-semibold border border-border-medium/70 shadow-xs hover:shadow-sm',
      ghost:
        'bg-transparent hover:bg-primary-pale/80 text-primary font-medium border border-transparent hover:border-primary/15',
      danger:
        'bg-error hover:bg-red-700 text-white font-semibold shadow-sm hover:shadow-md',
    }

    const baseStyles = `
      rounded-full
      transition-[color,background-color,box-shadow,border-color] duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-page
      disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
      inline-flex items-center justify-center gap-2
    `
    const sizes = {
      sm: 'px-3.5 py-2 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    const focusRingStyles = {
      primary: 'focus-visible:ring-primary/35',
      secondary: 'focus-visible:ring-stone-400/40',
      ghost: 'focus-visible:ring-primary/30',
      danger: 'focus-visible:ring-error/35',
    }

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !isLoading ? buttonHover : undefined}
        whileTap={!disabled && !isLoading ? buttonTap : undefined}
        className={`
          ${baseStyles}
          ${sizes[size] || sizes.md}
          ${variants[variant]}
          ${focusRingStyles[variant]}
          ${className}
        `}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        {...rest}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {isLoading ? 'Chargement...' : children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
