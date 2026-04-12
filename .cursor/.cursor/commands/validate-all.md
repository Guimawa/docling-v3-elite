---
name: validate-all
description: Exécute la validation complète — OBLIGATOIRE après modifications. L'agent doit lancer avant de considérer une tâche terminée.
---

# Validate All — Ne pas casser

**L'agent DOIT exécuter cette validation après toute modification de code.**

## Commande unique

```bash
# Canonique (Windows/projet)
.\scripts\validate_all.ps1
```

## Si échec

**Ne pas considérer la tâche terminée.** Corriger les erreurs avant de répondre "c'est fait".
