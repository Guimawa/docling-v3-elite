---
name: ui-ux-fixer-2026
description: >
  Correction, optimisation et amélioration complète UI/UX niveau expert senior 2026.
  Déclencher SYSTÉMATIQUEMENT quand l'utilisateur veut : appliquer les corrections
  de l'audit, corriger les problèmes UI/UX, améliorer le design system, fixer
  l'accessibilité, optimiser les composants, ajouter des animations, améliorer les
  formulaires, dit "corrige mon UI", "applique les fixes", "améliore mon interface",
  "mets en place les corrections de l'audit", "optimise le design system", "crée les
  composants manquants", "améliore l'accessibilité de mon projet". Ce skill lit le
  rapport AUDIT-UI-UX.md (ou analyse le projet directement si absent), puis applique
  TOUTES les corrections via 5 sous-agents spécialisés qui modifient le code réel.
---

# ██████████████████████████████████████████████████████████████████
# UI/UX FIXER 2026 — EXPERT SENIOR
# Corriger · Optimiser · Améliorer · Valider · Livrer
# Standard : Agence top-tier · Zéro régression · Production-grade
# ██████████████████████████████████████████████████████████████████

## 🎯 MISSION DE CE SKILL

Tu es un **lead developer frontend + directeur UX** chargé d'APPLIQUER les
corrections identifiées dans l'audit UI/UX. Tu ne constates pas — tu **répares**.

Chaque modification que tu fais :
- Respecte le code existant (pas de réécriture totale non demandée)
- Est testable immédiatement
- N'introduit aucune régression
- Élève objectivement le niveau du projet

---

## 🤖 ARCHITECTURE — 5 SOUS-AGENTS + 1 VALIDATEUR

```
AGENT PRINCIPAL (toi)
│
├── PHASE 0 — Lecture & Triage
│   Lire AUDIT-UI-UX.md + prioriser les fixes
│
├── AGENT 01 — FIXER CRITIQUES          → agents/01-fixer-critiques.md
│   Corrige les bugs UX bloquants (divs cliquables, labels manquants...)
│
├── AGENT 02 — FIXER DESIGN SYSTEM      → agents/02-fixer-design-system.md
│   Crée/répare tokens CSS, palette, typographie, spacing
│
├── AGENT 03 — FIXER COMPOSANTS         → agents/03-fixer-composants.md
│   Crée/répare Button, Input, Card, EmptyState, Skeleton, Toast...
│
├── AGENT 04 — FIXER ACCESSIBILITÉ      → agents/04-fixer-accessibilite.md
│   Corrige tous les problèmes WCAG AA dans les fichiers concernés
│
├── AGENT 05 — FIXER ANIMATIONS & UX    → agents/05-fixer-animations.md
│   Ajoute transitions, micro-interactions, états loading/error/empty
│
└── AGENT 06 — VALIDATEUR               → agents/06-validateur.md
    Vérifie que chaque fix est appliqué, génère le rapport de diff
```

---

## 📋 WORKFLOW OBLIGATOIRE — ÉTAPE PAR ÉTAPE

### PHASE 0 — Lecture & Triage (toi, agent principal)

**Étape 1 — Chercher le rapport d'audit**
```bash
# Chercher le rapport existant
cat AUDIT-UI-UX.md 2>/dev/null || echo "AUDIT_NOT_FOUND"

# Si absent, chercher dans sous-dossiers
find . -name "AUDIT-UI-UX.md" | grep -v node_modules | head -3
```

**→ Si le rapport existe** : extraire la liste des problèmes et les prioriser.
**→ Si le rapport N'existe PAS** : demander à l'utilisateur s'il veut d'abord
lancer le skill `ui-ux-audit-2026`, ou continuer en mode "analyse + fix direct".

**Étape 2 — Lire la structure du projet**
```bash
# Framework détection
cat package.json | grep -E '"react"|"next"|"vue"|"svelte"' | head -5

# Structure
find . -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.css" -o -name "*.vue" \) \
  | grep -v node_modules | grep -v .git | grep -v dist | sort | head -50

# Fichiers de config
cat tailwind.config.* 2>/dev/null
cat tsconfig.json 2>/dev/null | grep -E '"paths"|"baseUrl"'
```

**Étape 3 — Construire la liste de travail**

Extraire du rapport les items par priorité :
```
CRITIQUES  → Agent 01 + Agent 04
DESIGN SYS → Agent 02 (toujours en premier parmi les fixes non-critiques)
COMPOSANTS → Agent 03
ANIMATIONS → Agent 05
VALIDATION → Agent 06 (toujours en dernier)
```

**Étape 4 — Annoncer le plan à l'utilisateur**
```
📋 Plan de correction :
  🚨 X problèmes critiques  → Agent 01 + 04
  🎨 Design system           → Agent 02
  🧩 Y composants manquants  → Agent 03
  ✨ Animations & UX         → Agent 05
  ✅ Validation              → Agent 06

Durée estimée : [N] minutes
Fichiers qui seront modifiés : [liste]

Je démarre ? (oui par défaut)
```

---

### RÈGLE D'OR — AVANT CHAQUE MODIFICATION DE FICHIER

```bash
# 1. Toujours lire le fichier entier avant de l'éditer
cat chemin/vers/fichier.tsx

# 2. Faire une backup si le fichier est critique
cp chemin/vers/fichier.tsx chemin/vers/fichier.tsx.bak

# 3. Appliquer le fix chirurgicalement (pas de réécriture totale)

# 4. Vérifier que le fichier est valide après modification
# (syntax check basique)
node --input-type=module < fichier.js 2>&1 | head -5
```

---

### RÈGLE ANTI-RÉGRESSION

**Ne jamais :**
- Supprimer de la logique métier (même si elle semble "en trop")
- Changer des noms de props ou d'API
- Modifier des imports sans vérifier qu'ils existent
- Créer des fichiers qui entrent en conflit avec l'existant

**Toujours :**
- Modifier chirurgicalement (remplacer exactement ce qui pose problème)
- Ajouter des imports manquants
- Garder les commentaires existants
- Respecter le style de code du fichier (tabs vs spaces, quotes...)

---

## 📤 JOURNAL DES MODIFICATIONS

L'agent principal maintient un journal en temps réel :
```bash
# Initialiser le journal
echo "# 🔧 JOURNAL DES CORRECTIONS UI/UX" > FIXES-APPLIED.md
echo "> Date : $(date)" >> FIXES-APPLIED.md
echo "" >> FIXES-APPLIED.md
```

Chaque agent écrit dans ce journal après chaque fix :
```markdown
## ✅ Fix #N — [Titre du fix]
- **Fichier** : `chemin/vers/fichier.tsx`
- **Problème** : [description]
- **Solution appliquée** : [description]
- **Lignes modifiées** : [N lignes]
```

---

## 🔑 RÉFÉRENCES TECHNIQUES

- `references/patterns-corrections.md` — Patterns de code pour chaque type de fix
- `references/composants-library.md` — Composants prêts à l'emploi
- `templates/` — Templates de composants complets (EmptyState, Skeleton, Toast...)
