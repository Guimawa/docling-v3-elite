---
name: execute
description: Checklist pré ou post exécution. Usage: /execute pre|post
---

# Execute

Checklist pré ou post modification. Garantit la qualité de l'exécution.

## /execute pre

Avant de modifier. Lire `docs/prompts/EXECUTION-PRE.md`.

- Git status
- Scope confirmé
- Baseline tests
- Plan si complexe

## /execute post

Après modification. Lire `docs/prompts/EXECUTION-POST.md`.

- Lint vert
- Tests verts
- Pas de régression
- Doc à jour

## Principe

Ne jamais modifier sans pre-check. Ne jamais dire "c'est fait" sans post-check.
