# Fichiers Backend — `apps/api`

## Point d'entree
- `main.py` — composition FastAPI (middlewares securite/CORS/rate limit, routeurs domains, docs OpenAPI conditionnelles).
- `domains/platform/lifespan.py` — bootstrap/shutdown (validation config, pool DB, guest FREE_ACCESS_MODE, watchdog).
- `domains/` — routeurs et logique HTTP par bounded context (`auth`, `scan`, `catalogue`, `community`, `compliance`, `sync_agent`, `platform`) + `domains/shared`.
- `conftest.py` — config pytest racine.
- `alembic.ini` — config Alembic.
- `pyproject.toml` — deps backend + ruff/pytest/bandit.

## Core
- `core/config.py` — settings Pydantic (DB, JWT, OCR providers, OAuth Google, CORS origins, community, sync_agent).
- `core/db_manager.py` — pool asyncpg, requetes metier, upserts batch, historiques, stats.
- `core/db_product_utils.py` — normalisation produit (`product_key`), mapping geo fournisseur, helpers upsert.
- `core/db_upsert_utils.py` — utilitaires SQL upsert/historique.
- `core/orchestrator.py` — pipeline extraction : MIME -> pretraitement -> OCR -> extraction IA -> DB -> Storj (+ community optionnelle).

## Services
- `services/auth_service.py` — hash Argon2id, JWT access/refresh, verification tokens, HIBP.
- `services/google_oauth_service.py` — OAuth Google (state JWT + table SQL, callback, validation id_token).
- `services/gemini_service.py` — extraction Gemini structured output.
- `services/mistral_ocr_service.py` — OCR Mistral.
- `services/chandra_ocr_service.py` — OCR Chandra.
- `services/lighton_ocr_service.py` — OCR LightOn.
- `services/tesseract_ocr_service.py` — OCR local best-effort.
- `services/bytez_service.py` — fallback Bytez (images).
- `services/image_preprocessor.py` — preprocessing OpenCV.
- `services/storage_service.py` — stockage S3-compatible + URLs pre-signees.
- `services/community_service.py` — prix anonymes, k-anonymat, agregats geo.
- `services/sync_agent_service.py` — observation dossier local, traitement auto.

## Schemas
- `schemas/invoice.py` — modeles Pydantic v2 (`Product`, `InvoiceExtractionResult`, `BatchSaveRequest`, `CatalogueProductUpdate`).

## Utils
- `utils/serializers.py` — serialisation JSON sure (Decimal, dates, structures imbriquees).

## Migrations Alembic
- `migrations/env.py`
- `migrations/versions/a001_baseline_schema.py` — schema initial.
- `migrations/versions/a002_add_check_constraints.py` — checks metier.
- `migrations/versions/a003_add_fk_fournisseur.py` — FK fournisseurs.
- `migrations/versions/a004_add_jobs_user_id.py` — isolation jobs.
- `migrations/versions/a005_add_user_id_and_perf_indexes.py` — user_id + perfs.
- `migrations/versions/a006_unique_produits_user_id.py` — unicite produits (ancienne cle).
- `migrations/versions/a007_idx_jobs_user_ck_factures_statut.py` — index jobs + checks statuts.
- `migrations/versions/a008_prix_anonymes_community.py` — base communautaire.
- `migrations/versions/a009_refresh_tokens.py` — table refresh tokens.
- `migrations/versions/a010_prix_anonymes_submission_fp.py` — dedup `submission_fp`.
- `migrations/versions/a011_temporal_pricing_and_geo.py` — `product_key`, historique date facture, geo fournisseur.
- `migrations/versions/a012_google_oauth_onboarding.py` — OAuth Google + onboarding users.
- `migrations/versions/a013_catalogue_attributes_jsonb.py` — attributs produits (JSONB) + enrichissement catalogue.
- `migrations/versions/a014_prix_ttc_detail_conseille.py` — TTC remisé / sans remise + prix de vente conseillé.

## Tests (arborescence)
- `tests/api/` — API fonctionnelle (auth, catalogue, invoices, stats, sync, validation upload).
- `tests/unit/` — unitaires domaines/services/core (scan adapters/extraction/router, OAuth Google, OCR providers, upsert batch, config).
- `tests/security/` — auth bypass, headers, injection, isolation.
- `tests/integration/` — DB/storage.
- `tests/e2e/` — parcours auth/catalogue/scan/settings/export (RUN_E2E=true).
- `tests/data_integrity/` — coherence API/DB, contraintes, transactions.
- `tests/performance/` — response times + Locust.
- `tests/external_services/` — extraction reelle (skip sans services).

## Note
- Source de verite backend: `apps/api/` (code + migrations + tests).
