# Docling

## What This Is

Plateforme OCR cloud pour factures fournisseurs BTP (zone Catalogne/France/Espagne). Photo ou PDF de facture fournisseur (ex: BIGMAT) -> l'IA Gemini extrait les produits, prix et TVA dans un catalogue structure, exportable en CSV/Excel/PDF.

D'abord pour Guilhem (artisan/gerant BTP), puis a vendre comme service SaaS a d'autres artisans. PWA installable sur mobile + desktop. Monorepo FastAPI backend + React frontend.

## Core Value

Le parcours complet fonctionne sans accroc : scanner une facture -> voir les produits extraits -> les valider -> les retrouver dans le catalogue -> exporter en CSV.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Auth: inscription email/password, login JWT httpOnly cookie, Argon2id, rate limiting
- Upload: envoi fichier (photo/PDF) via endpoint `/api/v1/invoices/process`
- Extraction IA: Gemini multilingue (FR/ES/CA) avec fallback Bytez
- Factur-X: extraction XML automatique pour PDFs conformes
- Preprocessing image: optimisation OpenCV avant envoi Gemini
- Pipeline orchestree: MIME detection -> preprocessing -> extraction -> DB save -> S3 upload
- Circuit breaker: protection contre les pannes Gemini (5 erreurs -> cooldown 60s)
- Catalogue produits: listing, recherche, pagination cursor, CRUD
- Archivage PDF: stockage Storj S3 par artisan
- Historique: consultation des extractions passees
- Devis: generation de devis depuis le catalogue
- Export: CSV (ExcelJS), PDF (jsPDF)
- PWA: installable mobile, offline queue
- Migrations DB: Alembic a001-a008 sur Neon PostgreSQL
- CI/CD: deploiement Render (backend) + Netlify (frontend)
- Tests: ~90 backend + ~51 frontend

### Active

<!-- Current scope. Building toward these. -->

- [ ] Parcours E2E fonctionnel : scan -> extraction -> validation -> catalogue -> export sans bugs
- [ ] Corrections des bugs bloquants dans le flow principal
- [ ] CVEs pip/npm corrigees (versions patchees identifiees dans pyproject.toml + package.json)
- [ ] Tests E2E couvrant le parcours principal
- [ ] Ecran de validation : correction manuelle des produits extraits fonctionne correctement

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Production-ready hardening (monitoring avance, alerting, SLOs) — objectif = fonctionnel, pas production
- Multi-tenant / multi-artisan — v1 = Guilhem seul, SaaS multi-user viendra apres
- OAuth / SSO — email/password suffit
- App native mobile — PWA couvre le besoin
- Real-time WebSocket — polling fonctionne pour le volume actuel
- Refonte UX/design — le flow doit marcher, pas etre beau

## Context

- Projet a ~85% selon les audits de mars 2026
- 134 factures BIGMAT reelles disponibles pour tester dans `PDF Test/`
- P0 toutes resolues (XSS localStorage, operateur logique, N+1 batch, FREE_ACCESS_MODE)
- Stack stabilisee : pas de changement de framework prevu
- Deploiement fonctionnel : Render (API) + Netlify (PWA) + Neon (DB)
- Le parcours n'a jamais ete teste de bout en bout recemment — verification necessaire

## Constraints

- **Tech stack**: Pas de nouvelle dependance sans validation Guilhem
- **Deps install**: Ne PAS lancer `uv sync` / `pnpm install` sans demander — cause souvent des soucis Windows
- **Windows**: Scripts en .bat/.ps1, pas de .sh
- **Budget**: Free tier partout (Render, Neon, Storj) — pas d'infra payante
- **Securite**: JWT httpOnly cookie uniquement, jamais localStorage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemini comme OCR principal | Multilingue FR/ES/CA, structured output, bon rapport qualite/prix | — Pending |
| Bytez en fallback OCR | Resilience si Gemini tombe | — Pending |
| Storj S3 pour archivage | S3-compatible, pay-as-you-go, pas de vendor lock-in | — Pending |
| Neon PostgreSQL | Serverless, free tier genereux, pooling PgBouncer | — Pending |
| PWA plutot qu'app native | Installation mobile sans App Store, un seul codebase | — Pending |
| Objectif "fonctionnel complet" | Faire marcher le flow E2E avant de polir ou hardener | — Pending |
| Vision SaaS a terme | D'abord dogfood perso, puis ouvrir a d'autres artisans BTP | — Pending |

---
*Last updated: 2026-03-17 after initialization*
