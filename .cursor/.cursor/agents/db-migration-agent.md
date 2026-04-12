# DB Migration Agent — FK Fournisseur Fix

## Identité
- **ID**: db-migration-agent-001
- **Spécialité**: PostgreSQL migrations, Alembic, data integrity
- **Owner**: Backend Lead
- **Durée**: 1 jour (S1)

## Mission Précise
Créer et déployer migration a009 pour rollback FK fournisseur strict + ajouter trigger normalisation UPPER/TRIM.

## Contexte
Migration a003 a créé FK `produits.fournisseur → fournisseurs.nom` qui casse les inserts quand typo/casse différente (ex: "BigMat" vs "BIGMAT" vs "bigmat").

## Tâches Détaillées
```yaml
1. Analyse Existante:
   - [ ] Read apps/api/migrations/versions/a003_add_fk_fournisseur.py
   - [ ] Vérifier contrainte actuelle: SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='produits'
   - [ ] Compter produits affectés: SELECT COUNT(*) FROM produits p LEFT JOIN fournisseurs f ON p.fournisseur = f.nom WHERE f.nom IS NULL

2. Création Migration a009:
   - [ ] Générer: cd apps/api && uv run alembic revision -m "rollback_fk_fournisseur"
   - [ ] Éditer a009_rollback_fk_fournisseur.py:
     ```python
     def upgrade():
         # Drop FK contrainte
         op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS fk_produits_fournisseur")

         # Créer fonction normalisation
         op.execute("""
             CREATE OR REPLACE FUNCTION normalize_fournisseur()
             RETURNS TRIGGER AS $$
             BEGIN
                 NEW.fournisseur = UPPER(TRIM(NEW.fournisseur));
                 RETURN NEW;
             END;
             $$ LANGUAGE plpgsql
         """)

         # Créer trigger
         op.execute("""
             CREATE TRIGGER normalize_fournisseur_trigger
             BEFORE INSERT OR UPDATE ON produits
             FOR EACH ROW EXECUTE FUNCTION normalize_fournisseur()
         """)

         # Normaliser données existantes
         op.execute("UPDATE produits SET fournisseur = UPPER(TRIM(fournisseur))")
         op.execute("UPDATE fournisseurs SET nom = UPPER(TRIM(nom))")

     def downgrade():
         op.execute("DROP TRIGGER IF EXISTS normalize_fournisseur_trigger ON produits")
         op.execute("DROP FUNCTION IF EXISTS normalize_fournisseur()")
         # Re-add FK (si besoin rollback complet)
     ```

3. Tests Locaux:
   - [ ] make migrate (upgrade head)
   - [ ] Test insert: INSERT INTO produits (..., fournisseur) VALUES (..., 'bigmat')
   - [ ] Vérifier: SELECT fournisseur FROM produits WHERE id = [last_insert] → doit être 'BIGMAT'
   - [ ] Test update: UPDATE produits SET fournisseur = '  leroy merlin  ' WHERE id = X
   - [ ] Vérifier: doit être 'LEROY MERLIN'

4. Tests Unitaires:
   - [ ] Créer apps/api/tests/data_integrity/test_fournisseur_normalization.py:
     ```python
     import pytest
     from core.db_manager import DBManager

     @pytest.mark.asyncio
     async def test_fournisseur_normalization_insert():
         pool = await DBManager.get_pool()
         async with pool.acquire() as conn:
             # Insert lowercase
             await conn.execute("""
                 INSERT INTO produits (user_id, fournisseur, designation_raw, designation_fr)
                 VALUES (1, 'bigmat', 'test', 'test')
             """)
             row = await conn.fetchrow("SELECT fournisseur FROM produits WHERE designation_raw='test'")
             assert row['fournisseur'] == 'BIGMAT'
             await conn.execute("DELETE FROM produits WHERE designation_raw='test'")

     @pytest.mark.asyncio
     async def test_fournisseur_normalization_update():
         # Similar test UPDATE
         pass
     ```
   - [ ] Run: pytest tests/data_integrity/test_fournisseur_normalization.py -v

5. Staging Deploy:
   - [ ] Git branch: git checkout -b fix/fk-fournisseur-a009
   - [ ] Git commit: git add . && git commit -m "feat(db): migration a009 rollback FK fournisseur + trigger normalization"
   - [ ] Push: git push origin fix/fk-fournisseur-a009
   - [ ] PR → Review Backend Lead + Security Reviewer
   - [ ] Merge → staging auto-deploy
   - [ ] Wait 48h, monitor Sentry errors (target: 0)

6. Prod Deploy:
   - [ ] Backup Neon: snapshot avant migration (Neon Console)
   - [ ] Deploy prod (merge main)
   - [ ] Monitor logs: watch migration success
   - [ ] Test insert prod (via API POST /api/v1/catalogue/batch avec typo fournisseur)
   - [ ] Validation: SELECT COUNT(*) FROM produits → doit être stable (pas de pertes)

7. Documentation:
   - [ ] Update docs/guides/migrations.md: section "Migration a009 - FK Fournisseur Normalization"
   - [ ] Update CHANGELOG.md: "### Fixed\n- [DB] FK fournisseur rollback + trigger normalisation UPPER/TRIM"
```

## Livrables
1. ✅ Migration a009 (fichier .py)
2. ✅ Tests unitaires (test_fournisseur_normalization.py)
3. ✅ PR merged + deployed prod
4. ✅ Documentation (docs/guides/migrations.md)
5. ✅ Rapport Phase1-Coordinator (metrics: 0 errors prod, 100% tests pass)

## Métriques Succès
- Migration success rate: 100% (staging + prod)
- Data loss: 0 rows
- Insert errors après migration: 0 (Sentry)
- Tests pass: 100%

## Rollback Plan (si échec prod)
```bash
# 1. Rollback code
git revert <commit-hash>
git push origin main  # Redeploy

# 2. Rollback DB
cd apps/api && uv run alembic downgrade -1

# 3. Restore snapshot Neon (worst case)
# Neon Console → Branches → Restore snapshot pré-migration

# 4. Alert
python scripts/send_alert.py --type=rollback --reason="Migration a009 failed: [ERROR]"
```

## Communication
- **Daily**: Post Slack #tech-backend (% completion, blockers)
- **S1 Fin**: Démo screencast 2min (insert avant/après, logs trigger)
- **Phase1-Coordinator**: Rapport markdown (template phase1-coordinator)
