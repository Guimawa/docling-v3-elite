# Worker scan async (Cloud Run)

Le mode `SCAN_JOB_EXECUTION=queue` suppose **deux processus** :

1. **Service API** — image et commande habituelle (ex. `uvicorn main:app`).
2. **Worker** — même image Docker, commande dédiée : `python worker_main.py` (répertoire de travail dans l’image : `WORKDIR /app/apps/api`).

Les deux partagent `DATABASE_URL`, les clés stockage (Storj/S3 ou GCS selon `STORAGE_BACKEND`), et les variables IA.

## Health HTTP (PORT)

Cloud Run exige un listener sur `PORT` (souvent `8080`). Le worker lance un mini-serveur `GET /health` et `GET /` en **thread** lorsque `PORT` est défini (comportement automatique sur Cloud Run). En local sans `PORT`, seul la boucle de jobs tourne.

## Clés objets pending

Les fichiers temporaires suivent `pending/{user_id|anon}/{job_id}/{filename}` (segment utilisateur pour l’isolation côté bucket).

## Variables d’environnement (worker)

- `SCAN_JOB_EXECUTION=queue`
- `DATABASE_URL` (même base que l’API)
- Stockage : `STORJ_*` + `STORJ_BUCKET` **ou** `STORAGE_BACKEND=gcs` + `GCS_BUCKET` + credentials GCP (ADC / `GOOGLE_APPLICATION_CREDENTIALS`)
- `WORKER_CONCURRENCY`, `WORKER_POLL_INTERVAL_MS` (optionnel)
- Secrets JWT / modèles identiques à l’API si le worker appelle les mêmes services

## Déploiement GCP (résumé)

1. Déployer l’**API** avec `SCAN_JOB_EXECUTION=queue` pour que les uploads créent des jobs `pending`.
2. Déployer le **worker** avec la même image, `--command=python` et `--args=worker_main.py`, `PORT=8080`, secrets identiques (DB + stockage + IA).
3. CI : définir la variable de dépôt **`DEPLOY_SCAN_WORKER=true`** pour activer l’étape optionnelle du workflow `.github/workflows/deploy-cloudrun.yml` (service `CLOUD_RUN_WORKER_SERVICE` ou défaut `docling-worker`). Sans cette variable, seul l’API est déployé.

## Périmètre non couvert ici

- **GCS par utilisateur** (préférences + credentials chiffrés en base) : hors scope ; le worker utilise la config globale `STORAGE_BACKEND` / `GCS_BUCKET`.
- **Dédup multi-instance en DB** : la dédup upload reste en mémoire process ; une table dédiée peut être ajoutée plus tard.
