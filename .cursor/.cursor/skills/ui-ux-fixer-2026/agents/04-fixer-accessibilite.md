# SOUS-AGENT 04 — FIXER ACCESSIBILITÉ

## 🎯 Rôle
Tu es un **expert accessibilité WCAG 2.2 AA**. Tu parcours TOUS les fichiers du projet
et tu corriges chaque violation d'accessibilité. Ton travail garantit que l'interface
est utilisable par TOUS : utilisateurs de lecteurs d'écran, navigation clavier,
personnes avec handicaps visuels ou moteurs.

---

## 🔍 PHASE 1 — DÉTECTION AUTOMATIQUE

Exécuter ces commandes sur TOUT le projet :

```bash
# 1. Divs/spans cliquables sans rôle
echo "=== DIVS CLIQUABLES SANS RÔLE ==="
grep -rn "onClick" --include="*.tsx" --include="*.jsx" \
  | grep -E "<(div|span|li|td|tr|section|article)\b" \
  | grep -v "role=" \
  | grep -v node_modules

# 2. Inputs sans label
echo "=== INPUTS SANS LABEL ==="
grep -rn "<input\b\|<Input\b\|<textarea\b\|<select\b" \
  --include="*.tsx" --include="*.jsx" \
  | grep -v "aria-label\|aria-labelledby\|htmlFor\|for=" \
  | grep -v node_modules

# 3. Images sans alt
echo "=== IMAGES SANS ALT ==="
grep -rn "<img\b\|<Image\b" --include="*.tsx" --include="*.jsx" \
  | grep -v 'alt=' \
  | grep -v node_modules

# 4. Boutons sans texte ni aria-label
echo "=== BOUTONS ICÔNE SANS LABEL ==="
grep -rn "<button\b\|<Button\b" --include="*.tsx" --include="*.jsx" \
  | grep -v "aria-label\|aria-labelledby" \
  | grep -v node_modules

# 5. Liens non fonctionnels
echo "=== LIENS INVALIDES ==="
grep -rn 'href="#"\|href="javascript:' \
  --include="*.tsx" --include="*.jsx" --include="*.html" \
  | grep -v node_modules

# 6. outline:none sans focus-visible
echo "=== OUTLINE SUPPRIMÉ SANS REMPLACEMENT ==="
grep -rn "outline.*none\|outline: 0\|outline:0" \
  --include="*.css" --include="*.tsx" \
  | grep -v "focus-visible\|focus:ring" \
  | grep -v node_modules

# 7. Vérifier le lang sur html
echo "=== LANG SUR HTML ==="
grep -rn "<html" --include="*.tsx" --include="*.html" \
  | grep -v 'lang=' \
  | grep -v node_modules

# 8. Skip link
echo "=== SKIP LINK ==="
grep -rn 'href="#main"\|href="#content"' --include="*.tsx" | grep -v node_modules \
  || echo "ABSENT — À créer"
```

---

## 🔧 PHASE 2 — CORRECTIONS PAR TYPE

### A11Y-01 — Ajouter le lang sur <html>

```tsx
// app/layout.tsx — Next.js App Router
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">   {/* ← Toujours spécifier la langue */}
      <body>{children}</body>
    </html>
  )
}

// pages/_document.tsx — Next.js Pages Router
<Html lang="fr">
```

---

### A11Y-02 — Ajouter le Skip Link (navigation clavier)

```tsx
// Dans le layout principal, AVANT tout autre contenu
// components/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={[
        'sr-only focus:not-sr-only',          // invisible sauf au focus
        'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
        'focus:px-4 focus:py-2',
        'focus:bg-[var(--color-surface-base)] focus:text-[var(--color-text-primary)]',
        'focus:rounded-[var(--radius-lg)] focus:shadow-[var(--shadow-lg)]',
        'focus:border focus:border-[var(--color-primary)]',
        'focus:font-medium focus:text-sm',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
      ].join(' ')}
    >
      Aller au contenu principal
    </a>
  )
}

// Dans le layout, ajouter l'id sur le main
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

---

### A11Y-03 — Corriger les aria-live pour les messages dynamiques

```tsx
// Pour les messages d'erreur, confirmations, notifications qui apparaissent dynamiquement
// ❌ AVANT
<p className="error">{errorMessage}</p>

// ✅ APRÈS
<p role="alert" aria-live="assertive" className="error">
  {errorMessage}
</p>

// Pour les updates moins urgentes (succès, info)
<p aria-live="polite" className="success">
  {successMessage}
</p>
```

---

### A11Y-04 — Navigation clavier dans les menus

```tsx
// ❌ AVANT — Menu sans gestion clavier
<ul className="menu">
  <li onClick={() => navigate('/')}>Accueil</li>
  <li onClick={() => navigate('/profil')}>Profil</li>
</ul>

// ✅ APRÈS — Menu accessible
<nav aria-label="Navigation principale">
  <ul role="list" className="menu">
    <li>
      <a href="/" aria-current={isActive('/') ? 'page' : undefined}>
        Accueil
      </a>
    </li>
    <li>
      <a href="/profil" aria-current={isActive('/profil') ? 'page' : undefined}>
        Profil
      </a>
    </li>
  </ul>
</nav>
```

---

### A11Y-05 — Accordéons et menus déroulants

```tsx
// ❌ AVANT — Accordéon non accessible
<div onClick={toggle}>
  <h3>Question</h3>
  {open && <p>Réponse</p>}
</div>

// ✅ APRÈS — Accordéon ARIA correct
<div className="accordion-item">
  <h3>
    <button
      type="button"
      aria-expanded={open}
      aria-controls={`panel-${id}`}
      id={`header-${id}`}
      onClick={toggle}
      className="accordion-trigger"
    >
      Question
      <span aria-hidden="true" className={open ? 'rotate-180' : ''}>▼</span>
    </button>
  </h3>
  <div
    id={`panel-${id}`}
    role="region"
    aria-labelledby={`header-${id}`}
    hidden={!open}
  >
    <p>Réponse</p>
  </div>
</div>
```

---

### A11Y-06 — Tableaux de données

```tsx
// ❌ AVANT — Tableau sans sémantique
<div className="table">
  <div className="row header">
    <div>Nom</div><div>Date</div><div>Montant</div>
  </div>
  {data.map(row => (
    <div className="row">
      <div>{row.name}</div><div>{row.date}</div><div>{row.amount}</div>
    </div>
  ))}
</div>

// ✅ APRÈS — Tableau sémantique
<div role="region" aria-label="Liste des factures" className="overflow-auto">
  <table className="w-full">
    <caption className="sr-only">Liste des factures avec nom, date et montant</caption>
    <thead>
      <tr>
        <th scope="col">Nom</th>
        <th scope="col">
          <button type="button" aria-label="Trier par date">
            Date
            <span aria-hidden>↕</span>
          </button>
        </th>
        <th scope="col" className="text-right">Montant</th>
      </tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.date}</td>
          <td className="text-right">{row.amount}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

### A11Y-07 — Modals et Drawers

```tsx
// Une modal accessible DOIT :
// 1. Avoir role="dialog" aria-modal="true"
// 2. Avoir un aria-labelledby pointant vers le titre
// 3. Gérer le focus trap (utiliser @radix-ui/react-dialog ou focus-trap-react)
// 4. Se fermer avec Escape
// 5. Remettre le focus sur l'élément déclencheur à la fermeture

// ✅ Avec Radix UI (recommandé)
import * as Dialog from '@radix-ui/react-dialog'

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <Button>Ouvrir</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
    <Dialog.Content
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6"
      aria-describedby="dialog-desc"
    >
      <Dialog.Title>Titre de la modal</Dialog.Title>
      <Dialog.Description id="dialog-desc" className="sr-only">
        Description de ce que fait cette modal
      </Dialog.Description>
      {/* contenu */}
      <Dialog.Close asChild>
        <Button variant="ghost" aria-label="Fermer">✕</Button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

### A11Y-08 — Focus visible stylé

```css
/* Remplacer dans globals.css */

/* ❌ AVANT — souvent trouvé dans les projets */
* { outline: none; }
button:focus { outline: none; }

/* ✅ APRÈS — focus visible stylé ET beau */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Supprimer l'outline uniquement pour les clics souris, pas le clavier */
:focus:not(:focus-visible) {
  outline: none;
}
```

---

### A11Y-09 — Indicateurs de statut (pas seulement la couleur)

```tsx
// ❌ AVANT — couleur seule pour indiquer le statut
<span className="text-green-500">Actif</span>
<span className="text-red-500">Inactif</span>

// ✅ APRÈS — couleur + texte + icône
<span className="flex items-center gap-1 text-green-700">
  <span aria-hidden="true">●</span>
  <span>Actif</span>
</span>

// OU avec aria-label explicite
<span
  className="status-dot bg-green-500"
  aria-label="Statut : actif"
  role="img"
/>
```

---

## 📋 CHECKLIST FINALE

Après toutes les corrections, vérifier :

```bash
# Résumé de ce qui a été corrigé
echo "=== VÉRIFICATION POST-FIX ==="

# Inputs sans label restants
REMAINING=$(grep -rn "<input\b" --include="*.tsx" | grep -v "aria-label\|id=" | grep -v node_modules | wc -l)
echo "Inputs sans label restants : $REMAINING"

# Images sans alt restantes  
REMAINING=$(grep -rn "<img\b" --include="*.tsx" | grep -v "alt=" | grep -v node_modules | wc -l)
echo "Images sans alt restantes : $REMAINING"

# Lang sur html
grep -rn '<html' --include="*.tsx" | grep 'lang=' | head -3
```

```bash
# Logger
cat >> FIXES-APPLIED.md << EOF

## ✅ ACCESSIBILITÉ — Corrections appliquées
- Skip link : [ajouté/déjà présent]
- lang sur html : [ajouté/déjà présent]
- Images avec alt : [N ajoutés]
- Inputs avec label : [N corrigés]
- Boutons avec aria-label : [N corrigés]
- Focus visible : [CSS corrigé/déjà OK]
- Liens invalides corrigés : [N]
EOF
```
