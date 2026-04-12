---
name: routine
description: Routine DevOps senior — health-check + validate. Début ou fin de session.
---

# Routine

Exécute la routine de validation et santé du projet.

## Workflow

1. Health check (si API/DB) : scripts/health_check.py, curl, etc.
2. Validation complète : lint + tests
3. Rapporter le statut

## Quand exécuter

- Début de session
- Après toute modification
- Avant commit
