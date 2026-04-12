import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Select Component — Dropdown select avec variants
 *
 * Props:
 * - label: string — Label du champ
 * - error: string — Message d'erreur
 * - helperText: string — Texte d'aide
 * - required: boolean — Champ requis
 * - options: Array<{value: string, label: string}> — Options du select
 * - placeholder: string — Texte placeholder
 * - ...rest: SelectHTMLAttributes — Props HTML select natives
 */
const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      options = [],
      placeholder = 'Sélectionner...',
      className = '',
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const fallbackId = useId()
    const selectId = rest.id || `select-${fallbackId}`
    const errorId = `${selectId}-error`
    const helperId = `${selectId}-helper`

    const baseStyles = `
      w-full px-3 py-2 pr-10 rounded-md
      font-sans text-base
      appearance-none cursor-pointer
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const variantStyles = `
      bg-input text-text-primary border
      ${error ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'}
    `

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${baseStyles} ${variantStyles} ${className}`}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
            <ChevronDown size={20} />
          </div>
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

Select.displayName = 'Select'

export default Select
