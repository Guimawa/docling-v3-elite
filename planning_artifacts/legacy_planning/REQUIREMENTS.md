# Requirements: Docling

**Defined:** 2026-03-17
**Core Value:** Le parcours complet fonctionne sans accroc : scanner une facture -> voir les produits extraits -> les valider -> les retrouver dans le catalogue -> exporter en CSV.

## v1 Requirements

Requirements for v1 completion. Each maps to roadmap phases.

### Flow Fixes

- [x] **FLOW-01**: Batch mode route vers /validation apres extraction (pas directement /catalogue)
- [x] **FLOW-02**: Produits extraits persistent en sessionStorage/IndexedDB — survivent au refresh et navigation mobile
- [x] **FLOW-03**: ValidationPage affiche le PDF original (iframe/object pour PDFs, img pour images)
- [x] **FLOW-04**: Produits avec confidence=low sont flagges visuellement et filtres par defaut avant save

### Backend Resilience

- [x] **BACK-01**: Fallback Gemini/Bytez log chaque erreur avec model name + exception type avant fallback (plus de bare except: pass)
- [x] **BACK-02**: Image preprocessor crash -> log warning + fallback sur image brute, ne fail pas le job
- [x] **BACK-03**: Batch save endpoint a une protection idempotency (dedup par facture_hash ou idempotency key) — pas de doublons si double-tap

### History & PDF

- [x] **HIST-01**: Presigned URLs Storj generees au clic (lazy), pas au chargement de la page (evite 403 sur URLs expirees)
- [x] **HIST-02**: Boutons acces PDF fonctionnels dans l'historique (branche feat/boutons-acces-pdf-factures merged 2026-03-17)

### Testing

- [x] **TEST-01**: Playwright browser binaries installes (playwright>=1.49 en dep) + conftest e2e avec skip auto si serveur absent
- [x] **TEST-02**: data-testid ajoutes (scan-dropzone, scan-upload-btn, scan-lancer-btn, catalogue-search, nav-catalogue, nav-settings, settings-sync-status)
- [x] **TEST-03**: 6 fichiers E2E : auth flow, scan, catalogue, settings, export/history/stats, auth avancé (completed 2026-03-27)
- [x] **TEST-04**: 303 tests vitest frontend couvrant toutes les pages principales (completed 2026-03-25)

### Quick Wins

- [x] **QWIN-01**: Supprimer SplineScene (3-5 MB en moins pour mobile)
- [x] **QWIN-02**: CVEs pip/npm corrigees (installer les versions patchees deja identifiees dans pyproject.toml + package.json)
- [x] **QWIN-03**: Presigned URLs lazy dans l'historique (generer au clic pas au load) — couvert par HIST-01

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### SaaS Multi-tenant

- **SAAS-01**: Multi-user avec isolation tenant (chaque artisan voit que ses donnees)
- **SAAS-02**: Onboarding self-service (inscription + premier scan guide)
- **SAAS-03**: Plans tarifaires et facturation

### Security Hardening

- **SEC-01**: Refresh token rotation
- **SEC-02**: CSRF protection
- **SEC-03**: Account lockout apres N tentatives
- **SEC-04**: Magic bytes validation sur uploads

### UX Polish

- **UX-01**: Refonte UI/design system
- **UX-02**: Notifications in-app
- **UX-03**: PWA offline sync ameliore (navigator.onLine unreliable)

### Architecture

- **ARCH-01**: Refactor main.py 906 lignes -> routers/ modules
- **ARCH-02**: Community pricing fixes (hash logic fragile)
- **ARCH-03**: Watchdog service (orphan data bug user_id=None)

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth / SSO | Email/password Argon2id suffit pour v1 single-user |
| WebSocket / real-time | Polling OK pour volume actuel (1 user) |
| App native mobile | PWA couvre le besoin |
| Accounting integration | CSV export suffit — user importe manuellement |
| Advanced monitoring / SLO | Overhead operations pour outil perso |
| UI redesign | Le flow doit marcher avant d'etre beau |
| ExcelJS removal | A evaluer — peut etre utile |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 1 | Complete |
| BACK-02 | Phase 1 | Complete |
| BACK-03 | Phase 1 | Complete |
| QWIN-02 | Phase 1 | Complete |
| FLOW-01 | Phase 2 | Complete |
| FLOW-02 | Phase 2 | Complete |
| FLOW-03 | Phase 2 | Complete |
| FLOW-04 | Phase 2 | Complete |
| QWIN-01 | Phase 2 | Complete |
| HIST-01 | Phase 3 | Complete |
| HIST-02 | Phase 3 | Complete |
| QWIN-03 | Phase 3 | Complete |
| TEST-01 | Phase 4 | Complete |
| TEST-02 | Phase 4 | Complete |
| TEST-03 | Phase 4 | Complete |
| TEST-04 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-27 — v1 requirements 16/16 complete. Remaining work : Pronto staging validation + checklist déploiement prod (SECURITY_HARDENING.md)*
