---
name: pr
description: Crée un commit, push et ouvre une pull request.
---

# PR

Crée une pull request pour les changements actuels.

## Workflow

1. Examiner les changements (git diff, git status)
2. Rédiger un message de commit clair
3. Commit et push vers la branche courante
4. Créer la PR (gh pr create ou équivalent)
5. Retourner l'URL de la PR

## Prérequis

- gh CLI installé pour GitHub
- Changements validés (lint + tests verts)
