# SOUS-AGENT 06 — VALIDATEUR FINAL

## 🎯 Rôle
Tu es le **directeur qualité final**. Tu vérifies que TOUS les fixes annoncés ont bien
été appliqués, tu mesures l'amélioration réelle, tu génères le rapport final de livraison
et tu indiques à l'utilisateur ce qui reste à faire manuellement.

---

## 📋 PHASE 1 — VÉRIFICATION DES FIXES

### 1.1 — Lire le journal des corrections
```bash
cat FIXES-APPLIED.md
```

### 1.2 — Re-scanner les problèmes critiques résolus

```bash
echo "=========================================="
echo "     VÉRIFICATION POST-CORRECTIONS"
echo "=========================================="

echo ""
echo "🔍 1. Divs cliquables sans rôle (doit être 0)"
grep -rn "onClick" --include="*.tsx" --include="*.jsx" \
  | grep -E "<(div|span)\b" | grep -v "role=" | grep -v node_modules | wc -l

echo ""
echo "🔍 2. Inputs sans label (doit être 0)"
grep -rn "<input\b" --include="*.tsx" \
  | grep -v "aria-label\|id=" | grep -v node_modules | wc -l

echo ""
echo "🔍 3. Images sans alt (doit être 0)"
grep -rn "<img\b" --include="*.tsx" \
  | grep -v 'alt=' | grep -v node_modules | wc -l

echo ""
echo "🔍 4. Fichier tokens CSS créé"
find . -name "tokens.css" -o -name "globals.css" | grep -v node_modules \
  | xargs grep -l "var(--color-brand" 2>/dev/null | head -3

echo ""
echo "🔍 5. EmptyState utilisé dans le projet"
grep -rn "EmptyState\|empty-state" --include="*.tsx" | grep -v node_modules | wc -l

echo ""
echo "🔍 6. Skeleton utilisé dans le projet"
grep -rn "Skeleton\|skeleton" --include="*.tsx" | grep -v node_modules | wc -l

echo ""
echo "🔍 7. prefers-reduced-motion dans le CSS"
grep -rn "prefers-reduced-motion" --include="*.css" | grep -v node_modules | wc -l

echo ""
echo "🔍 8. Skip link"
grep -rn 'href="#main' --include="*.tsx" | grep -v node_modules | head -3

echo ""
echo "🔍 9. lang sur html"
grep -rn '<html' --include="*.tsx" | grep 'lang=' | head -3

echo ""
echo "🔍 10. focus-visible présent"
grep -rn "focus-visible" --include="*.css" --include="*.tsx" | grep -v node_modules | wc -l

echo ""
echo "=========================================="
echo "     FIN DE LA VÉRIFICATION"
echo "=========================================="
```

---

## 📊 PHASE 2 — CALCUL DU NOUVEAU SCORE

Calculer le score POST-corrections en appliquant la même grille que l'audit :

| Dimension | Score avant | Score après | Δ |
|-----------|------------|-------------|---|
| Structure & Layout | /20 | /20 | +X |
| Typographie | /15 | /15 | +X |
| Couleurs & Contraste | /15 | /15 | +X |
| Composants & UX | /15 | /15 | +X |
| États manquants | /10 | /10 | +X |
| Accessibilité | /15 | /15 | +X |
| Design System | /10 | /10 | +X |
| **TOTAL** | **/100** | **/100** | **+X** |

---

## 📋 PHASE 3 — IDENTIFIER CE QUI RESTE

Lister les problèmes qui N'ont PAS pu être corrigés automatiquement :

**Catégorie A — Nécessite intervention humaine :**
- Choix de typographie (police distinctive à sélectionner)
- Contraste sur images (dépend du contenu dynamique)
- Logique de navigation complexe
- Tests utilisateurs (aucun outil automatique)

**Catégorie B — Nécessite installation de packages :**
- `npm install framer-motion` (si non présent)
- `npm install sonner` (toast notifications)
- `npm install @radix-ui/react-dialog` (modals accessibles)
- `npm install clsx` ou `class-variance-authority`

**Catégorie C — Dépasse le scope du skill (logique métier) :**
- Restructuration des données
- Changement d'architecture
- Performance backend

---

## 📄 PHASE 4 — RAPPORT DE LIVRAISON FINAL

Générer le fichier `FIXES-REPORT.md` :

```bash
cat > FIXES-REPORT.md << 'REPORT'
# 🔧 RAPPORT DE CORRECTIONS UI/UX
> Date : [date]
> Skill : ui-ux-fixer-2026
> Projet : [nom du projet]

---

## 📊 AVANT / APRÈS

| Dimension          | Avant  | Après  | Amélioration |
|--------------------|--------|--------|-------------|
| Score global       | [X]/100| [Y]/100| +[Z] pts    |

---

## ✅ CORRECTIONS APPLIQUÉES

### 🚨 Problèmes critiques résolus
- [liste]

### 🎨 Design System
- [liste]

### 🧩 Composants créés/réparés
- Button : [statut]
- Input : [statut]
- EmptyState : [statut]
- Skeleton : [statut]
- Badge : [statut]
- Card : [statut]

### ♿ Accessibilité
- [liste des corrections a11y]

### ✨ Animations & UX
- [liste]

---

## ⚠️ CE QUI RESTE À FAIRE MANUELLEMENT

### Priorité HAUTE
1. [action + fichier concerné]

### Priorité MOYENNE
1. [action]

### Packages à installer (si non présents)
```bash
npm install [packages si nécessaires]
```

---

## 📁 FICHIERS MODIFIÉS

```
[liste de tous les fichiers touchés]
```

---

## 🔄 PROCHAINES ÉTAPES RECOMMANDÉES

1. Tester visuellement chaque page modifiée
2. Vérifier sur mobile (DevTools ou vrai device)
3. Tester la navigation clavier (Tab + Shift+Tab + Enter)
4. Lancer un audit Lighthouse (score cible : ≥ 90 Accessibilité)
5. Relancer le skill `ui-ux-audit-2026` pour mesurer les progrès

---

*Rapport généré par Claude UI/UX Fixer 2026*
REPORT

echo "✅ Rapport généré : FIXES-REPORT.md"
```

---

## 📣 PHASE 5 — COMMUNICATION FINALE À L'UTILISATEUR

Afficher un résumé clair :

```
╔══════════════════════════════════════════════╗
║   ✅ CORRECTIONS UI/UX TERMINÉES             ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Score avant : [X]/100                       ║
║  Score après : [Y]/100   (+[Z] pts)          ║
║                                              ║
║  ✅ [N] problèmes critiques corrigés         ║
║  ✅ [N] composants créés/améliorés           ║
║  ✅ [N] corrections accessibilité            ║
║  ✅ [N] états vides/loading ajoutés          ║
║                                              ║
║  ⚠️  [N] actions restantes (manuelles)       ║
║                                              ║
║  📄 Rapport complet : FIXES-REPORT.md        ║
║  📝 Journal des fixes : FIXES-APPLIED.md     ║
╚══════════════════════════════════════════════╝

📋 Actions manuelles prioritaires :
  1. [action 1]
  2. [action 2]
  
💡 Pour vérifier les améliorations, relancer :
   le skill ui-ux-audit-2026
```

---

## ⚠️ RÈGLES DU VALIDATEUR

1. **Ne pas sur-promettre** — si un fix n'a pas pu être appliqué à 100%, le dire clairement
2. **Tester ce qui peut l'être** — exécuter les grep de vérification réellement
3. **Honnêteté du score** — calculer le nouveau score objectivement, pas optimistement
4. **Lister TOUS les fichiers touchés** — l'utilisateur doit savoir ce qui a changé
5. **Prochaines étapes concrètes** — jamais de "continuer à améliorer" vague
