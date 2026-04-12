# Pipeline scan async (référence PR)

Ce document est la **référence projet** pour les PR « scan async » : file d’attente PostgreSQL, worker, stockage objet, PDF texte, GCS, SSE optionnel.

## Plan source Cursor

Le plan détaillé (phases, ordre de commits, table **phase → skill / agent**) peut être conservé dans Cursor sous :

`~/.cursor/plans/scan_async_pipeline_+_cursor_orchestration_*.plan.md`

Lors d’une PR ou d’une revue, indiquer **phase** + **agent / skill** utilisés (voir `AGENTS.md`).

## Phases (résumé)

1. Migration `pending` + colonnes payload + `claim_next_job` (`SKIP LOCKED`) + worker CLI + `SCAN_JOB_EXECUTION=inline|queue`.
2. Router + Watchdog alignés sur enqueue HTTP ; doc déploiement worker Cloud Run.
3. PyMuPDF + module `pdf_text_extract` + repli vision inchangé côté validation PWA.
4. Abstraction stockage + backend GCS (optionnel).
5. SSE statut job + repli polling (`VITE_JOB_SSE`).

## Non-régression

- `SCAN_JOB_EXECUTION=inline` (défaut) = comportement API identique à l’historique (BackgroundTasks + extraction inline).

## Validation

- `ruff` + pytest ciblés scan/worker ; `scripts/prove_invoice_e2e.py` si le flux scan est touché.

## Complétions (hors plan « GCS par utilisateur » / dédup DB)

- Préfixe pending : `pending/{user_id|anon}/{job_id}/{filename}`.
- Worker : mini HTTP `/health` sur `PORT` (Cloud Run).
- CI : étape **Deploy scan worker** si variable dépôt `DEPLOY_SCAN_WORKER=true` (`CLOUD_RUN_WORKER_SERVICE` optionnel).
- Test d’intégration `tests/unit/test_claim_next_job.py` (skip sans `DATABASE_URL` ou sans migration a015).
