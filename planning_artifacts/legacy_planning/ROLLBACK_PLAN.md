# Rollback Plan — PR Consolidation

Ce plan couvre la consolidation de stabilisation Docling autonome:

- migration de securisation `a012` (garde-fou `refresh_tokens`),
- ajustements E2E strict auth/export/full-flow,
- documentation (`CHANGELOG.md`, `README.md`, `JOURNAL.md`).

## Objectif rollback

Revenir rapidement a un etat stable si la consolidation introduit une regression en test strict, auth, ou migration.

## Conditions de declenchement

- Regressions 5xx sur login/refresh/logout en environnement strict.
- Echecs persistants sur la suite E2E ciblee:
  - `tests/e2e/test_auth_advanced.py`
  - `tests/e2e/test_export.py`
  - `tests/e2e/test_full_flow.py`
- Incident migration sur DB de test/staging.

## Strategie

1. **Freeze deploy**
   - Geler toute promotion de build/PR liee a la consolidation.
2. **Rollback code**
   - Revenir au commit precedent de la branche de consolidation.
3. **Rollback DB**
   - Aucun downgrade destructif requis par defaut: le garde-fou cree uniquement des objets `IF NOT EXISTS`.
   - Si necessaire, verifier schema cible:
     - table `refresh_tokens`,
     - index associes `idx_refresh_tokens_*`,
     - revision Alembic courante.
4. **Revalidation minimale**
   - Rejouer uniquement les E2E cibles strictes pour confirmer la stabilite.

## Verification rapide post-rollback

- API stricte joignable (`FREE_ACCESS_MODE=false`).
- Endpoints auth:
  - `/api/v1/auth/login`
  - `/api/v1/auth/me`
  - `/api/v1/auth/refresh`
- E2E cibles vertes (auth/export/full-flow).

## Notes

- Le rollback de cette consolidation est principalement **code-first**.
- Le garde-fou DB est idempotent et non destructif; il est conserve en general, meme en rollback applicatif.
