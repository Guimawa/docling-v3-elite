---
name: redesign
description: (Visual Design Expert) Moderniser le visuel de l'app selon tendances 2026. Use for UI refresh, design updates.
---

# Redesign — Visual Design Expert

Modernise le visuel de l'app selon les **tendances 2026**. **Applicable à docling-pwa et tout projet frontend.**

## Workflow

1. Lire `.cursor/agents/references/design-trends-2026.md`
2. Lire **`.cursor/agents/references/refonte-docling-pwa.md`** — instructions détaillées par page
3. Suivre l'ordre : Layout → Navbar → Scan → Catalogue → Validation → autres
4. Implémenter incrémentalement (une page ou un composant à la fois)
5. Exécuter `make validate-all` après chaque modification

## Cibles typiques

- Layout → Bento grid, cartes modulaires
- Couleurs → Dark mode, palette cohérente
- Feedback → Micro-interactions, skeleton loading
- Nav/Modals → Glassmorphism léger

## Outils

- [Design Arena](https://www.designarena.ai/) pour inspiration et prompts de génération
- Tailwind 4 pour les styles
- Conventions : `.cursor/rules/frontend-conventions.mdc`
