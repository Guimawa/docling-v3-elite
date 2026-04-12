# Architecture par domaine (Docling API)

Approche **modular monolith** : découpage par **bounded contexts** sans imposer une couche application/domain Python partout (évite la sur-ingénierie).

## Contextes

| Package | Responsabilité |
|--------|----------------|
| `shared/` | Transversal HTTP : auth des requêtes, rate limit, corrélation `request_id` |
| `scan/` | Traitement factures (upload, jobs async, historique, PDF) |
| `catalogue/` | Catalogue de prix, stats, reset admin |
| `auth/` | Inscription, login JWT httpOnly, refresh, lockout |
| `community/` | Préférences base communautaire, stats agrégées |
| `compliance/` | Export données utilisateur (RGPD) |
| `watchdog/` | Statut dossier magique (sync) |
| `platform/` | Santé, racine API, Web Vitals |

## Ailleurs dans `apps/api/`

- `core/` — configuration, pool DB, orchestrateur pipeline
- `services/` — adaptateurs (Gemini, auth, stockage, communauté…)
- `schemas/` — contrats d’entrée/sortie (DTO)

## Frontend (PWA)

Les dossiers `apps/pwa/src/features/*` restent alignés sur ces domaines : `scan`, `catalogue`, `auth`, `settings` (watchdog), etc.
