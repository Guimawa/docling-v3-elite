# 🗄️ 05 — AUDIT BASE DE DONNÉES
# PostgreSQL · Migrations Alembic · Schémas · Index · Intégrité
# Analyse exhaustive — Zéro hypothèse

---

## D1 — SCHÉMA DE LA BASE DE DONNÉES

```bash
# Extraire le schéma complet depuis Alembic ou directement depuis la DB

# Option A : depuis les migrations Alembic
grep -rn "op.create_table\|sa.Column\|op.add_column" migrations/versions/ | \
  sort > /tmp/db_schema_from_migrations.txt
cat /tmp/db_schema_from_migrations.txt

# Option B : depuis une DB existante (si accessible)
psql $DATABASE_URL -c "\dt" 2>/dev/null
psql $DATABASE_URL -c "\d+ users" 2>/dev/null
psql $DATABASE_URL -c "\d+ products" 2>/dev/null
psql $DATABASE_URL -c "\d+ jobs" 2>/dev/null
psql $DATABASE_URL -c "\d+ [autres tables]" 2>/dev/null

# Option C : depuis le code Python (SQLAlchemy models si définis)
grep -rn "class.*Base\|Table\|Column" backend/ --include="*.py"
```

### Carte des tables

| Table | Colonnes | PK | FK | Index | Contraintes | Rôle |
|-------|---------|----|----|-------|-------------|------|
| users | [lister] | id | — | email | unique(email) | |
| products | [lister] | id | user_id | | | |
| jobs | [lister] | id | user_id | | | |
| [AGENT: toutes les tables] | | | | | | |

---

## D2 — ANALYSE DES MIGRATIONS

```bash
# Lister toutes les migrations dans l'ordre
ls -la migrations/versions/ | sort

# Vérifier l'ordre des révisions
grep -h "^revision\|^down_revision" migrations/versions/*.py | \
  paste - - | sort
```

### Pour CHAQUE migration :

```
Format d'analyse :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration : [hash]_[description].py
Révision  : [up_revision] → [down_revision]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

upgrade() :
  Lignes N-N : [ce que ça fait]
  ├── op utilisée : create_table / add_column / create_index / etc.
  ├── Types cohérents avec le code Python : OUI/NON
  ├── Index créés sur les colonnes de recherche : OUI/NON
  ├── Idempotent (IF NOT EXISTS) : OUI/NON
  ├── Nullable/NotNull cohérent : OUI/NON
  └── PROBLÈME : [ou "Aucun"]

downgrade() :
  ├── Implémenté : OUI/NON
  ├── Inverse exact de upgrade() : OUI/NON
  ├── Données perdues en cas de rollback : OUI/NON
  └── PROBLÈME : [ou "Aucun"]

Score : /10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Tableau migrations

| Migration | Description | upgrade() | downgrade() | Idempotent | Score | Problème |
|-----------|-------------|-----------|-------------|------------|-------|---------|
| [hash 1] | | | | | /10 | |
| [hash 2] | | | | | /10 | |
| [AGENT: toutes] | | | | | | |

---

## D3 — ANALYSE DES INDEX

```bash
# Index existants depuis les migrations
grep -rn "op.create_index\|Index\|index=True" migrations/versions/ backend/

# Questions à répondre pour chaque table :
```

### Checklist index critiques

```
Pour chaque table, vérifier que les colonnes suivantes sont indexées :

TABLE users :
  □ email → index UNIQUE (pour login rapide)
  □ id → PK auto

TABLE products :
  □ user_id → index (isolation multi-tenant)
  □ designation_fr → index GIN ou tsvector (recherche fulltext)
  □ famille → index (filtre fréquent)
  □ fournisseur → index (filtre fréquent)
  □ (user_id, fournisseur) → index composite ?
  □ (user_id, famille) → index composite ?

TABLE jobs :
  □ user_id → index
  □ status → index (filtre par statut)
  □ created_at → index (tri par date)

INDEX MANQUANTS DÉTECTÉS :
  [AGENT: lister les WHERE fréquents sans index correspondant]
```

### Tableau index

| Table | Colonne(s) | Index existe | Type | Sélectivité | À créer |
|-------|-----------|-------------|------|------------|--------|
| users | email | | UNIQUE | Haute | |
| products | user_id | | BTREE | Moyenne | |
| products | designation_fr | | GIN ? | | |
| [AGENT: compléter] | | | | | |

---

## D4 — ANALYSE DES REQUÊTES SQL

```bash
# Extraire toutes les requêtes SQL du code backend
grep -rn '""".*SELECT\|""".*INSERT\|""".*UPDATE\|""".*DELETE\|f"""' \
  backend/ --include="*.py" | head -50

grep -rn "conn.execute\|conn.fetch\|conn.fetchrow\|pool.acquire" \
  backend/ --include="*.py"
```

### Pour CHAQUE requête SQL :

```
Questions :
  □ Paramétrisée ($1, $2...) → pas d'injection possible ?
  □ WHERE sur une colonne indexée ?
  □ ILIKE '%term%' → index non utilisé (table scan) ?
  □ JOIN sans index sur la colonne joinée ?
  □ ORDER BY sur une colonne non indexée ?
  □ LIMIT manquant sur les gros résultats ?
  □ COUNT(*) vs COUNT(col) → performance ?
  □ Utilise-t-elle des fonctions dans le WHERE (désactive l'index) ?
```

### Tableau requêtes SQL

| Fichier:Ligne | Opération | Table | WHERE indexé | LIMIT | Injection | Score | Problème |
|---------------|-----------|-------|-------------|-------|-----------|-------|---------|
| [AGENT: chaque requête] | | | | | | | |

---

## D5 — INTÉGRITÉ DES DONNÉES

```
Vérifications d'intégrité :

□ ON DELETE CASCADE ou SET NULL configuré sur les FK ?
  → Si user supprimé → ses products/jobs supprimés ?
  → Ou orphelins possibles ?

□ Contraintes CHECK sur les valeurs numériques ?
  → prix >= 0 ?
  → confidence IN ('low', 'medium', 'high') ?

□ Colonnes NOT NULL là où c'est logique ?
  → designation_fr NOT NULL ?
  → user_id NOT NULL sur products ?

□ Unicité garantie par la DB (pas seulement le code) ?
  → UNIQUE constraint sur (user_id, designation_fr, fournisseur) ?
  → Ou doublons possibles si l'API est appelée deux fois ?

□ Types de données corrects ?
  → Prix : NUMERIC(10,2) ou FLOAT ? (NUMERIC plus précis pour l'argent)
  → Dates : TIMESTAMPTZ (avec timezone) ou TIMESTAMP ?
  → IDs : SERIAL, BIGSERIAL ou UUID ?
```

### Tableau intégrité

| Table | FK avec CASCADE | Contraintes CHECK | NOT NULL critiques | Unicité | Doublons possibles |
|-------|----------------|------------------|-------------------|---------|------------------|
| [AGENT: chaque table] | | | | | |

---

## D6 — ISOLATION MULTI-TENANT

```
CRITIQUE DE SÉCURITÉ :
L'app est multi-utilisateurs. Chaque utilisateur doit voir
UNIQUEMENT ses propres données.

Pour CHAQUE requête retournant des données utilisateur :
  □ La clause WHERE inclut-elle user_id = $N ?
  □ L'user_id vient bien du TOKEN (pas d'un paramètre client) ?
  □ Un utilisateur peut-il voir les produits d'un autre ?
  □ Un utilisateur peut-il modifier/supprimer les données d'un autre ?

TEST MENTAL :
  Utilisateur A : user_id = 1
  Utilisateur B : user_id = 2

  GET /api/v1/catalogue avec token de A
  → La requête filtre-t-elle sur user_id = 1 ?
  → Retourne-t-elle UNIQUEMENT les produits de A ?

  DELETE /api/v1/catalogue/produit_de_B avec token de A
  → Retourne 403 ou 404 ?
  → Ou pire : supprime le produit de B ?
```

### Tableau isolation multi-tenant

| Endpoint | Table | user_id dans WHERE | Vient du token | IDOR possible | Sévérité |
|----------|-------|--------------------|----------------|---------------|---------|
| GET /catalogue | products | | | | |
| POST /process | jobs | | | | |
| DELETE /catalogue/{id} | products | | | | |
| GET /jobs/{id} | jobs | | | | |
| GET /export | products + jobs | | | | |
| [AGENT: tous les endpoints avec données] | | | | | |

---

## D7 — PERFORMANCE REQUÊTES

```bash
# Identifier les requêtes potentiellement lentes :

# N+1 : requêtes dans des boucles
grep -rn "for.*await\|for.*fetch\|for.*conn" backend/ --include="*.py" | \
  grep -v "test" | head -20

# Requêtes sans LIMIT sur des grandes tables
grep -rn "SELECT.*FROM.*products\|SELECT.*FROM.*jobs" \
  backend/ --include="*.py" | grep -v "LIMIT"

# ILIKE sans index (table scan garanti)
grep -rn "ILIKE\|ilike" backend/ --include="*.py"
```

### Plan de requêtes simulé

```
Pour les 5 requêtes les plus fréquentes, simuler le EXPLAIN :

1. Recherche catalogue : SELECT * FROM products WHERE user_id=$1 AND designation_fr ILIKE '%$2%'
   → Index sur user_id : OUI
   → ILIKE avec % au début : index non utilisable → TABLE SCAN
   → Solution : pg_trgm + GIN index pour fulltext

2. [Suivante...]
```

---

## D8 — CONFIGURATION ALEMBIC

```bash
cat alembic.ini

# Vérifications :
□ script_location pointe vers migrations/ ?
□ sqlalchemy.url utilise la variable d'env (pas hardcodé) ?
□ compare_type = true pour détecter les changements de type ?
□ compare_server_default = true ?
```

```python
# migrations/env.py — vérifier :
□ target_metadata défini ?
□ run_migrations_online utilise asyncpg correctement ?
□ DATABASE_URL lu depuis les variables d'env (pas hardcodé) ?
```

---

## D9 — BACKUP & DISASTER RECOVERY

```
Questions critiques production :

□ Backup automatique configuré ?
  → Neon (auto) / Render PostgreSQL (auto) / Manuel ?
  → Fréquence des backups ?
  → Rétention ?

□ Restore testé au moins une fois ?
□ Point-in-time recovery disponible ?
□ Backup chiffré ?
□ RTO/RPO définis ?

Si Neon :
  → Branching pour les migrations (test avant prod) ?
  → Connection string pool activé ?
```

---

## SCORECARD BASE DE DONNÉES

| Domaine | Score /100 | Problèmes 🔴 | Problèmes 🟠 | Problèmes 🟡 | Notes |
|---------|-----------|-------------|-------------|-------------|-------|
| Schéma & types | /100 | | | | |
| Migrations | /100 | | | | |
| Index | /100 | | | | |
| Sécurité SQL | /100 | | | | |
| Isolation multi-tenant | /100 | | | | |
| Intégrité données | /100 | | | | |
| Performance | /100 | | | | |
| Backup/Recovery | /100 | | | | |
| **GLOBAL** | **/100** | | | | |

---

## LISTE PROBLÈMES BASE DE DONNÉES

```
[D-001] 🔴 FATAL
  Table    : [table]
  Problème : [description]
  Impact   : [IDOR / data loss / corruption]
  Fix      : [migration SQL complète]

[D-XXX] ...
```

---

## ✅ GATE D — BASE DE DONNÉES

```bash
# 1. Vérifier drift migrations vs DB réelle
alembic current 2>/dev/null
alembic check 2>/dev/null
# → "No new upgrade operations detected" = pas de drift

# 2. Vérifier que toutes les migrations s'enchaînent sans erreur
alembic upgrade head 2>&1 | tail -10
# → 0 erreur

# 3. Tester le downgrade de la dernière migration
alembic downgrade -1 2>&1
alembic upgrade head 2>&1
# → 0 erreur dans les deux sens

# 4. Vérifier l'isolation multi-tenant manuellement
# [test spécifique selon la DB de test disponible]

PASS si :
  → 0 problème 🔴 (IDOR, injection SQL, data loss)
  → Toutes les migrations up/down sans erreur
  → Index critiques en place

STATUS : [ ] PASS  [ ] FAIL
```
