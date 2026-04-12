# GRILLES D'AUDIT UI/UX 2026 — RÉFÉRENCE COMPLÈTE

## 📐 STANDARDS 2026 PAR CATÉGORIE

---

## 1. ACCESSIBILITÉ — Standards WCAG 2.2 AA (obligatoire)

| Critère | Standard | Vérification |
|---------|----------|-------------|
| Contraste texte normal | ≥ 4.5:1 | Outil : webaim.org/resources/contrastchecker |
| Contraste grand texte (18px+) | ≥ 3:1 | |
| Contraste composants UI | ≥ 3:1 | Boutons, inputs, icônes |
| Focus visible | Visible + styled | `focus-visible:ring-2` minimum |
| Alt text images | Descriptif ou `alt=""` | |
| Labels formulaires | Visible + associé | `htmlFor` + `id` |
| Navigation clavier | Complète | Tab order logique |
| ARIA rôles | Corrects | Pas d'ARIA inventé |
| Lang HTML | Déclaré | `<html lang="fr">` |
| Titre page | Unique + descriptif | `<title>` par page |

### Red flags accessibilité critiques :
```tsx
// ❌ Interdit
<div onClick={fn}>Click me</div>           // div cliquable
<img src="..." />                           // pas de alt
<input placeholder="Email" />              // pas de label
<a href="javascript:void(0)">             // lien invalide
<span style="color:red">Erreur</span>     // couleur seule = info

// ✅ Correct
<button type="button" onClick={fn}>Click me</button>
<img src="..." alt="Description de l'image" />
<label htmlFor="email">Email</label>
<input id="email" type="email" />
<span style="color:red" role="alert">⚠ Erreur : champ requis</span>
```

---

## 2. TYPOGRAPHIE — Règles inviolables 2026

### Hiérarchie typographique standard

| Niveau | Taille min | Taille max | Weight | Line-height | Letter-spacing |
|--------|-----------|-----------|--------|------------|----------------|
| Hero / Display | 3rem | 6rem | 700-900 | 1.0-1.1 | -0.03em |
| H1 | 2rem | 3rem | 700 | 1.1 | -0.025em |
| H2 | 1.5rem | 2rem | 600-700 | 1.15 | -0.02em |
| H3 | 1.2rem | 1.5rem | 600 | 1.2 | -0.015em |
| Body | 0.9rem | 1rem | 400 | 1.6-1.75 | 0 |
| Caption | 0.75rem | 0.875rem | 400-500 | 1.4-1.5 | 0 |
| Label UI | 0.8rem | 0.875rem | 500-600 | 1.4 | 0.01em |
| Overline | 0.7rem | 0.75rem | 600 | — | 0.08-0.12em |

### Anti-patterns typographiques
```css
/* ❌ Problèmes fréquents */
font-size: 14px;          /* hardcodé, pas responsive */
line-height: 1;           /* illisible sur corps de texte */
text-align: justify;      /* crée des "rivières" visuelles */
letter-spacing: 2px;      /* sur du texte lowercase = bizarre */
font-weight: 100;         /* illisible sur écrans basse résolution */

/* ✅ Standards */
font-size: clamp(0.9rem, 0.9rem + 0.15vw, 1rem);
line-height: 1.6;
text-wrap: balance;       /* sur les titres */
text-wrap: pretty;        /* sur le body (évite les orphelins) */
```

---

## 3. COULEURS — Système OKLCH 2026

### Pourquoi OKLCH plutôt que HEX/HSL
- HEX : opaque, pas de logique perceptuelle
- HSL : les couleurs de même "L" ne semblent pas avoir la même luminosité
- OKLCH : luminosité perceptuellement uniforme, idéal pour des palettes cohérentes

### Palette minimum obligatoire pour une app pro
```css
:root {
  /* Marque — 9 nuances */
  --brand-50 à --brand-900

  /* Neutres — pour textes et surfaces */
  --gray-50 à --gray-900

  /* Sémantique */
  --success: oklch(65% 0.20 150);
  --warning: oklch(75% 0.18 80);
  --error:   oklch(60% 0.22 20);
  --info:    oklch(60% 0.18 230);

  /* Surfaces */
  --surface-base, --surface-raised, --surface-overlay

  /* Textes */
  --text-primary, --text-secondary, --text-disabled
}
```

### Contrastes minimum par usage
| Usage | Ratio minimum | Exemple |
|-------|--------------|---------|
| Texte corps | 4.5:1 | Body text sur fond blanc |
| Grand titre | 3.0:1 | H1 sur fond blanc |
| Placeholder | 3.0:1 | Text dans input |
| Icône seule | 3.0:1 | Bouton icône |
| Bouton désactivé | 3.0:1 | Sur fond blanc |
| Focus ring | 3.0:1 | Contre la surface adjacente |

---

## 4. LAYOUT & SPACING — Système 4px

### L'échelle d'espacement standard
```
4px  → --space-1  (séparation minimale)
8px  → --space-2  (inline items)
12px → --space-3  (label → input)
16px → --space-4  (padding base)
20px → --space-5  
24px → --space-6  (section interne)
32px → --space-8  (entre composants)
40px → --space-10 
48px → --space-12 (entre sections majeures)
64px → --space-16 (padding page)
80px → --space-20 
96px → --space-24 (grandes sections)
```

### Grilles recommandées
```css
/* Container maximum — ne pas dépasser */
.container { max-width: 1280px; margin-inline: auto; padding-inline: clamp(1rem, 5vw, 3rem); }

/* Grille 12 colonnes classique */
.grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--space-6); }

/* Layout Dashboard typique */
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr; /* sidebar + content */
  grid-template-rows: auto 1fr;     /* header + main */
  min-height: 100vh;
}
```

---

## 5. COMPOSANTS — Standards par type

### Bouton — Variantes obligatoires
```tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

// États obligatoires : default, hover, active, focus, disabled, loading
```

### Formulaire — Pattern obligatoire
```tsx
// Chaque champ = Label + Input + Hint (optionnel) + Error (conditionnel)
<div className="field-group">
  <label htmlFor="email">Email <span aria-hidden>*</span></label>
  <input
    id="email"
    type="email"
    aria-describedby="email-hint email-error"
    aria-invalid={!!errors.email}
    aria-required="true"
  />
  <p id="email-hint" className="hint">Utilisé pour les notifications</p>
  {errors.email && (
    <p id="email-error" role="alert" className="error">
      ⚠ {errors.email}
    </p>
  )}
</div>
```

### Tableau de données — Pattern obligatoire
```tsx
// Un tableau pro doit avoir :
// - Tri sur colonnes (avec aria-sort)
// - État vide avec action
// - État loading avec skeleton
// - Pagination ou infinite scroll
// - Actions par ligne (edit, delete)
// - Sélection multiple si pertinent
// - Responsive (scroll horizontal ou adaptation mobile)
```

### Card — Pattern standard
```tsx
// Une card doit avoir :
// - Padding cohérent (16-24px)
// - Border ou shadow pour délimiter (pas les deux à la fois)
// - État hover si cliquable (ne pas oublier cursor: pointer)
// - Radius cohérent avec le reste du design system
// - Si cliquable : le lien doit englober TOUT le contenu de la card
```

---

## 6. ANIMATIONS — Guide 2026

### Durées par type d'action
| Action | Durée | Easing |
|--------|-------|--------|
| Changement d'état UI (hover, focus) | 100-150ms | ease-out |
| Ouverture tooltip | 150ms | ease-out |
| Entrée d'un élément | 200-300ms | spring (0.34, 1.56, 0.64, 1) |
| Transition de page | 250-400ms | ease-in-out |
| Fermeture/sortie | 150-200ms | ease-in |
| Skeleton shimmer | 1.5s | linear (infini) |
| Notification toast | 300ms entrée, 200ms sortie | spring |

### `prefers-reduced-motion` — OBLIGATOIRE
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
// React — avec Framer Motion
const shouldReduceMotion = useReducedMotion();
const variants = {
  hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
  visible: { opacity: 1, y: 0 }
};
```

---

## 7. ÉTATS MANQUANTS — Anti-pattern le plus courant

### Matrice des états obligatoires par composant

| Composant | Empty | Loading | Error | Success |
|-----------|-------|---------|-------|---------|
| Liste de données | ✅ | ✅ Skeleton | ✅ | — |
| Formulaire submit | — | ✅ Spinner bouton | ✅ | ✅ |
| Recherche | ✅ "Aucun résultat" | ✅ | ✅ | — |
| Upload fichier | — | ✅ Progress | ✅ | ✅ |
| Page complète | — | ✅ Skeleton page | ✅ ErrorBoundary | — |
| Image | — | ✅ Blur placeholder | ✅ Fallback | — |
| Graphique | ✅ | ✅ Skeleton | ✅ | — |

### Squelette (Skeleton) — Standard 2026
```css
/* Animation shimmer universelle */
@keyframes shimmer {
  from { background-position: 200% center; }
  to   { background-position: -200% center; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    oklch(90% 0 0) 25%,
    oklch(95% 0 0) 50%,
    oklch(90% 0 0) 75%
  );
  background-size: 200% auto;
  animation: shimmer 1.5s linear infinite;
  border-radius: var(--radius-sm);
}
```

---

## 8. PERFORMANCE VISUELLE — Checklist 2026

### Core Web Vitals cibles
| Métrique | Cible | Mauvais |
|----------|-------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | > 4s |
| CLS (Cumulative Layout Shift) | < 0.1 | > 0.25 |
| INP (Interaction to Next Paint) | < 200ms | > 500ms |
| FCP (First Contentful Paint) | < 1.8s | > 3s |
| TTFB (Time to First Byte) | < 800ms | > 1.8s |

### Causes fréquentes de mauvais scores
```
CLS élevé → Images sans dimensions, fonts sans size-adjust, contenu injecté dynamiquement
LCP lent  → Image hero non-prioritaire, pas de preconnect, bundle JS bloquant
INP élevé → Handlers synchrones lourds, re-renders inutiles, animations JS (préférer CSS)
```
