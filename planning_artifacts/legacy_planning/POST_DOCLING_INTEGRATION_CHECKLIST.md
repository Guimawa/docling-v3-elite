# Checklist integration externe post-Docling

Activation quand le partenaire externe (ex: Pronto) est disponible.

## 1) API keys et identite service

- [ ] Generer une cle service dediee par environnement (staging, production).
- [ ] Stocker les cles uniquement en secret manager (jamais en repo).
- [ ] Renseigner `SERVICE_API_KEYS` cote API avec rotation planifiee.
- [ ] Verifier reponse `401` pour cle absente/invalide sur endpoints services.
- [ ] Verifier journaux d'acces (request_id + identite service) sans fuite de secret.

## 2) CORS et fronts autorises

- [ ] Ajouter URL partenaire dans `PRONTO_URL`/origines autorisees par environnement.
- [ ] Verifier preflight `OPTIONS` (headers et methods autorisees).
- [ ] Verifier refus CORS pour origine non whitelistee.
- [ ] Verifier cookies/credentials selon mode d'auth retenu.

## 3) Observabilite et alerting

- [ ] Configurer DSN/monitoring pour API (Sentry ou equivalent).
- [ ] Ajouter tags env/version/request_id sur erreurs auth/integration.
- [ ] Definir alertes minimales:
  - [ ] taux 5xx auth > seuil
  - [ ] hausse 401/403 service key
  - [ ] latence p95 endpoints integration
- [ ] Verifier dashboard "sante integration" (volumetrie + erreurs + latence).

## 4) Contrats et smoke tests

- [ ] Valider contrat d'auth service (header `X-Service-Key`) avec tests de contrat.
- [ ] Executer smoke tests cibles sur endpoints critiques integration.
- [ ] Verifier compatibilite schema reponses (pas de rupture de contrat).

## 5) Go/No-Go

- [ ] Revue securite rapide (cles, CORS, logs).
- [ ] Revue ops rapide (monitoring + alertes actives).
- [ ] Validation conjointe dev + produit.
- [ ] Decision Go/No-Go documentee.

## Definition of Done

- Checklist 100% cochee en staging.
- 0 blocage P0/P1 ouvert.
- Plan rollback connu et teste (voir `.planning/ROLLBACK_PLAN.md`).

## Execution locale (2026-04-04)

Validee via:

- `scripts/run_post_docling_integration_checks.ps1`
- rapport: `.planning/reports/post_docling_integration_report_20260404_012012.md`

Elements confirms localement:

- [x] Rejet cle service invalide (`401`)
- [x] Acceptation cle service valide (`200`)
- [x] CORS preflight origine autorisee
- [x] CORS origine non autorisee refusee
- [x] Session auth utilisable pour endpoint observabilite

Elements restant dependants partenaire/staging:

- [ ] Secret manager et rotation effective des cles par environnement
- [ ] Dashboard/alertes ops externes actifs et verifies
- [ ] Validation conjointe produit + decision Go/No-Go en staging reel
