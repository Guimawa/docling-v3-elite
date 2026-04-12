/**
 * Badge Component — Labels et statuts
 *
 * Props:
 * - children: ReactNode — Contenu du badge
 * - variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' — Couleur sémantique
 * - size: 'sm' | 'md' | 'lg' — Taille du badge
 * - dot: boolean — Affiche un point à gauche
 * - className: string — Classes additionnelles
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantStyles = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    neutral: 'bg-primary/10 text-primary border-primary/20',
    accent: 'bg-primary/15 text-primary border-primary/20',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  const dotColorStyles = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
    neutral: 'bg-primary',
    accent: 'bg-primary',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full border font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColorStyles[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

/**
 * StatusBadge — Badge avec icône et texte
 */
export function StatusBadge({ icon: Icon, label, variant = 'neutral', ...props }) {
  return (
    <Badge variant={variant} {...props}>
      {Icon && <Icon size={12} />}
      {label}
    </Badge>
  )
}
