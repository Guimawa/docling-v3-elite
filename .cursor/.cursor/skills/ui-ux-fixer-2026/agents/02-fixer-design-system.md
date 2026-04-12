# SOUS-AGENT 02 — FIXER DESIGN SYSTEM

## 🎯 Rôle
Tu es un **architecte design system**. Tu crées ou répares le système de design :
tokens CSS, palette de couleurs OKLCH, typographie, espacements, shadows, radius.
C'est le **travail fondateur** — tous les autres agents s'appuient sur ce que tu fais.

---

## 📋 PROCÉDURE COMPLÈTE

### ÉTAPE 1 — Diagnostic de l'existant

```bash
# Y a-t-il déjà des tokens/variables CSS ?
find . -name "*.css" | grep -v node_modules | xargs grep -l "var(--" 2>/dev/null

# Lire le fichier globals s'il existe
cat app/globals.css 2>/dev/null || cat src/styles/globals.css 2>/dev/null || cat styles/globals.css 2>/dev/null

# Lire la config Tailwind
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null

# Quelles couleurs sont actuellement utilisées ?
grep -rh "text-\|bg-\|border-" --include="*.tsx" --include="*.jsx" \
  | grep -oE "(text|bg|border)-[a-z]+-[0-9]+" \
  | sort | uniq -c | sort -rn | head -30
```

### ÉTAPE 2 — Identifier les couleurs de la marque

Chercher les couleurs "de base" du projet :
```bash
# Couleurs hardcodées
grep -rh "#[0-9a-fA-F]\{6\}" --include="*.tsx" --include="*.jsx" --include="*.css" \
  | grep -v node_modules \
  | grep -oE "#[0-9a-fA-F]{6}" \
  | sort | uniq -c | sort -rn | head -20
```

Identifier LA couleur principale de la marque (la plus utilisée).

---

## 🎨 CRÉATION DU FICHIER TOKENS

### Localisation du fichier à créer/modifier

```bash
# Option A : Next.js App Router
# → app/globals.css (existe déjà, ajouter les tokens)

# Option B : Vite/CRA
# → src/styles/tokens.css (créer si absent)
# → puis importer dans src/main.tsx ou src/index.css

# Option C : HTML pur
# → styles/tokens.css (créer si absent)
```

### Template de tokens à créer (adapter aux couleurs du projet)

```css
/* ============================================================
   DESIGN TOKENS — [Nom du projet]
   Généré par ui-ux-fixer-2026
   Standard : OKLCH 2026 + WCAG AA
   ============================================================ */

:root {
  /* ═══════════════════════════════════════════
     COULEURS — OKLCH
     Syntaxe : oklch(lightness% chroma hue)
     Lightness : 0% = noir, 100% = blanc
     Chroma : 0 = gris, 0.3+ = très saturé
     Hue : 0-360° (rouge=0, vert=140, bleu=250)
     ═══════════════════════════════════════════ */

  /* Couleur de marque — adapter le HUE selon la charte */
  /* Remplacer 250 par le hue de la couleur principale du projet */
  --color-brand-50:  oklch(97% 0.02 [HUE]);
  --color-brand-100: oklch(93% 0.05 [HUE]);
  --color-brand-200: oklch(86% 0.10 [HUE]);
  --color-brand-300: oklch(76% 0.15 [HUE]);
  --color-brand-400: oklch(65% 0.20 [HUE]);
  --color-brand-500: oklch(55% 0.22 [HUE]);   /* ← couleur principale */
  --color-brand-600: oklch(45% 0.20 [HUE]);
  --color-brand-700: oklch(35% 0.16 [HUE]);
  --color-brand-800: oklch(25% 0.10 [HUE]);
  --color-brand-900: oklch(15% 0.05 [HUE]);

  /* Alias sémantiques — utiliser TOUJOURS ces variables dans le code */
  --color-primary:          var(--color-brand-500);
  --color-primary-hover:    var(--color-brand-600);
  --color-primary-light:    var(--color-brand-100);
  --color-primary-contrast: oklch(100% 0 0);   /* texte blanc sur primary */

  /* Surfaces */
  --color-surface-base:    oklch(100% 0 0);         /* blanc pur */
  --color-surface-subtle:  oklch(98.5% 0.002 [HUE]); /* fond app */
  --color-surface-muted:   oklch(96% 0.004 [HUE]);   /* cartes */
  --color-surface-overlay: oklch(94% 0.006 [HUE]);   /* hover/selected */
  --color-surface-invert:  oklch(12% 0.01 [HUE]);    /* dark elements */

  /* Bordures */
  --color-border-subtle:  oklch(92% 0.005 [HUE]);
  --color-border-default: oklch(88% 0.008 [HUE]);
  --color-border-strong:  oklch(75% 0.01 [HUE]);

  /* Texte — contrastes WCAG AA garantis sur --surface-base */
  --color-text-primary:   oklch(12% 0.01 [HUE]);  /* ~17:1 ✅ */
  --color-text-secondary: oklch(38% 0.01 [HUE]);  /* ~7.5:1 ✅ */
  --color-text-tertiary:  oklch(50% 0.01 [HUE]);  /* ~4.6:1 ✅ AA */
  --color-text-disabled:  oklch(68% 0.01 [HUE]);  /* ~2.3:1 — OK pour désactivé */
  --color-text-invert:    oklch(100% 0 0);         /* blanc */
  --color-text-brand:     var(--color-brand-600);  /* liens, accents */

  /* Sémantique */
  --color-success:        oklch(52% 0.17 145);
  --color-success-light:  oklch(94% 0.06 145);
  --color-success-text:   oklch(28% 0.10 145);

  --color-warning:        oklch(65% 0.17 75);
  --color-warning-light:  oklch(95% 0.06 75);
  --color-warning-text:   oklch(32% 0.10 75);

  --color-error:          oklch(54% 0.22 25);
  --color-error-light:    oklch(95% 0.06 25);
  --color-error-text:     oklch(30% 0.12 25);

  --color-info:           oklch(54% 0.18 240);
  --color-info-light:     oklch(94% 0.05 240);
  --color-info-text:      oklch(28% 0.10 240);

  /* ═══════════════════════════════════════════
     TYPOGRAPHIE
     ═══════════════════════════════════════════ */

  /* Polices — détecter et utiliser celles du projet */
  --font-display: "Cal Sans", "Playfair Display", Georgia, serif;
  --font-body:    system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono:    "JetBrains Mono", "Fira Code", "Courier New", monospace;

  /* Tailles responsives — clamp(min, preferred, max) */
  --text-xs:   clamp(0.69rem,  0.66rem + 0.16vw, 0.75rem);
  --text-sm:   clamp(0.83rem,  0.78rem + 0.24vw, 0.875rem);
  --text-base: clamp(1rem,     0.96rem + 0.18vw, 1.063rem);
  --text-lg:   clamp(1.2rem,   1.07rem + 0.65vw, 1.375rem);
  --text-xl:   clamp(1.44rem,  1.22rem + 1.1vw,  1.75rem);
  --text-2xl:  clamp(1.73rem,  1.41rem + 1.6vw,  2.25rem);
  --text-3xl:  clamp(2.07rem,  1.60rem + 2.35vw, 2.875rem);
  --text-4xl:  clamp(2.49rem,  1.83rem + 3.29vw, 3.625rem);
  --text-hero: clamp(3rem,     2rem + 5vw,        6rem);

  /* ═══════════════════════════════════════════
     ESPACEMENTS — Multiples de 4px
     ═══════════════════════════════════════════ */
  --space-px:  1px;
  --space-0-5: 0.125rem;  /*  2px */
  --space-1:   0.25rem;   /*  4px */
  --space-2:   0.5rem;    /*  8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-14:  3.5rem;    /* 56px */
  --space-16:  4rem;      /* 64px */
  --space-20:  5rem;      /* 80px */
  --space-24:  6rem;      /* 96px */
  --space-32:  8rem;      /* 128px */

  /* ═══════════════════════════════════════════
     BORDER RADIUS
     ═══════════════════════════════════════════ */
  --radius-none: 0;
  --radius-sm:   0.25rem;   /* 4px  — badges, tags */
  --radius-md:   0.5rem;    /* 8px  — inputs, petites cards */
  --radius-lg:   0.75rem;   /* 12px — cards standards */
  --radius-xl:   1rem;      /* 16px — grandes cards */
  --radius-2xl:  1.5rem;    /* 24px — modals, drawers */
  --radius-3xl:  2rem;      /* 32px — hero sections */
  --radius-full: 9999px;    /* pillules, avatars */

  /* ═══════════════════════════════════════════
     SHADOWS — Système d'élévation
     ═══════════════════════════════════════════ */
  --shadow-xs:    0 1px 2px oklch(0% 0 0 / 0.05);
  --shadow-sm:    0 1px 3px oklch(0% 0 0 / 0.10), 0 1px 2px oklch(0% 0 0 / 0.06);
  --shadow-md:    0 4px 6px oklch(0% 0 0 / 0.07),  0 2px 4px oklch(0% 0 0 / 0.06);
  --shadow-lg:    0 10px 15px oklch(0% 0 0 / 0.10), 0 4px 6px oklch(0% 0 0 / 0.05);
  --shadow-xl:    0 20px 25px oklch(0% 0 0 / 0.10), 0 10px 10px oklch(0% 0 0 / 0.04);
  --shadow-2xl:   0 25px 50px oklch(0% 0 0 / 0.25);
  --shadow-inner: inset 0 2px 4px oklch(0% 0 0 / 0.06);
  --shadow-brand: 0 4px 14px oklch(55% 0.22 [HUE] / 0.35);
  --shadow-none:  none;

  /* ═══════════════════════════════════════════
     ANIMATIONS
     ═══════════════════════════════════════════ */
  /* Durées */
  --duration-instant: 50ms;
  --duration-fast:    100ms;
  --duration-normal:  200ms;
  --duration-slow:    350ms;
  --duration-slower:  500ms;
  --duration-crawl:   800ms;

  /* Easings */
  --ease-linear:    linear;
  --ease-in:        cubic-bezier(0.4, 0, 1, 1);
  --ease-out:       cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-bounce:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-overshoot: cubic-bezier(0.2, 1.2, 0.4, 1);

  /* ═══════════════════════════════════════════
     BLUR / GLASS
     ═══════════════════════════════════════════ */
  --blur-sm:  4px;
  --blur-md:  12px;
  --blur-lg:  24px;
  --blur-xl:  48px;

  /* ═══════════════════════════════════════════
     Z-INDEX — Couches UI
     ═══════════════════════════════════════════ */
  --z-below:    -1;
  --z-base:      0;
  --z-raised:   10;
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-toast:    500;
  --z-tooltip:  600;

  /* ═══════════════════════════════════════════
     LAYOUT
     ═══════════════════════════════════════════ */
  --container-sm:  640px;
  --container-md:  768px;
  --container-lg:  1024px;
  --container-xl:  1280px;
  --container-2xl: 1536px;

  --sidebar-width:         240px;
  --sidebar-width-compact: 72px;
  --header-height:         64px;
  --footer-height:         auto;
}

/* ═══════════════════════════════════════════
   DARK MODE
   ═══════════════════════════════════════════ */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-base:    oklch(12% 0.01 [HUE]);
    --color-surface-subtle:  oklch(15% 0.012 [HUE]);
    --color-surface-muted:   oklch(18% 0.014 [HUE]);
    --color-surface-overlay: oklch(22% 0.016 [HUE]);

    --color-border-subtle:   oklch(22% 0.01 [HUE]);
    --color-border-default:  oklch(28% 0.01 [HUE]);
    --color-border-strong:   oklch(38% 0.01 [HUE]);

    --color-text-primary:    oklch(97% 0.005 [HUE]);
    --color-text-secondary:  oklch(78% 0.008 [HUE]);
    --color-text-tertiary:   oklch(62% 0.008 [HUE]);
    --color-text-disabled:   oklch(42% 0.005 [HUE]);
  }
}

/* ═══════════════════════════════════════════
   CLASSES UTILITAIRES DE BASE
   ═══════════════════════════════════════════ */

/* Container responsive */
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: clamp(1rem, 5vw, 2rem);
}

/* Accessibilité — visually hidden */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border-width: 0;
}
.sr-only:focus {
  position: static;
  width: auto; height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Réduction de mouvement — OBLIGATOIRE */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Focus visible — standard accessible */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

### ÉTAPE 3 — Remplacer les couleurs hardcodées dans le code

Après création des tokens, remplacer les occurrences les plus fréquentes :

```bash
# Trouver toutes les occurrences de couleurs hardcodées
grep -rn "#[0-9a-fA-F]\{6\}" --include="*.tsx" --include="*.jsx" --include="*.css" \
  | grep -v node_modules | sort

# Pour chaque couleur identifiée comme "couleur principale" :
# Remplacer par var(--color-primary)
# Pour les gris texte → var(--color-text-secondary)
# etc.
```

### ÉTAPE 4 — Connecter les tokens à Tailwind (si utilisé)

```typescript
// tailwind.config.ts — ajouter les tokens CSS dans le thème
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{tsx,ts}', './components/**/*.{tsx,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'oklch(var(--color-brand-50) / <alpha-value>)',
          500: 'oklch(var(--color-brand-500) / <alpha-value>)',
          // ... etc
        },
        surface: {
          base:    'var(--color-surface-base)',
          subtle:  'var(--color-surface-subtle)',
          muted:   'var(--color-surface-muted)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary:  'var(--color-text-tertiary)',
          disabled:  'var(--color-text-disabled)',
        },
      },
      spacing: {
        '4px': 'var(--space-1)',
        '8px': 'var(--space-2)',
        // ... ou utiliser directement les classes Tailwind existantes
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
        mono:    ['var(--font-mono)'],
      },
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
        bounce: 'var(--ease-bounce)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 📤 OUTPUT ATTENDU

```bash
# Logger dans FIXES-APPLIED.md
cat >> FIXES-APPLIED.md << EOF

## ✅ DESIGN SYSTEM — Tokens créés/mis à jour
- **Fichier tokens** : \`[chemin]/tokens.css\`
- **Couleurs tokenisées** : [N] variables
- **Couleurs hardcodées remplacées** : [N] occurrences
- **Tailwind config mis à jour** : oui/non
- **Dark mode** : oui/non
EOF
```
