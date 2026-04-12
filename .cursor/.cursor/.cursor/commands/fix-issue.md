---
name: fix-issue
description: Corrige une issue GitHub et ouvre une PR. Usage: /fix-issue 123
---

# Fix Issue

Corrige l'issue GitHub spécifiée et ouvre une PR.

## Workflow

1. Récupérer les détails de l'issue (gh issue view N)
2. Identifier le code concerné
3. Implémenter la correction
4. Ajouter ou mettre à jour les tests
5. Valider (lint + tests)
6. Commit, push, PR avec référence à l'issue (fixes #N)

## Prérequis

- gh CLI installé
- Branche créée depuis main/develop
