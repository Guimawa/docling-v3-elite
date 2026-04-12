---
name: verify
description: Vérification complète avant "c'est fait". Evidence over claims.
---

# Verify

Vérifie que tout est OK avant de déclarer une tâche terminée.

## Workflow

1. Lint (ruff, eslint, etc.)
2. Tests (pytest, npm test, etc.)
3. make validate-all si présent
4. Seulement si tout vert : "c'est fait"

## Usage

Exécuter `scripts/verify-before-completion.sh` ou la chaîne de validation du projet.

## Principe

Evidence over claims — ne jamais dire "c'est fait" sans avoir exécuté et vérifié les résultats.
