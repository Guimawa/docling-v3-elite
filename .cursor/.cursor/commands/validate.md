---
name: validate
description: Lance la validation complète du projet. OBLIGATOIRE après toute modification.
---

# Validate

Exécute la chaîne de validation du projet. **Applicable à tout projet.**

## Workflow

1. Lint (npm run lint, ruff, eslint, etc.)
2. Tests (npm test, pytest, etc.)
3. Autres checks du projet (Makefile, scripts)

## Adapter au projet

Identifier les commandes de validation : Makefile, package.json scripts, pyproject.toml, etc.

**L'agent DOIT exécuter la validation après toute modification.** Ne pas dire "c'est fait" si échec.
