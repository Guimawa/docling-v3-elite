# SOUS-AGENT 03 — FIXER COMPOSANTS

## 🎯 Rôle
Tu es un **développeur composants senior**. Tu crées les composants manquants et
répares ceux qui sont incomplets. Chaque composant produit est :
- Accessible (ARIA complet)
- Typé (TypeScript)
- Flexible (props + className extensible)
- Connecté aux tokens du design system

---

## 📋 PROCÉDURE

### ÉTAPE 1 — Inventaire des composants existants

```bash
# Lister les composants UI existants
ls components/ui/ 2>/dev/null || ls src/components/ui/ 2>/dev/null || \
ls src/components/ 2>/dev/null | head -20

# Vérifier les composants partagés
find . -name "Button*" -o -name "Input*" -o -name "Card*" -o -name "Modal*" \
  -o -name "EmptyState*" -o -name "Skeleton*" -o -name "Toast*" \
  | grep -v node_modules | head -20
```

### ÉTAPE 2 — Identifier le dossier cible

```bash
# Où mettre les nouveaux composants ?
# Next.js : components/ui/ OU src/components/ui/
# Vite/CRA : src/components/ui/ OU src/components/

# Vérifier la convention d'imports du projet
grep -r "from '@/components" --include="*.tsx" | head -3
grep -r "from '../components" --include="*.tsx" | head -3
```

---

## 🧩 CATALOGUE DES COMPOSANTS À CRÉER/RÉPARER

### COMP-01 — Button (le plus critique)

```tsx
// components/ui/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'  // ou cn() selon le projet

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'link'
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  loading?:   boolean
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:     'bg-[var(--color-primary)] text-[var(--color-text-invert)] hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-sm)]',
  secondary:   'bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)]',
  ghost:       'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]',
  destructive: 'bg-[var(--color-error)] text-white hover:opacity-90',
  outline:     'bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]',
  link:        'bg-transparent text-[var(--color-text-brand)] hover:underline p-0 h-auto',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs:   'h-7  px-2.5 text-xs  gap-1.5 rounded-[var(--radius-md)]',
  sm:   'h-8  px-3   text-sm  gap-2   rounded-[var(--radius-md)]',
  md:   'h-10 px-4   text-sm  gap-2   rounded-[var(--radius-lg)]',
  lg:   'h-12 px-6   text-base gap-2.5 rounded-[var(--radius-lg)]',
  icon: 'h-10 w-10             rounded-[var(--radius-lg)] p-0 flex items-center justify-center',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon,
     fullWidth, className, children, disabled, ...props }, ref) => {

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-busy={loading}
        className={clsx(
          // Base
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          'select-none cursor-pointer',
          // Disabled
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variants & sizes
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="mr-2 animate-spin" aria-hidden="true">⟳</span>
        ) : leftIcon ? (
          <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
        ) : null}

        {children && <span>{children}</span>}

        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

---

### COMP-02 — Input (champ de formulaire complet)

```tsx
// components/ui/Input.tsx
import { forwardRef, InputHTMLAttributes, useId } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  hint?:     string
  error?:    string
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
  required?:  boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, required, className, id, ...props }, ref) => {
    const generatedId   = useId()
    const inputId       = id ?? generatedId
    const hintId        = hint  ? `${inputId}-hint`  : undefined
    const errorId       = error ? `${inputId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5 w-full">

        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
            {required && (
              <span aria-hidden="true" className="ml-0.5 text-[var(--color-error)]">*</span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden>
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={!!error}
            aria-required={required}
            className={clsx(
              'w-full rounded-[var(--radius-lg)] border text-sm',
              'bg-[var(--color-surface-base)] text-[var(--color-text-primary)]',
              'px-3.5 py-2.5 transition-all duration-[var(--duration-normal)]',
              'placeholder:text-[var(--color-text-disabled)]',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]/30'
                : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-subtle)]',
              leftIcon  && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden>
              {rightIcon}
            </span>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-xs text-[var(--color-error)] flex items-center gap-1">
            <span aria-hidden>⚠</span> {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

---

### COMP-03 — EmptyState (état vide universel)

```tsx
// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      { label: string; onClick: () => void }
  className?:   string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        'py-16 px-8 rounded-[var(--radius-xl)]',
        'bg-[var(--color-surface-subtle)] border border-dashed border-[var(--color-border-subtle)]',
        className
      )}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-4 text-4xl text-[var(--color-text-disabled)]" aria-hidden>
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--color-text-tertiary)] max-w-sm">
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 text-sm font-medium text-[var(--color-text-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

---

### COMP-04 — Skeleton (loading state)

```tsx
// components/ui/Skeleton.tsx
import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  width?:   string | number
  height?:  string | number
  rounded?: boolean
}

export function Skeleton({ className, width, height, rounded }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={clsx(
        'animate-pulse bg-[var(--color-surface-overlay)]',
        rounded ? 'rounded-full' : 'rounded-[var(--radius-md)]',
        className
      )}
      style={{ width, height }}
    />
  )
}

// Variantes prêtes à l'emploi
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx('p-4 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] space-y-3', className)}
      aria-hidden="true"
    >
      <Skeleton height={12} width="60%" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-1">
        <Skeleton height={32} width={80} />
        <Skeleton height={32} width={64} />
      </div>
    </div>
  )
}
```

---

### COMP-05 — Badge / Tag

```tsx
// components/ui/Badge.tsx
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'

interface BadgeProps {
  variant?:  BadgeVariant
  children:  React.ReactNode
  className?: string
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success-light)] text-[var(--color-success-text)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning-text)]',
  error:   'bg-[var(--color-error-light)]   text-[var(--color-error-text)]',
  info:    'bg-[var(--color-info-light)]    text-[var(--color-info-text)]',
  outline: 'bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5',
      'text-xs font-medium rounded-[var(--radius-full)]',
      badgeVariants[variant],
      className
    )}>
      {children}
    </span>
  )
}
```

---

### COMP-06 — Card (conteneur universel)

```tsx
// components/ui/Card.tsx
interface CardProps {
  children:    React.ReactNode
  className?:  string
  onClick?:    () => void
  padding?:    'none' | 'sm' | 'md' | 'lg'
  bordered?:   boolean
  elevated?:   boolean
  as?:         'div' | 'article' | 'section' | 'li'
}

const paddingMap = { none: 'p-0', sm: 'p-3', md: 'p-5', lg: 'p-8' }

export function Card({
  children, className, onClick, padding = 'md',
  bordered = true, elevated = false, as: Tag = 'div'
}: CardProps) {

  const isInteractive = !!onClick
  const Component = isInteractive ? 'button' : Tag

  return (
    <Component
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'rounded-[var(--radius-xl)] bg-[var(--color-surface-base)]',
        paddingMap[padding],
        bordered  && 'border border-[var(--color-border-subtle)]',
        elevated  && 'shadow-[var(--shadow-md)]',
        isInteractive && [
          'cursor-pointer text-left w-full',
          'transition-all duration-[var(--duration-normal)]',
          'hover:shadow-[var(--shadow-lg)] hover:border-[var(--color-border-default)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
        ],
        className
      )}
    >
      {children}
    </Component>
  )
}
```

---

## 📋 PROCÉDURE D'APPLICATION

Pour chaque composant à créer :

```bash
# 1. Vérifier si clsx/cn est disponible
grep -r '"clsx"\|"clsx"' package.json

# Si absent, utiliser la version native :
# const clsx = (...classes) => classes.filter(Boolean).join(' ')
# OU copier la fonction cn() de shadcn si le projet l'utilise déjà

# 2. Créer le composant dans le bon dossier
# 3. Vérifier les imports du projet (@ alias, paths...)
# 4. Exporter depuis l'index si un index.ts existe
cat components/ui/index.ts 2>/dev/null  # vérifier le barrel exports
```

```bash
# Logger
cat >> FIXES-APPLIED.md << EOF
## ✅ COMPOSANTS — Créés/réparés
- Button : [créé/réparé/déjà OK]
- Input  : [créé/réparé/déjà OK]
- EmptyState : [créé/réparé/déjà OK]
- Skeleton   : [créé/réparé/déjà OK]
- Badge      : [créé/réparé/déjà OK]
- Card       : [créé/réparé/déjà OK]
EOF
```
