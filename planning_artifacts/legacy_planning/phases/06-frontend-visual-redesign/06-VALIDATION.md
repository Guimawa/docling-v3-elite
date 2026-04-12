---
phase: 6
slug: frontend-visual-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + Playwright (E2E) |
| **Config file** | `apps/pwa/vite.config.js` |
| **Quick run command** | `cd apps/pwa && pnpm test --run` |
| **Full suite command** | `cd apps/pwa && pnpm test --run && cd ../.. && cd apps/api/tests/e2e && python -m pytest` |
| **Estimated runtime** | ~30 seconds (vitest) + ~60 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/pwa && pnpm test --run`
- **After each wave:** Run full suite (vitest + E2E subset)
- **Before marking phase complete:** Run `pnpm test --run` — all 303 tests must pass

---

## Wave Validation Gates

### Wave 0 (Tokens)
After `tailwind.config.js` update:
- `pnpm test --run` → 303 tests pass (no CSS class regressions)
- Key: Card.test.jsx, Input.test.jsx, Button.test.jsx pass

### Wave 1 (Composants partagés)
After each composant (Button, Card, Badge, Input, Navbar):
- `pnpm test --run` → 303 tests pass
- Visual spot-check: couleurs corail/dark visibles

### Wave 2 (Pages simples)
After each page (ScanPage, SettingsPage, DevisPage):
- `pnpm test --run` → 303 tests pass
- data-testid présents et non modifiés: `scan-dropzone`, `scan-upload-btn`, `scan-lancer-btn`, `settings-sync-status`

### Wave 3 (Pages complexes)
After each page (CataloguePage, ValidationPage, HistoryPage):
- `pnpm test --run` → 303 tests pass
- data-testid présents et non modifiés: `catalogue-search`, `validation-save-btn`

---

## Critical data-testid — NE JAMAIS MODIFIER

Ces attributs sont référencés dans les tests et ne peuvent pas changer :

| testid | Fichier | Testé par |
|--------|---------|-----------|
| `scan-dropzone` | ScanPage.jsx | ScanPage.test.jsx + E2E |
| `scan-upload-btn` | ScanPage.jsx | ScanPage.test.jsx + E2E |
| `scan-lancer-btn` | ScanPage.jsx | ScanPage.test.jsx + E2E |
| `catalogue-search` | CataloguePage.jsx | CataloguePage.test.jsx |
| `nav-scan` | Navbar.jsx | Navbar.test.jsx |
| `nav-catalogue` | Navbar.jsx | Navbar.test.jsx |
| `nav-historique` | Navbar.jsx | Navbar.test.jsx |
| `nav-devis` | Navbar.jsx | Navbar.test.jsx |
| `settings-sync-status` | SettingsPage.jsx | SettingsPage.test.jsx |
| `validation-save-btn` | ValidationPage.jsx | ValidationPage.test.jsx |
| `cta-scan-facture` | (shared) | E2E |

---

## Known Risk Points

| Risk | Mitigation |
|------|-----------|
| `bg-bgLight` token manquant | Ajouter `'bgLight': '#1F2937'` dans tailwind.config.js extend.colors AVANT tout autre changement |
| Button.secondary couleur | Mettre à jour Button.jsx + Button.test.jsx simultanément (même commit) |
| Navbar emerald → corail | Vérifier nav-* tests ne vérifient PAS les classes couleur |
