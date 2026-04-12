import { forwardRef, useId } from 'react'

/**
 * Input Component — Text input avec variants et états
 *
 * Props:
 * - label: string — Label du champ
 * - error: string — Message d'erreur
 * - helperText: string — Texte d'aide
 * - required: boolean — Champ requis (affiche *)
 * - variant: 'default' | 'filled' — Style du input
 * - leftIcon: ReactNode — Icône à gauche
 * - rightIcon: ReactNode — Icône à droite
 * - ...rest: InputHTMLAttributes — Props HTML input natives
 */
const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      variant = 'default',
      leftIcon,
      rightIcon,
      className = '',
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const fallbackId = useId()
    const inputId = rest.id || `input-${fallbackId}`
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const baseStyles = `
      w-full px-3.5 py-2.5 rounded-xl
      font-sans text-base
      transition-[color,background-color,border-color,box-shadow] duration-200
      placeholder:text-text-tertiary
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const variantStyles = {
      default: `
        bg-input text-text-primary border border-border/90 shadow-xs
        ${
          error
            ? 'border-error focus-visible:border-error focus-visible:ring-error/25'
            : 'focus-visible:border-primary-medium/50 focus-visible:ring-primary/20'
        }
      `,
      filled: `
        bg-bgLight text-text-primary border-0 ring-1 ring-text-primary/[0.06] shadow-xs
        ${error ? 'focus-visible:ring-2 focus-visible:ring-error/25' : 'focus-visible:ring-2 focus-visible:ring-primary/20'}
      `,
    }

    const iconPadding = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : ''

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary tracking-tight">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${variantStyles[variant]} ${iconPadding} ${className}`}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            {...rest}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <span id={errorId} className="text-xs text-error" role="alert">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span id={helperId} className="text-xs text-text-tertiary">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
