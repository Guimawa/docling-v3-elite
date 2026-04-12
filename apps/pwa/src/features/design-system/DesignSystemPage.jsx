import { useId } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import Input from '@/components/Input'
import Select from '@/components/Select'

/**
 * Page interne (dev) — aperçu des primitives UI Docling.
 * Route : /design-system (voir App.jsx, import.meta.env.DEV uniquement).
 */
export default function DesignSystemPage() {
  const sampleId = useId()
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="font-heading text-2xl text-text-primary">Design system — aperçu</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Cette page n&apos;est disponible qu&apos;en développement. Elle liste les composants maison et les états de base.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby={`${sampleId}-buttons`}>
        <h2 id={`${sampleId}-buttons`} className="text-sm font-semibold text-text-primary">
          Boutons
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button">Primaire</Button>
          <Button type="button" variant="secondary">
            Secondaire
          </Button>
          <Button type="button" variant="ghost">
            Ghost
          </Button>
          <Button type="button" variant="danger">
            Danger
          </Button>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby={`${sampleId}-badges`}>
        <h2 id={`${sampleId}-badges`} className="text-sm font-semibold text-text-primary">
          Badges
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Succès</Badge>
          <Badge variant="warning">Attention</Badge>
          <Badge variant="error">Erreur</Badge>
          <Badge variant="neutral">Neutre</Badge>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby={`${sampleId}-form`}>
        <h2 id={`${sampleId}-form`} className="text-sm font-semibold text-text-primary">
          Champs
        </h2>
        <Card className="space-y-4 p-4">
          <Input id={`${sampleId}-in`} label="Champ texte" placeholder="Placeholder" />
          <Select
            id={`${sampleId}-sel`}
            label="Liste"
            value="a"
            onChange={() => {}}
            options={[
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
            ]}
          />
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby={`${sampleId}-motion`}>
        <h2 id={`${sampleId}-motion`} className="text-sm font-semibold text-text-primary">
          Mouvement & accessibilité
        </h2>
        <p className="text-xs text-text-secondary">
          Les transitions de page utilisent <code className="rounded bg-page px-1">PageTransition</code> avec{' '}
          <code className="rounded bg-page px-1">useReducedMotion()</code> (Framer) : si l’utilisateur a activé «
          Réduire les animations » au niveau OS, les entrées sont instantanées. Les utilitaires Tailwind{' '}
          <code className="rounded bg-page px-1">motion-safe:</code> / <code className="rounded bg-page px-1">motion-reduce:</code>{' '}
          complètent sur le marketing et la barre de navigation.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-elevated/50 p-4 text-xs text-text-tertiary">
        <p>
          <strong className="text-text-secondary">Thème (décision produit) :</strong> interface principalement claire
          « Obsidian Amber », sidebar plus sombre pour le contraste. Pas de thème sombre global sur toute l’app à ce
          jour — choix assumé pour limiter la dette de maintenance des tokens ; une évolution ultérieure passera par{' '}
          <code className="rounded bg-page px-1">data-theme</code> et variables CSS partagées.
        </p>
      </section>
    </div>
  )
}
