---
name: review
description: (Security Reviewer) Lance la revue code. Use before merge or for security-critical changes.
---

# Review — Security Reviewer

Exécute la revue de code. **Applicable à tout projet.**

## Workflow

1. Lancer le lint du projet (npm run lint, ruff, eslint, etc.)
2. Vérifier manuellement : injection, auth, secrets
3. Bloquer si vulnérabilités

## Adapter au projet

Consulter Makefile, package.json, scripts/ pour les commandes de revue existantes.
