# Docling PWA — Frontend

React 19 + Vite 5 + Tailwind 3. PWA installable avec service worker (Workbox).

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Scan | `/scan` | Upload PDF/photo, file de traitement IA |
| Validation | `/validation` | Édition des produits extraits avant sauvegarde |
| Catalogue | `/catalogue` | Recherche, filtres (famille → sous-famille → type…), export CSV/Excel, comparateur |
| Historique | `/history` | Audit trail des factures traitées |
| Réglages | `/settings` | Test connexion API, choix modèle IA, statut watchdog |
| Onboarding | `/onboarding` | Parcours onboarding utilisateur (feature flag) |

Les routes **`/devis`** et **`/community`** et le code associé ont été retirés (2026). Des préférences d’export PDF (TVA, numérotation, mentions) restent dans **Réglages** (localStorage).

## Installation

```bash
pnpm install
```

## Démarrage (dev)

```bash
pnpm run dev
```

URL par défaut : `http://localhost:5173`.

Notes :
- La config Vite du projet est en `server.https: false` (dev HTTP).
- Le plugin SSL existe, mais le comportement HTTPS effectif doit être validé selon l'environnement local et les besoins caméra.

## Mapping Frontend -> Domaines backend (DDD)

Référence rapide pour relier les features PWA aux domaines backend (`apps/api/domains/*`) sans renommer les dossiers frontend.

| Domaine backend | Endpoints frontend (`ENDPOINTS`) | Features PWA principales |
|-----------------|----------------------------------|--------------------------|
| `scan` | `process`, `status`, `history`, `pdfUrl` | `scan`, `history`, `validation` |
| `catalogue` | `catalogue`, `fournisseurs`, `compare`, `batch`, `stats` | `catalogue`, `validation`, `settings` |
| `auth` | `login`, `register`, `logout`, `me` | `auth`, `settings` |
| `community` | *(API backend éventuelle — plus consommée par la PWA)* | — |
| `compliance` | `exportMyData` | `settings` |
| `watchdog` | `syncStatus` | `settings` |
| `platform` | `health` | `settings` |

## Variables d'environnement (VITE_*)

Créer un fichier `.env` à la racine du projet ou définir dans l'hébergeur (Netlify).

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:8000` (dev) |
| `VITE_AUTH_REQUIRED` | Active auth stricte côté frontend | `true` |
| `VITE_AUTH_GOOGLE_ENABLED` | Active le bouton Google Sign-In | `false` |
| `VITE_AUTH_ONBOARDING_V2` | Active la redirection onboarding | `false` |
| `VITE_TVA_RATE` | Taux TVA/IVA pour le calcul TTC | `0.21` (21% IVA espagnol) |
| `VITE_SENTRY_DSN` | DSN Sentry pour monitoring erreurs frontend | _(vide = désactivé)_ |

## Build production

```bash
pnpm run build
```

Génère le dossier `dist/` avec :
- PWA manifest (`manifest.webmanifest`)
- Service worker (Workbox, cache offline)
- Code splitté par route (lazy loading)

## Tests

```bash
# Lancer les tests (Vitest + Testing Library)
pnpm test

# Mode watch (développement)
pnpm run test:watch

# Avec couverture
pnpm run test:coverage
```

La suite est répartie sur plusieurs dossiers (`src/__tests__`, `src/components/__tests__`, `src/features/**/__tests__`, `src/shared/**/__tests__`, `src/utils/__tests__`).

## Lint

```bash
pnpm run lint
```

ESLint 9 avec plugins `react-hooks` et `react-refresh`.

## Stack technique

| Lib | Version | Rôle |
|-----|---------|------|
| React | 19 | UI |
| Vite | 5 | Bundler + dev server |
| Tailwind CSS | 3.4.x | Styles utilitaires |
| Zustand | 5 | State management |
| Axios | 1.x | Client HTTP (intercepteur JWT) |
| Framer Motion | 12 | Animations |
| Recharts | 3 | Graphiques dashboard |
| jsPDF | 3 | Génération devis PDF |
| Lucide React | 0.5x | Icônes |
| Sonner | 2 | Toasts |
| vite-plugin-pwa | 0.21 | PWA + Workbox |
| Vitest | 3 | Tests unitaires |
| Testing Library | 16 | Tests composants React |
| @sentry/react | 10 | Monitoring erreurs |

## Déploiement (Netlify)

1. Connecter le repo GitHub
2. Base directory : `apps/pwa`
3. Build command : `pnpm run build`
4. Publish directory : `apps/pwa/dist`
5. Variables d'environnement : `VITE_API_URL`, `VITE_SENTRY_DSN`
