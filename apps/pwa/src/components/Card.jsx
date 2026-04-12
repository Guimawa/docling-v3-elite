import { motion } from 'framer-motion'
import { cardHover } from '@/design-system/animations'

/**
 * Card Component — Container avec élévation
 *
 * Props:
 * - children: ReactNode — Contenu de la card
 * - hover: boolean — Active animation hover
 * - onClick: function — Handler click (rend card clickable)
 * - variant: 'default' | 'bordered' | 'elevated' — Style de la card
 * - padding: 'none' | 'sm' | 'md' | 'lg' — Padding interne
 * - className: string — Classes additionnelles
 */
export default function Card({
  children,
  as,
  hover = false,
  onClick,
  variant = 'default',
  padding = 'md',
  className = '',
  whileHover,
  whileTap,
  initial,
  animate,
  exit,
  transition,
  variants,
  layout,
  ...rest
}) {
  const isClickable = !!onClick || hover

  const baseStyles =
    'bg-bgLight rounded-2xl transition-all duration-200 ring-1 ring-text-primary/[0.05] hover-lift'

  const variantStyles = {
    default: 'border-0 shadow-sm',
    bordered: 'border border-border/90 shadow-sm',
    elevated: 'border-0',
    warning: 'border border-warning/35 bg-warning-bg/50 shadow-sm',
  }

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  const shadowStyle =
    variant === 'elevated' ? '0 20px 50px -12px rgba(26, 21, 16, 0.12)' : undefined

  const hasMotionProps = Boolean(
    whileHover || whileTap || initial || animate || exit || transition || variants || layout
  )
  const Component = as ?? (hover || hasMotionProps ? motion.div : 'div')
  const isDomElement = typeof Component === 'string'

  const computedWhileHover = whileHover ?? (hover ? cardHover : undefined)
  const motionProps = isDomElement
    ? {}
    : {
        whileHover: computedWhileHover,
        whileTap,
        initial,
        animate,
        exit,
        transition,
        variants,
        layout,
      }

  const nativeInteractiveTags = new Set(['button', 'a', 'input', 'select', 'textarea'])
  const needsButtonSemantics = onClick && (!isDomElement || !nativeInteractiveTags.has(Component))

  return (
    <Component
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${isClickable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-page' : ''}
        ${className}
      `}
      style={shadowStyle ? { boxShadow: shadowStyle } : undefined}
      {...motionProps}
      onClick={onClick}
      role={needsButtonSemantics ? 'button' : undefined}
      tabIndex={needsButtonSemantics ? 0 : undefined}
      onKeyDown={
        needsButtonSemantics
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(e)
              }
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </Component>
  )
}

/**
 * CardHeader — En-tête de card avec titre et actions
 */
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex-1">
        {title && (
          <h3 className="font-heading text-lg font-semibold tracking-tight text-text-primary">{title}</h3>
        )}
        {subtitle && <p className="text-sm text-text-secondary mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

/**
 * CardFooter — Footer de card avec actions
 */
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-2 mt-4 pt-4 border-t border-border/80 ${className}`}>
      {children}
    </div>
  )
}
