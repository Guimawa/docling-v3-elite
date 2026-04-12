# Runbook activation integration externe (bout-a-bout)

Ce runbook execute la checklist post-Docling de facon operationnelle.

## Prerequis

- API demarrable localement.
- Environnement de test strict:
  - `FREE_ACCESS_MODE=false`
  - `DISABLE_RATE_LIMIT=true` (pour smoke deterministe)
  - `SERVICE_API_KEYS` defini pour le test service
  - `PRONTO_URL` defini pour le test CORS origine autorisee

## Sequence executee

1. Demarrer une API stricte dediee sur `http://127.0.0.1:8001`
2. Lancer `scripts/run_post_docling_integration_checks.ps1`
3. Lire le rapport genere dans `.planning/reports/`
4. Si tout est vert: statut local = GO technique (hors prerequis partenaire externe)

## Commandes

### A. API stricte dediee

```powershell
$env:FREE_ACCESS_MODE='false'
$env:DISABLE_RATE_LIMIT='true'
$env:SERVICE_API_KEYS='docling-test-service-key'
$env:PRONTO_URL='https://pronto-staging.example'
uv run uvicorn main:app --host 127.0.0.1 --port 8001
```

### B. Checks integration

```powershell
.\scripts\run_post_docling_integration_checks.ps1 `
  -BaseUrl "http://127.0.0.1:8001" `
  -AllowedOrigin "https://pronto-staging.example" `
  -DeniedOrigin "https://evil.example" `
  -ServiceKey "docling-test-service-key"
```

## Interprétation

- `PASS=all` : GO technique local.
- `FAIL>0` : NO-GO tant que les checks echoues ne sont pas corriges.

## Limites connues

- Ce runbook valide la couche technique locale (auth service key, CORS, observability endpoint, session).
- L'activation partenaire reelle (DNS, secrets cloud, dashboards ops externes, validation produit) reste a faire en staging/production.

## Go / No-Go quand le partenaire est disponible

1. **Prérequis métier** : contrat / périmètre d’intégration validé, URL d’origine autorisée CORS, clé service (`SERVICE_API_KEYS`) ou flux OAuth convenu.
2. **Staging** : exécuter ce runbook contre `PRONTO_URL` (ou équivalent) staging ; [`docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md`](../docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md) pour variables prod.
3. **Décision** : **GO** si tous les checks PASS + validation produit ; **NO-GO** si un check FAIL ou blocage partenaire (réseau, secrets, SLA).
4. **Production** : appliquer les [checklists post-Docling](POST_DOCLING_INTEGRATION_CHECKLIST.md) et journaliser la date de décision dans `JOURNAL.md` (section « Historique »).
