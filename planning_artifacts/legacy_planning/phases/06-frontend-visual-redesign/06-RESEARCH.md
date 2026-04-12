# Phase 6: Frontend Visual Redesign - Research

**Researched:** 2026-03-27
**Domain:** React PWA visual redesign — Tailwind v3 custom tokens, Framer Motion, design system migration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Refonte UI/design system — toutes les pages ont un design cohérent et moderne | Inventory complet des fichiers, mapping token clair, guide migration sans régression |
</phase_requirements>

---

## Summary

Le frontend Docling est actuellement en thème dark "brut" (fond `#121212` / `slate-*` / `emerald-*`) avec des tokens light beige définis dans `tailwind.config.js` et `tokens.js` (fond `#FAF5F2`, texte `#1A1A1A`). La divergence est totale : les composants maison utilisent les tokens Tailwind custom (`bg-cta`, `bg-primary`, `bg-bgLight`), mais les pages utilisent directement des classes `slate-*`/`emerald-*` hardcodées. Le travail de cette phase est de les réaligner tous sur la palette dark décidée (`#111827`/`#1F2937`/`#E05C3A`).

La contrainte critique est la régression de tests. Les tests vitest vérifient des classes CSS précises sur les composants (`bg-cta`, `bg-primary`, `bg-bgLight`, `bg-success/10`) — ces tokens existants doivent être **conservés ou aliasés**, pas renommés. La migration se fait en deux couches : d'abord les valeurs des tokens (dans `tailwind.config.js`), puis les pages qui utilisent des classes hardcodées. Les composants maison eux-mêmes n'ont besoin que de mises à jour mineures (leur API de classes reste stable).

**Primary recommendation:** Migrer d'abord `tailwind.config.js` (remap valeurs dark sans changer les noms de tokens), puis appliquer le patron de page commun page par page dans l'ordre : Navbar → composants partagés (Button/Card/Input/Select/Badge) → ScanPage → ValidationPage → CataloguePage → DevisPage → HistoryPage → SettingsPage.

---

## Standard Stack

### Core (déjà installé — aucune nouvelle dépendance)

| Library | Version installée | Purpose | Note |
|---------|------------------|---------|------|
| tailwindcss | 3.4.17 | Styling utilitaire | Déjà configuré avec tokens custom |
| framer-motion | ^12.34.3 | Animations | Variants existants dans `animations.js` |
| lucide-react | ^0.575.0 | Icônes | Déjà installé, toutes les icônes requises disponibles |
| react | ^19.2.4 | UI | React 19 stable |

**Aucune nouvelle installation requise.** shadcn non initialisé et hors scope (décision verrouillée).

---

## Architecture Patterns

### Inventory complet des fichiers à modifier

**Couche 1 — Tokens (1 fichier critique)**

| Fichier | Nature des changements | Impact tests |
|---------|----------------------|--------------|
| `apps/pwa/tailwind.config.js` | Remapper `bg-primary`, `bg-secondary`, `bg-card`, `bg-input`, `border`, `border-medium`, `text-primary`, `text-secondary`, `text-tertiary`, `text-disabled` vers valeurs dark | AUCUN — les noms de classe restent identiques |
| `apps/pwa/src/design-system/tokens.js` | Sync des valeurs JS avec tailwind.config.js (document only — pas consommé par Tailwind directement) | Aucun |
| `apps/pwa/src/index.css` | Changer `background-color: #020617` en `#111827`, `color: #f1f5f9` en `#F9FAFB` | Aucun |

**Couche 2 — Composants partagés (6 fichiers)**

| Fichier | Classes à modifier | Impact tests |
|---------|-------------------|--------------|
| `src/components/Navbar.jsx` | `slate-900/70` → `gray-800/70`, `slate-700/50` → `gray-700/50`, `emerald-400` → `[#E05C3A]`, `slate-500` → `gray-500`, `slate-300` → `gray-300` | Tests Navbar vérifient aria/testid/text seulement — PAS les classes CSS |
| `src/components/Button.jsx` | Ajout `bg-gray-700` pour variant `secondary` (remplace `bg-primary`), ajout dark focus ring | Tests vérifient `bg-cta`, `bg-primary`, `bg-transparent`, `bg-error` — AUCUN changement de token possible |
| `src/components/Card.jsx` | `bg-bgLight` → `bg-gray-800`, correction `CardHeader` classes | Tests vérifient `bg-bgLight` — BREAKING si on change le token name |
| `src/components/Input.jsx` | `bg-white` → `bg-gray-900`, `border-primary/20` → `border-gray-700`, `placeholder:text-slate-400` → `placeholder:text-gray-500`, `bg-bgLight` → `bg-gray-900` (filled) | Tests vérifient `bg-bgLight` sur filled — BREAKING |
| `src/components/Select.jsx` | `bg-white` → `bg-gray-900`, `text-gray-900` → `text-gray-100`, `border-primary/20` → `border-gray-700` | Tests vérifient seulement comportement, pas classes color |
| `src/components/Badge.jsx` | Ajouter variant `accent` (`bg-[#E05C3A]/15 text-[#E05C3A]`), conserver variants existants | Tests vérifient `bg-primary/10`, `bg-success/10`, `bg-error/10` — conservés |

**Couche 3 — Pages (6 fichiers)**

| Fichier | Classes hardcodées à migrer | Complexité |
|---------|---------------------------|------------|
| `src/features/scan/ScanPage.jsx` | `bg-[#121212]` → `bg-[#111827]`, slate/emerald → gray/corail, ajouter page header patron | MEDIUM |
| `src/features/scan/components/UploadZone.jsx` | Classes drag zone → `border-gray-700` + drag-active `border-[#E05C3A]` | MEDIUM |
| `src/features/scan/components/BatchQueue.jsx` | Cards → `bg-gray-800 border-gray-700` | LOW |
| `src/features/scan/components/JobStatusCard.jsx` | Slate → gray | LOW |
| `src/features/validation/ValidationPage.jsx` | Slate/emerald → gray/corail, page header patron | MEDIUM |
| `src/features/catalogue/CataloguePage.jsx` | Slate/emerald → gray/corail, PriceBar, table, page header | HIGH |
| `src/features/catalogue/CompareModal.jsx` | Slate → gray | MEDIUM |
| `src/features/catalogue/EditProductModal.jsx` | Slate → gray | MEDIUM |
| `src/features/devis/DevisPage.jsx` | Slate → gray, page header patron (lecture seule) | LOW |
| `src/features/history/HistoryPage.jsx` | Slate/emerald → gray/corail, page header patron | MEDIUM |
| `src/features/settings/SettingsPage.jsx` | Slate/emerald → gray/corail, page header patron | MEDIUM |
| `src/features/auth/LoginPage.jsx` | Slate/emerald → gray/corail | MEDIUM |
| `src/features/auth/RegisterPage.jsx` | Slate/emerald → gray/corail | LOW |
| `src/shared/ui/EmptyStateIllustration.jsx` | Couleurs → dark | LOW |
| `src/shared/ui/SkeletonCard.jsx` | Couleurs → dark | LOW |

### Patron de page commun (à appliquer sur chaque page)

```jsx
// Source: UI-SPEC.md — Per-Page Layout Contract
export default function XxxPage() {
  return (
    <PageTransition variant="scale">
      <div className="min-h-screen bg-[#111827]">
        {/* Page Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <IconName size={24} className="text-[#E05C3A]" aria-hidden />
            <h1 className="font-heading text-3xl font-semibold text-gray-50">
              Titre de la page
            </h1>
          </div>
          <p className="text-md text-gray-400 ml-9">Sous-titre optionnel</p>
        </div>
        {/* Contenu avec pb-24 pour compenser navbar fixe */}
        <div className="px-5 pb-24">
          {/* contenu */}
        </div>
      </div>
    </PageTransition>
  )
}
```

### Ordre optimal de migration (tokens-first)

```
Wave 0 (prérequis)
└── tailwind.config.js + index.css (tokens dark)

Wave 1 (composants partagés)
├── Navbar.jsx
├── Badge.jsx (conserver tokens, ajouter variant accent)
├── Button.jsx (ne pas changer noms tokens)
├── Card.jsx + tests mis à jour
├── Input.jsx + tests mis à jour
└── Select.jsx

Wave 2 (pages simples)
├── DevisPage.jsx (lecture seule)
├── HistoryPage.jsx
└── SettingsPage.jsx

Wave 3 (pages complexes)
├── ScanPage.jsx + composants scan
├── ValidationPage.jsx
└── CataloguePage.jsx + modaux

Wave 4 (auth + shared UI)
├── LoginPage.jsx
├── RegisterPage.jsx
├── EmptyStateIllustration.jsx
└── SkeletonCard.jsx
```

### Pattern Tailwind v3 — Custom Colors avec tokens

```js
// tailwind.config.js — MIGRATION STRATEGY
// Remapper les valeurs, conserver les NOMS de tokens (évite breaking tests)
colors: {
  // Tokens corail conservés identiques (tests Button en dépendent)
  primary: '#E05C3A',    // Conservé — bg-primary utilisé dans Button.secondary
  cta: '#E05C3A',        // Conservé — bg-cta utilisé dans Button.primary
  'cta-hover': '#C44E2F',
  'cta-active': '#DC4E29',

  // Backgrounds dark — VALEURS remplacées, NOMS conservés
  'bg-primary': '#111827',   // était #FAF5F2 — teste via bg-[#FAF5F2] jamais
  'bg-secondary': '#1F2937', // était #F0EAE5
  'bg-card': '#1F2937',      // était #FFFFFF
  'bg-input': '#111827',     // était #F8F5F2
  // ATTENTION: bg-bgLight n'existe PAS dans tailwind.config actuel
  // Card.test.jsx et Input.test.jsx vérifient 'bg-bgLight' — classe inconnue
  // => Il faut AJOUTER 'bg-bgLight': '#1F2937' ou renommer Card.jsx + update tests

  // Textes dark — NOMS conservés
  'text-primary': '#F9FAFB',   // était #1A1A1A
  'text-secondary': '#9CA3AF', // était #666666
  'text-tertiary': '#6B7280',  // était #888888
  'text-disabled': '#4B5563',  // était #AAAAAA
}
// Source: UI-SPEC.md — Tokens à mettre à jour + codebase audit
```

### Résolution du problème bg-bgLight

```
Card.test.jsx: expect(card).toHaveClass('bg-bgLight')    [BREAKING si on renomme]
Input.test.jsx: expect(input).toHaveClass('bg-bgLight')  [BREAKING si on renomme]

Card.jsx utilise: baseStyles = 'bg-bgLight rounded-lg ...'
Input.jsx utilise: 'bg-bgLight text-gray-900 border-0'

Résolution recommandée:
1. Ajouter dans tailwind.config.js: 'bg-bgLight': '#1F2937'
   (alias vers bg-card dark — même valeur, ancien nom préservé)
2. Mettre à jour les valeurs JSX hardcodées dans Card/Input
3. Tests passent sans modification

Alternativement: mettre à jour Card.jsx + Input.jsx + leurs tests simultanément
(renommer bg-bgLight → bg-gray-800) — acceptable car dans la même PR
```

### Anti-Patterns à éviter

- **Changer les noms de tokens Tailwind custom** : `bg-cta`, `bg-primary`, `bg-success`, `bg-error` sont vérifiés dans les tests — ne pas les renommer
- **Gradients sur les boutons ou fonds** : interdit par UI-SPEC (pas de `gradient-coral-btn`)
- **Utiliser `emerald-*` pour quoi que ce soit** : tout doit migrer vers `[#E05C3A]` ou les tokens gray
- **Ajouter `data-testid` sur de nouveaux éléments visuels** : risque de collision avec les tests E2E Playwright existants
- **Modifier la logique ou les handlers** : refonte visuelle uniquement — ne jamais toucher aux hooks, stores, services

---

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser | Pourquoi |
|----------|------------------|---------|---------|
| Animations d'entrée | Variants custom inline | `animations.js` existant (`fadeIn`, `slideUp`, `staggerContainer`) | Déjà déclaré, varié, testé |
| Icônes | SVG inline | `lucide-react` (déjà installé, `^0.575.0`) | Toutes les icônes requises (Camera, CheckCircle, PackageSearch, FileText, Clock, Settings) présentes |
| Toast/notifications | Système custom | `sonner` (déjà installé) | Déjà mocké dans les tests, intégré |
| Responsive breakpoints | Classes conditionnelles custom | Tailwind `sm:`, `md:` (déjà en place) | Cohérence avec codebase |
| Focus ring | CSS custom | `focus-visible:ring-2 focus-visible:ring-[#E05C3A]/20` (pattern Tailwind standard) | Natif Tailwind v3 |

---

## Common Pitfalls

### Pitfall 1 — Casser les tests CSS par changement de token name
**What goes wrong:** On renomme `bg-bgLight` en `bg-gray-800` dans Card.jsx sans mettre à jour `Card.test.jsx` → 2 tests `toHaveClass` cassés.
**Why it happens:** Les tests composants vérifient les classes CSS exactes, pas les valeurs visuelles.
**How to avoid:** Pour chaque fichier JSX modifié, grep son fichier test correspondant pour `toHaveClass`. Si une classe changée est vérifiée, mettre à jour le test en même temps.
**Warning signs:** Avant de commiter, lancer `pnpm test` depuis `apps/pwa/` — tout doit rester vert.

### Pitfall 2 — Supprimer un data-testid
**What goes wrong:** Lors du refactoring du markup d'une page, on supprime ou déplace un élément portant un `data-testid` → test vitest ou E2E Playwright cassé.
**Why it happens:** Les data-testid sont des ancres pour les tests, pas des attributs visuels.
**How to avoid:** Les data-testid suivants sont NON TOUCHABLES (vérifiés par tests) : `scan-dropzone`, `scan-upload-btn`, `scan-lancer-btn`, `catalogue-search`, `nav-catalogue`, `nav-scan`, `nav-history`, `nav-settings`, `settings-sync-status`, `validation-save-btn`, `cta-scan-facture`. Les conserver sur les MÊMES éléments DOM.
**Warning signs:** Grep `data-testid` dans les fichiers modifiés avant de commit.

### Pitfall 3 — Classes couleur hardcodées en conflit
**What goes wrong:** On change `bg-slate-800` en `bg-gray-800` mais Tailwind purge l'une ou l'autre selon ce qui est dans le contenu.
**Why it happens:** Tailwind v3 purge les classes non utilisées — si `bg-slate-800` est dans le template mais qu'on a oublié un fichier, la couleur reste dans le build mais visuellement incohérente.
**How to avoid:** Migrer page par page, pas en batch. Vérifier visuellement chaque page après migration.

### Pitfall 4 — Gradient en `backgroundImage`
**What goes wrong:** Un composant utilise `style={{ backgroundImage: 'linear-gradient(...)' }}` ou `className="bg-gradient-coral-btn"` — explicitement interdit par UI-SPEC.
**Why it happens:** L'ancienne config Tailwind déclare `gradient-coral`, `gradient-coral-btn`, `gradient-beige` etc. Ils peuvent être utilisés par inadvertance.
**How to avoid:** Grep `gradient` dans les fichiers modifiés. Remplacer par fond solide.

### Pitfall 5 — Framer Motion `bounce` ou rotation 3D
**What goes wrong:** En adaptant des animations, on utilise `bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'` défini dans `tokens.js` — interdit par UI-SPEC.
**Why it happens:** `tokens.js` déclare `transitions.bounce` — il existe mais est banni.
**How to avoid:** N'utiliser que `easeOut`, `easeIn`, `easeInOut` pour les transitions. Pas de `bounce`, pas de `rotateIn` (interdit dans cette phase).

### Pitfall 6 — overflow-x hidden sur body/wrapper de page
**What goes wrong:** Pour masquer un débordement horizontal, on ajoute `overflow-x-hidden` sur le wrapper racine de page → casse le scroll iOS natif (PWA constraint).
**Why it happens:** Réflexe courant pour éviter les dépassements.
**How to avoid:** Ne jamais ajouter `overflow-x-hidden` sur les wrappers de page. Régler le débordement à la source (élément enfant).

---

## Code Examples

### Pattern Navbar avec tokens dark (UI-SPEC)

```jsx
// Source: UI-SPEC.md — Navbar contract
const linkClass = ({ isActive }) =>
  `relative flex flex-col items-center gap-1 transition-all duration-200 px-4 py-2 rounded-xl
   active:scale-95 focus-visible:ring-2 focus-visible:ring-[#E05C3A]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]
   ${isActive
     ? 'text-[#E05C3A]'
     : 'text-gray-500 hover:text-gray-300'}`

// Navbar wrapper:
<nav className="fixed bottom-0 left-0 right-0 z-50
  bg-gray-800/70 backdrop-blur-2xl
  border-t border-gray-700/50
  flex justify-around items-start
  pb-safe pt-3
  shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">

// Active indicator (dot):
{isActive && (
  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#E05C3A]" aria-hidden />
)}
```

### Pattern Card dark (UI-SPEC)

```jsx
// Source: UI-SPEC.md — Card Component Styling Contract
// variant="default" → bg-gray-800
// variant="bordered" → bg-gray-800 border border-gray-700
// variant="elevated" → bg-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.3)]
// Note: baseStyles doit devenir 'bg-gray-800 rounded-xl ...' (changer rounded-lg → rounded-xl)
// Mais Card.test.jsx vérifie 'bg-bgLight' → si on garde bg-bgLight dans tailwind.config.js
// et qu'on le mappe vers #1F2937 (gray-800), les tests passent ET l'affichage est correct.
```

### Pattern Input dark

```jsx
// Source: UI-SPEC.md — Input Component Styling Contract
const variantStyles = {
  default: `
    bg-gray-900 text-gray-100 border
    placeholder:text-gray-500
    ${error
      ? 'border-error focus:border-error focus:ring-error/20'
      : 'border-gray-700 focus:border-[#E05C3A] focus:ring-2 focus:ring-[#E05C3A]/20'}
  `,
  filled: `
    bg-gray-900 text-gray-100 border-0
    placeholder:text-gray-500
    ${error ? 'focus:ring-error/20' : 'focus:ring-[#E05C3A]/20'}
  `,
}
// Note: Input.test.jsx vérifie 'bg-bgLight' sur filled → même stratégie que Card:
// ajouter 'bg-bgLight': '#111827' dans tailwind.config.js
```

### Pattern Button dark (sans casser les tests)

```jsx
// Source: UI-SPEC.md — Button Component Styling Contract
// IMPORTANT: les tests vérifient bg-cta, bg-primary, bg-transparent, bg-error
// Ces noms de classes DOIVENT rester dans le JSX
// Seule l'update de tailwind.config.js change les valeurs visuelles

// primary: bg-cta (déjà = #E05C3A) — CORRECT, pas de changement
// secondary: bg-primary (= #E05C3A dans config actuelle) — MAIS UI-SPEC dit bg-gray-700
//   → Option A: garder bg-primary dans Button.jsx, changer 'primary' dans tailwind.config → RISQUE si primary est utilisé pour autre chose
//   → Option B: changer Button.jsx secondary de bg-primary à bg-gray-700, mettre à jour Button.test.jsx
//   → RECOMMANDE Option B: mise à jour simultanée Button.jsx + Button.test.jsx (bg-primary → bg-gray-700)

const variants = {
  primary:   'bg-cta hover:bg-[#C44E2F] text-white font-semibold',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-50 font-semibold',  // CHANGEMENT + test update
  ghost:     'bg-transparent hover:bg-[#E05C3A]/10 text-[#E05C3A] font-medium',
  danger:    'bg-error hover:bg-red-700 text-white font-semibold',
}
```

### Animation entrée de page (UI-SPEC)

```jsx
// Source: UI-SPEC.md Animation Contract + animations.js existant
// Entrée de page: fadeIn + y: 10 → 0, 250ms easeOut
// Utiliser fadeIn existant dans animations.js (duration: 0.3) — proche de 250ms, acceptable

import { motion } from 'framer-motion'
import { fadeIn } from '@/design-system/animations'

<motion.div
  variants={fadeIn}
  initial="hidden"
  animate="visible"
  className="min-h-screen bg-[#111827]"
>
  {/* contenu */}
</motion.div>

// Pour les listes: staggerContainer + slideUp (existants dans animations.js)
// Correction des durées si besoin: le staggerContainer actuel a staggerChildren: 0.1
// UI-SPEC demande 50ms stagger → utiliser staggerContainerFast (0.05)
```

### Badge variant accent (ajout)

```jsx
// Source: UI-SPEC.md — Badge Component Styling Contract
const variantStyles = {
  success: 'bg-success/10 text-success border-success/20',     // conservé
  warning: 'bg-warning/10 text-warning border-warning/20',     // conservé
  error:   'bg-error/10 text-error border-error/20',           // conservé
  info:    'bg-info/10 text-info border-info/20',               // conservé
  neutral: 'bg-primary/10 text-primary border-primary/20',     // conservé (tests le vérifient)
  accent:  'bg-[#E05C3A]/15 text-[#E05C3A] border-[#E05C3A]/20', // AJOUTÉ
}
// Note: 'neutral' reste pointant vers primary (= #E05C3A) — incohérent mais stable pour tests
// Utiliser 'accent' pour les nouveaux badges corail
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `slate-*` / `emerald-*` hardcodé dans pages | `gray-*` + tokens custom via tailwind.config.js | Migration page par page sans réécriture |
| Fond beige `#FAF5F2` (tokens.js actuel) | Fond dark `#111827` (gray-900) | Inversion complète de palette |
| Page sans header standardisé | Patron de page commun (icône accent + titre Sora + sous-titre) | Cohérence entre toutes les pages |
| Active state navbar: `emerald-400` | Active state: `[#E05C3A]` (corail brand) | Identité visuelle unifiée |

**Deprecated dans cette phase:**
- `bg-slate-*` / `text-slate-*` dans les pages: remplacer par `bg-gray-*` / `text-gray-*`
- `emerald-*` partout: remplacer par `[#E05C3A]` ou `gray-*`
- `bg-[#121212]` / `bg-[#0f172a]`: remplacer par `bg-[#111827]`
- Gradients (`bg-gradient-coral-btn`, etc.): interdits dans cette phase

---

## Open Questions

1. **`bg-bgLight` — alias ou renommage?**
   - What we know: `Card.test.jsx` et `Input.test.jsx` vérifient `toHaveClass('bg-bgLight')`. Ce token n'existe pas dans `tailwind.config.js` actuel mais est utilisé dans `Card.jsx` et `Input.jsx` (filled).
   - What's unclear: Comment `bg-bgLight` compile-t-il actuellement si pas dans tailwind.config ? Probablement ignoré silencieusement par Tailwind (classe inconnue = pas de style).
   - Recommendation: Ajouter `'bg-bgLight': '#1F2937'` dans tailwind.config.js extensions — résout à la fois le test ET le style dark.

2. **`Button.secondary` utilise `bg-primary` (`#E05C3A`) — ce n'est pas `bg-gray-700`**
   - What we know: UI-SPEC veut `bg-gray-700` pour secondary. Actuellement `bg-primary` = corail.
   - What's unclear: Est-ce que le variant secondary est utilisé sur des éléments visible dans les tests de pages ?
   - Recommendation: Changer `Button.jsx` secondary → `bg-gray-700` ET mettre à jour `Button.test.jsx` (ligne 23: `toHaveClass('bg-primary')` → `toHaveClass('bg-gray-700')`). Change non-breaking fonctionnellement.

3. **`tokens.js` JS est-il importé hors design-system?**
   - What we know: `Card.jsx` importe `shadows` depuis `tokens.js`. D'autres composants ?
   - Recommendation: Vérifier `grep -r "from '@/design-system/tokens'"` — s'assurer que la mise à jour des valeurs JS est cohérente avec tailwind.config.js.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 + @testing-library/react ^16.3.2 |
| Config file | `apps/pwa/vite.config.js` (section `test:`) |
| Quick run command | `cd apps/pwa && pnpm test` |
| Full suite command | `cd apps/pwa && pnpm test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Tokens dark appliqués sur tous les composants partagés | unit | `cd apps/pwa && pnpm test -- --reporter=verbose src/components/__tests__/` | ✅ |
| UI-01 | Navbar active state = corail (pas emerald) | unit | `cd apps/pwa && pnpm test -- src/components/__tests__/Navbar.test.jsx` | ✅ (test aria/testid, pas classes) |
| UI-01 | Button variants conservés et stables | unit | `cd apps/pwa && pnpm test -- src/components/__tests__/Button.test.jsx` | ✅ |
| UI-01 | Card dark background appliqué | unit | `cd apps/pwa && pnpm test -- src/components/__tests__/Card.test.jsx` | ✅ (vérifie bg-bgLight) |
| UI-01 | Input dark styling | unit | `cd apps/pwa && pnpm test -- src/components/__tests__/Input.test.jsx` | ✅ (vérifie bg-bgLight) |
| UI-01 | Aucune régression pages | unit | `cd apps/pwa && pnpm test` (suite complète 303 tests) | ✅ |
| UI-01 | PWA installable après refonte | manual-only | Vérification manuelle Lighthouse PWA audit | N/A |
| UI-01 | Layout mobile correct (pb-24, navbar visible) | manual-only | Test sur device mobile ou DevTools mobile | N/A |

### Sampling Rate

- **Per task commit:** `cd apps/pwa && pnpm test` (suite rapide — ~15s)
- **Per wave merge:** `cd apps/pwa && pnpm test:coverage`
- **Phase gate:** Suite complète verte (303 tests) + vérification visuelle manuelle des 6 pages avant `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Mettre à jour `Button.test.jsx` ligne 23 si Button.secondary migre de `bg-primary` → `bg-gray-700`
- [ ] Ajouter `'bg-bgLight': '#1F2937'` dans `tailwind.config.js` pour préserver les assertions Card.test.jsx et Input.test.jsx (ou update simultanée Card.jsx + Input.jsx + leurs tests)

*(Aucun nouveau fichier de test à créer — les tests existants couvrent tous les composants concernés)*

---

## Sources

### Primary (HIGH confidence)
- Codebase scan direct — `tailwind.config.js`, `tokens.js`, `animations.js`, tous les composants partagés et pages features
- `.planning/phases/06-frontend-visual-redesign/06-UI-SPEC.md` — contrat visuel complet (couleurs, typo, layouts, composants, animations)
- Tests existants scannés (`__tests__/`) — assertions CSS exactes documentées

### Secondary (MEDIUM confidence)
- Tailwind v3 documentation (version confirmée: `3.4.17` dans package.json) — custom color tokens, arbitrary values `[#E05C3A]`

### Tertiary (LOW confidence)
- Aucun élément LOW confidence dans cette recherche — tout est vérifié sur le codebase réel

---

## Metadata

**Confidence breakdown:**
- Inventory fichiers: HIGH — scan direct du codebase
- Risque tests: HIGH — tests lus et assertions documentées précisément
- Patterns Tailwind v3: HIGH — version confirmée, patterns standards
- Migration order: MEDIUM — logique déduite, pas de contrainte technique forte imposant un ordre précis

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stack stable, aucune dépendance fast-moving concernée)
