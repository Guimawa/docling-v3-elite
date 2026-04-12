# PATTERNS DE CORRECTIONS — RÉFÉRENCE RAPIDE

## 🎯 Usage
Ce fichier est une référence rapide pour les agents. Chaque pattern est
un "recette" testée et prête à appliquer.

---

## PATTERN 1 — Remplacer une couleur hardcodée par un token

```tsx
// Chercher et remplacer
// text-[#2563EB]  → text-[var(--color-primary)]
// bg-[#2563EB]    → bg-[var(--color-primary)]
// border-[#2563EB] → border-[var(--color-primary)]

// Pour les couleurs grises texte fréquentes :
// text-gray-900 → text-[var(--color-text-primary)]
// text-gray-500 → text-[var(--color-text-secondary)]
// text-gray-400 → text-[var(--color-text-tertiary)]
// text-gray-300 → ⚠️ insuffisant pour texte normal → remplacer par text-gray-500 min.
```

---

## PATTERN 2 — Ajouter className extensible à un composant

```tsx
// ❌ AVANT — className non extensible
function Card({ children }: { children: React.ReactNode }) {
  return <div className="p-4 rounded-lg border">{children}</div>
}

// ✅ APRÈS — extensible
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={['p-4 rounded-lg border', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
```

---

## PATTERN 3 — Wrapper de liste avec états

```tsx
// Pattern universel pour toute liste asynchrone
interface DataListProps<T> {
  data:       T[] | undefined
  isLoading:  boolean
  error:      Error | null
  renderItem: (item: T) => React.ReactNode
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  skeletonCount?: number
}

function DataList<T extends { id: string | number }>({
  data, isLoading, error, renderItem,
  emptyTitle, emptyDescription, emptyAction,
  skeletonCount = 3
}: DataListProps<T>) {

  if (isLoading) return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement...">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )

  if (error) return (
    <div role="alert" className="p-4 rounded-xl bg-[var(--color-error-light)]">
      <p className="font-medium text-[var(--color-error-text)]">
        Impossible de charger les données
      </p>
      <p className="text-sm text-[var(--color-error-text)]/80 mt-1">{error.message}</p>
    </div>
  )

  if (!data || data.length === 0) return (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      action={emptyAction}
    />
  )

  return (
    <ul role="list" className="space-y-3">
      {data.map(item => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}
```

---

## PATTERN 4 — Hook useAsync pour les opérations async

```tsx
// Remplacer les patterns fetch/useState manuels par ce hook
import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data:      T | null
  isLoading: boolean
  error:     Error | null
}

export function useAsync<T>(
  asyncFn: () => Promise<T>
): AsyncState<T> & { execute: () => Promise<void>; reset: () => void } {

  const [state, setState] = useState<AsyncState<T>>({
    data: null, isLoading: false, error: null
  })

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await asyncFn()
      setState({ data, isLoading: false, error: null })
    } catch (error) {
      setState({ data: null, isLoading: false, error: error as Error })
    }
  }, [asyncFn])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}
```

---

## PATTERN 5 — Responsive sans media queries hacky

```css
/* Grille responsive qui s'adapte automatiquement */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: var(--space-4);
}

/* Stack → Row selon l'espace disponible */
.flex-wrap-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.flex-wrap-row > * {
  flex: 1 1 200px;   /* grandit mais jamais moins de 200px */
}
```

---

## PATTERN 6 — Formulaire accessible complet

```tsx
// Pattern complet pour un formulaire de création
function CreateForm({ onSubmit }: { onSubmit: (data: FormData) => Promise<void> }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    // validation...

    try {
      await onSubmit(formData)
      toast.success('Enregistré avec succès !')
    } catch (err) {
      toast.error('Erreur : ' + (err as Error).message)
      setErrors({ server: (err as Error).message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Formulaire de création"
    >
      {errors.server && (
        <div role="alert" className="p-3 rounded-lg bg-[var(--color-error-light)] text-[var(--color-error-text)] text-sm mb-4">
          {errors.server}
        </div>
      )}

      <Input
        name="name"
        label="Nom"
        required
        error={errors.name}
        aria-required="true"
      />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="ghost">Annuler</Button>
        <Button type="submit" loading={isSubmitting}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
```

---

## PATTERN 7 — Dark mode cohérent

```tsx
// Hook pour détecter le mode sombre
export function useColorScheme() {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setScheme(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return scheme
}

// Pour un toggle manuel dark/light :
// Ajouter/retirer classe 'dark' sur <html>
// Puis utiliser .dark:... dans Tailwind
// OU utiliser [data-theme="dark"] et les variables CSS du design system
```

---

## PATTERN 8 — Error Boundary UI

```tsx
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
    // optionnel : envoyer à un service de monitoring (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <p className="text-4xl mb-4" aria-hidden>⚠️</p>
          <h2 className="font-semibold text-[var(--color-text-primary)]">
            Une erreur est survenue
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 text-sm text-[var(--color-text-brand)] underline"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```
