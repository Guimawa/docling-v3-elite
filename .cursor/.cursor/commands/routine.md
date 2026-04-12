---
name: routine
description: Routine DevOps senior — health-check, validate-all, review. Exécuter en début/fin de session.
---

# Routine DevOps Senior

Exécute la routine de validation et santé du projet.

## Étapes

1. **Health check** (si API/DB) :
   ```bash
   make health-check
   ```

2. **Validation complète** :
   ```bash
   make validate-all
   ```

3. **Review** (optionnel, avant commit critique) :
   ```bash
   make review
   ```

## Quand exécuter

- **Début de session** : health-check
- **Après toute modification** : validate-all
- **Avant commit** : validate-all
- **Feature critique** : + review

## Référence

- Règle : `.cursor/rules/senior-devops-workflow.mdc`
- Workflow : `docs/workflow/MULTI-AGENT-WORKFLOW.md`
