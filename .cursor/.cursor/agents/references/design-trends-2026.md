# Tendances Design UI/UX 2026

Référence pour l'agent **Visual Design Expert**. Sources : [Landdding](https://landdding.com/blog/ui-design-trends-2026), [Groovy Web](https://www.groovyweb.co/blog/ui-ux-design-trends-ai-apps-2026), [Netquall](https://www.netquall.com/blog/2026-design-trends/).

---

## 1. Bento Grid (Layout modulaire)

- **67%** des landing SaaS utilisent des layouts modulaires à cartes de tailles variées
- Inspiré des bento box japonaises : contenu organisé en tuiles rectangulaires arrondies
- **Bento 2.0** : tuiles interactives (hover, expand, drag & drop), ratios variables

**Pourquoi ça marche** : hiérarchie visuelle encodée dans la structure, moins de fatigue décisionnelle, scan rapide.

**Où l'utiliser** : dashboards, landing features, catalogues, collections.

**Implémentation** : CSS Grid avec `grid-template-areas` ou Tailwind `grid-cols-*` avec spans variables. Gaps cohérents, border-radius uniforme.

---

## 2. Motion comme feedback utile

- Micro-interactions **fonctionnelles** (pas décoratives)
- Boutons : feedback tactile (scale, couleur) à l’interaction
- Skeleton loading : placeholders animés pendant le chargement
- Transitions courtes (150–300 ms) pour les changements d’état

**Où l’utiliser** : boutons, chargements, apparition de contenu, feedback d’actions.

**Accessibilité** : respecter `prefers-reduced-motion: reduce` (réduire ou désactiver les animations).

---

## 3. Dark mode comme base

- **45%** des nouveaux SaaS proposent le dark en défaut
- **82%** des utilisateurs d’apps IA préfèrent le dark

**Palette dark efficace** :
- Fond : `#121212` à `#1a1a1a` (éviter le noir pur)
- Texte : `#e0e0e0` à `#f0f0f0`
- Élévation : surfaces plus claires pour la profondeur (pas de drop shadows)

**À éviter** : blanc pur sur noir pur (contraste trop dur).

---

## 4. Glassmorphism évolué

- `backdrop-filter: blur()` bien supporté en 2026
- Panneaux translucides, overlays floutés, ombres légères

**Où l’utiliser** : navbar, modals, overlays, pricing tables.

**À éviter** : si ça dégrade la lisibilité ou le contraste WCAG.

---

## 5. Interfaces IA-first

- **Streaming** : affichage progressif du texte généré
- **Skeleton loading** : indicateurs de chargement structurés
- **Indicateurs de confiance** : citations, sources, options de régénération
- **Personnalisation** : layouts et couleurs adaptés au contexte utilisateur

---

## 6. Performance perçue

- Skeleton screens au lieu de spinners génériques
- Optimistic UI : afficher le résultat attendu avant confirmation serveur
- Chargement progressif : contenu essentiel d’abord, reste en arrière-plan

**Objectif** : temps de chargement perçu < 2,5 s sur mobile.

---

## 7. Accessibilité-first

- Contraste WCAG AA minimum
- Focus visible
- Hiérarchie typographique claire
- `prefers-reduced-motion` pris en compte

---

## 8. Considérations éthiques

- Éviter les dark patterns
- Personnalisation transparente (explications, contrôles)
- Design sobre pour limiter la surcharge attentionnelle

---

## Ressources

- [Design Arena](https://www.designarena.ai/) — benchmarks visuels, prompts pour générer des maquettes
- [Landdding UI Trends 2026](https://landdding.com/blog/ui-design-trends-2026)
- [Bento Grid 2026](https://desinance.com/design/bento-grid-web-design/)
