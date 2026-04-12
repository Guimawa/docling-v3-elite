---
name: validate
description: Exécute lint + tests complets. Obligatoire avant "c'est fait".
---

# Validate

Exécute la chaîne de validation complète. **Applicable à tout projet.**

## Workflow

1. Lint backend (ruff, eslint, etc.)
2. Lint frontend si présent
3. Tests unitaires
4. Tests d'intégration si configurés

## Adapter au projet

- make validate-all
- npm run lint && npm test
- pytest && npm test

Ne jamais dire "c'est fait" sans validation réussie.
