# Migrations SQL de référence (Neon / PostgreSQL)

Documentation opérationnelle pour les scripts sous ce dossier. Le schéma canonique reste **Alembic** (`apps/api/migrations/versions/`).

- **`migration_catalogue_to_produits.sql`** : renommage idempotent `catalogue` → `produits` (bases legacy uniquement).
- **`migration_attributes_produits.sql`** : complément index / vue matérialisée (données toujours dans `produits`).
- **`PROMPT_INTEGRATION_ORDER.md`** : ordre d’intégration strict (checklist).

## Rôle du fichier SQL

| Source de vérité | Contenu |
|------------------|---------|
| **Alembic a001–a013** | Tables, contraintes, index GIN/trgm, colonnes `attributes` et enrichissement fournisseur |
| **`migration_attributes_produits.sql`** | Index btree partiel sur `prix_remise_ht`, vue matérialisée `produits_stats`, index unique pour refresh concurrent |

Éviter de dupliquer dans le `.sql` ce qu’Alembic crée déjà : en prod, un second GIN sur la même colonne (`designation_fr`, `attributes`, etc.) double stockage et coût d’écriture sans bénéfice.

## Prérequis et ordre d’exécution

1. **`.env` à la racine du monorepo** avec `DATABASE_URL` (chaîne Postgres Neon, host `*.neon.tech`). Il n’existe pas de variable `NEON_*` dédiée dans Docling.

2. **Migrations Alembic** (crée `produits` et tout le reste) :

   ```powershell
   .\scripts\migrate_db.ps1
   ```

3. **Optionnel — complément SQL** (vue stats + index partiel), sans `psql` :

   `uv run --directory apps/api` fixe le répertoire de travail sur `apps/api` : le script Python vit à la racine du repo.

   ```powershell
   cd "g:\chemin\vers\docling"
   uv run --directory apps/api python ../../scripts/apply_sql_neon.py migrations/reference/migration_attributes_produits.sql
   ```

   Ou en une fois après Alembic :

   ```powershell
   .\scripts\migrate_db.ps1 -ApplyReferenceSql
   ```

## Erreur `database "neondb&channel_binding=require" does not exist`

URL Neon du type `.../neondb?sslmode=require&channel_binding=require` : si seul `sslmode` est retiré, il reste `.../neondb&channel_binding=...` sans `?`, et le **nom de base** devient invalide. Le projet normalise le DSN (suppression de la query string) pour Alembic, `Config` et `scripts/apply_sql_neon.py`.

## Erreur `relation "produits" does not exist`

Le `.sql` de référence suppose **`public.produits`** déjà créée par **Alembic**. Exécuter d’abord `migrate_db.ps1`.

## Vue matérialisée : exploitation

Après gros volumes d’écriture sur `produits` :

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.produits_stats;
```

`CONCURRENTLY` exige l’index unique `idx_produits_stats_pk` (défini dans le script). Sans charge critique, un `REFRESH` non concurrent est acceptable en fenêtre de maintenance.

## Ancienne version du script

Si une exécution antérieure a créé des index **redondants** avec Alembic (ex. `idx_produits_designation_trgm` en plus de `idx_trgm_fr`), envisager de les supprimer après analyse (`pg_stat_user_indexes`) pour réduire la dette d’écriture.
