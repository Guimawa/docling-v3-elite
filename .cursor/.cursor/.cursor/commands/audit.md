---
name: audit
description: Lance un audit (code, security, architecture). Usage: /audit code|security|architecture [scope]
---

# Audit

Lance un audit de qualité. Types : `code`, `security`, `architecture`.

## Workflow

1. Lire le prompt correspondant dans `docs/prompts/AUDIT-{type}.md`
2. Adapter le scope si fourni (ex. `/audit security auth`)
3. Exécuter l'analyse selon le format du prompt
4. Produire le rapport (conformité, risques, recommandations, score)

## Types

| Type | Fichier prompt | Focus |
|------|----------------|-------|
| code | AUDIT-CODE.md | Conformité, risques, dette technique |
| security | AUDIT-SECURITY.md | Injection, auth, secrets |
| architecture | AUDIT-ARCHITECTURE.md | Couches, dépendances, évolutivité |

## Exemple

`/audit security` → audit sécurité complet
`/audit code backend/services/` → audit ciblé sur services
