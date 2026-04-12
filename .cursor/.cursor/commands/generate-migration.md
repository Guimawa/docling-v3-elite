---
name: generate-migration
description: Crée une nouvelle migration Alembic. Use when schema changes are needed. Invokes migration-assistant agent.
---

# Generate Migration

Crée une nouvelle migration Alembic pour Docling.

## Workflow

1. Décrire les changements de schéma souhaités (tables, colonnes, index, contraintes)
2. Vérifier la dernière migration : `migrations/versions/` (dernier fichier aXXX_*.py)
3. Créer la migration :

```bash
alembic revision -m "description_courte"
```

4. Éditer le fichier généré : remplir `upgrade()` et `downgrade()`
5. Tester : `alembic upgrade head` puis `alembic downgrade -1` puis `upgrade head`

## Conventions

- Nommage : `aXXX_description.py` (XXX = prochain numéro)
- down_revision : ID de la migration précédente
- Toujours implémenter downgrade pour rollback

## Référence

Voir l'agent `migration-assistant` pour les détails du schéma et des conventions.
