---
name: test
description: Génère ou exécute les tests du projet.
---

# Test

Génère ou exécute les tests. **Applicable à tout projet.**

## Workflow

1. Identifier la stack de tests (pytest, vitest, jest, etc.)
2. Si génération : créer tests selon patterns existants dans tests/ ou __tests__/
3. Si exécution : lancer la suite (npm test, pytest, etc.)
4. Rapporter les résultats

## TDD

Si TDD demandé : écrire les tests d'abord, confirmer qu'ils échouent, puis implémenter.
