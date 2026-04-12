# 🚀 08 — AUDIT BUILD & DÉPLOIEMENT
# Docker · CI/CD · GitHub Actions · Render · Variables ENV · Pipeline
# Zéro tolérance sur les failles de déploiement

---

## BD1 — ÉTAT DU BUILD INITIAL

```bash
# Capturer l'état EXACT avant toute correction

echo "=== BUILD FRONTEND ==="
cd docling-pwa
npm ci 2>&1 | tail -5
npm run build 2>&1 | tee /tmp/build_frontend_initial.txt
echo "Warnings : $(grep -c 'warn' /tmp/build_frontend_initial.txt)"
echo "Errors   : $(grep -c 'error' /tmp/build_frontend_initial.txt)"
ls -la dist/assets/*.js 2>/dev/null | awk '{print $5, $9}' | sort -rn

echo ""
echo "=== BUILD BACKEND (import check) ==="
cd ..
python -c "
import api
import backend.core.config
import backend.core.db_manager
import backend.core.orchestrator
import backend.services.auth_service
import backend.services.gemini_service
print('✅ Tous les imports backend OK')
" 2>&1

echo ""
echo "=== LINT FRONTEND ==="
cd docling-pwa
npm run lint 2>&1 | tee /tmp/lint_initial.txt
echo "ESLint errors   : $(grep -c ' error ' /tmp/lint_initial.txt)"
echo "ESLint warnings : $(grep -c ' warning ' /tmp/lint_initial.txt)"
```

### Résultat état initial

| Commande | Résultat | Erreurs | Warnings | Action requise |
|---------|---------|---------|---------|----------------|
| npm run build | PASS/FAIL | N | N | |
| npm run lint | PASS/FAIL | N | N | |
| python import api | PASS/FAIL | N | — | |
| pytest tests/ | PASS/FAIL | N | — | |
| npm run test | PASS/FAIL | N | — | |

---

## BD2 — ANALYSE DOCKERFILE (si existe)

```bash
cat Dockerfile 2>/dev/null || echo "Pas de Dockerfile"
cat docker-compose.yml 2>/dev/null || echo "Pas de docker-compose.yml"
```

### Questions Dockerfile backend

```
□ Image de base : python:3.11-slim (pas :latest, pas root image) ?
□ Multi-stage build : build stage séparé de run stage ?
□ Utilisateur non-root créé et utilisé ?
□ COPY requirements.txt avant COPY . (cache layer optimal) ?
□ pip install avec --no-cache-dir --require-hashes ?
□ HEALTHCHECK défini ?
□ CMD vs ENTRYPOINT : cohérent ?
□ Port exposé avec EXPOSE ?
□ Variables sensibles via ENV au runtime (pas hardcodées) ?
□ .dockerignore présent et complet ?

ANALYSE LIGNE PAR LIGNE :
  [AGENT: lire intégralement]
```

### Questions Dockerfile frontend

```
□ Multi-stage : node:20-alpine (build) + nginx:alpine (serve) ?
□ Build args pour les variables VITE_* ?
□ nginx.conf custom avec :
  → gzip activé ?
  → Cache-Control correct (immutable pour assets hashés) ?
  → Try_files pour SPA routing ?
  → Security headers ?
□ Taille image finale < 50Mo ?
```

### Grille Dockerfile

| Critère | Backend | Frontend | Action |
|---------|---------|---------|--------|
| Image non-root | | | |
| Multi-stage | | | |
| Layer cache optimal | | | |
| HEALTHCHECK | | | |
| .dockerignore | | | |
| Taille image | N Mo | N Mo | |
| Secrets hardcodés | Non | Non | |

---

## BD3 — ANALYSE .dockerignore

```bash
cat .dockerignore 2>/dev/null || echo "ABSENT — PROBLÈME"
```

```
Doit contenir AU MINIMUM :
  .git
  .gitignore
  node_modules/
  __pycache__/
  *.pyc
  .env
  .env.*
  !.env.example
  dist/
  build/
  *.log
  tests/
  .pytest_cache/
  coverage/
  .github/
  docs/
  *.md (optionnel)
  venv/
  .venv/
```

### Entrées manquantes dans .dockerignore

| Entrée manquante | Impact | À ajouter |
|-----------------|--------|-----------|
| [AGENT: lister] | | |

---

## BD4 — ANALYSE CI/CD GITHUB ACTIONS

```bash
find .github/workflows/ -name "*.yml" | sort
for f in .github/workflows/*.yml; do
  echo "=== $f ==="
  cat "$f"
  echo ""
done
```

### Pour CHAQUE workflow :

```
Format :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fichier : .github/workflows/[nom].yml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRIGGERS :
  □ push → branches : [liste]
  □ pull_request → branches : [liste]
  □ schedule : [si applicable]

JOBS :
  Pour chaque job → analyser :
  □ runs-on : ubuntu-latest (ok) ou version pinned ?
  □ Timeout-minutes défini (éviter les jobs qui tournent infiniment) ?
  □ Cache pip/npm configuré ?
  □ Secrets utilisés : listés et vérifiés dans Settings ?
  □ Permissions minimales (pas de permissions: write-all) ?
  □ Continue-on-error : justifié si présent ?

ÉTAPES DU CI :
  □ Lint backend (flake8/ruff) + frontend (eslint) ?
  □ Tests backend avec DB de test ?
  □ Tests frontend avec coverage ?
  □ Build docker (si applicable) ?
  □ Security scan (pip-audit, npm audit, trivy) ?
  □ Deploy uniquement sur main/prod (pas sur les branches de dev) ?

SECRETS UTILISÉS :
  □ DATABASE_URL_TEST → DB de test séparée de la prod ?
  □ GEMINI_API_KEY → mockée en test ou quota de test ?
  □ JWT_SECRET → secret de test différent du secret prod ?
  □ Deploy secrets (RENDER_API_KEY, etc.) protégés ?
```

### Grille CI/CD

| Workflow | Trigger | Lint | Tests | Security | Build | Deploy | Problèmes |
|---------|---------|------|-------|---------|-------|--------|---------|
| ci.yml | | | | | | | |
| deploy.yml | | | | | | | |
| [autres] | | | | | | | |

---

## BD5 — ANALYSE RENDER.YAML (ou autre plateforme)

```bash
cat render.yaml 2>/dev/null
cat vercel.json 2>/dev/null
cat fly.toml 2>/dev/null
cat railway.toml 2>/dev/null
```

```
Questions :
  □ Services définis correctement (backend + frontend séparés) ?
  □ Variables d'env référencées (pas hardcodées) ?
  □ Health check path défini (/health) ?
  □ Auto-deploy sur la bonne branche uniquement ?
  □ Scaling configuré (min instances, max instances) ?
  □ Région choisie (latence pour les utilisateurs) ?
  □ Build command correcte ?
  □ Start command correcte ?
  □ Disk / volume monté si watchdog folder nécessaire ?
```

---

## BD6 — VARIABLES D'ENVIRONNEMENT — ANALYSE COMPLÈTE

```bash
# Extraire TOUTES les variables d'env utilisées dans le code
grep -rn "os.environ\|os.getenv\|settings\." \
  backend/ api.py --include="*.py" | \
  grep -oE '[A-Z_]{3,}' | sort | uniq -c | sort -rn

# Frontend
grep -rn "import.meta.env\." docling-pwa/src/ | \
  grep -oE 'VITE_[A-Z_]+' | sort | uniq -c | sort -rn
```

### Tableau complet variables d'environnement

| Variable | Backend/Frontend | Obligatoire | Validée | Valeur par défaut | Documentée dans .env.example | Problème |
|---------|-----------------|-------------|---------|------------------|------------------------------|---------|
| GEMINI_API_KEY | Backend | OUI | OUI | — | | |
| DATABASE_URL | Backend | OUI | OUI | — | | |
| JWT_SECRET | Backend | OUI | Longueur ? | — | | |
| JWT_EXPIRY_HOURS | Backend | Non | — | 24 | | |
| WATCHDOG_FOLDER | Backend | Non | — | ./Docling_Factures | | |
| WATCHDOG_ENABLED | Backend | Non | — | true | | |
| DEFAULT_AI_MODEL | Backend | Non | enum ? | — | | |
| STORJ_ACCESS_KEY | Backend | Non | — | — | | |
| STORJ_SECRET_KEY | Backend | Non | — | — | | |
| STORJ_ENDPOINT | Backend | Non | — | — | | |
| STORJ_BUCKET | Backend | Non | — | — | | |
| PWA_URL | Backend | Non | — | CORS | | |
| SENTRY_DSN | Backend | Non | — | — | | |
| ENVIRONMENT | Backend | Non | — | production | | |
| VITE_API_URL | Frontend | Prod | — | window.origin | | |
| VITE_AUTH_REQUIRED | Frontend | Non | bool ? | true | | |
| VITE_TVA_RATE | Frontend | Non | number ? | 0.21 | | |
| [AGENT: compléter] | | | | | | |

### Checklist .env.example

```bash
cat .env.example

Doit contenir :
  □ TOUTES les variables obligatoires avec description
  □ TOUTES les variables optionnelles avec valeur par défaut
  □ Commentaires explicatifs pour chaque variable
  □ Exemples réalistes (pas de vraies valeurs !)
  □ Sections organisées (Backend, Frontend, Services)
  □ Instructions de génération JWT_SECRET
```

---

## BD7 — ANALYSE DES SCRIPTS NPM

```bash
cat docling-pwa/package.json | python -c "
import json, sys
pkg = json.load(sys.stdin)
scripts = pkg.get('scripts', {})
for name, cmd in scripts.items():
    print(f'{name:20} → {cmd}')
"
```

### Grille scripts npm

| Script | Commande | Fonctionnel | Manque quelque chose |
|--------|---------|------------|---------------------|
| dev | | | |
| build | | | |
| preview | | | |
| lint | | | |
| test | | | |
| test:coverage | | Existe ? | |
| test:e2e | | Existe ? | |
| type-check | | Existe ? | |
| [AGENT: tous les scripts] | | | |

**Scripts manquants critiques :**

| Script | Commande suggérée | Pourquoi critique |
|--------|-----------------|------------------|
| test:coverage | vitest run --coverage | Couverture en CI |
| lint:fix | eslint src --fix | Fix auto |
| [AGENT: identifier les manquants] | | |

---

## BD8 — MAKEFILE / SCRIPTS DE DEV

```bash
cat Makefile 2>/dev/null || echo "Pas de Makefile"
```

```
Questions :
  □ Commandes pour démarrer le dev local documentées ?
  □ make dev → lance backend + frontend simultanément ?
  □ make test → lance tous les tests ?
  □ make migrate → applique les migrations ?
  □ make clean → nettoie les artifacts ?
  □ Variables configurables (PORT, etc.) ?
```

---

## BD9 — ANALYSE PWA

```bash
cat docling-pwa/vite.config.js | grep -A 50 "VitePWA\|pwa"
cat docling-pwa/public/manifest.json 2>/dev/null || \
  grep -A 30 "manifest" docling-pwa/vite.config.js
```

```
Questions :
  □ manifest.json correct :
    → name et short_name définis ?
    → display: "standalone" ?
    → start_url: "/" ?
    → icons : 192x192 ET 512x512 au minimum ?
    → theme_color et background_color ?

  □ Service Worker :
    → Stratégie de cache appropriée ?
    → NetworkFirst pour les appels API (pas CacheFirst) ?
    → CacheFirst pour les assets statiques ?
    → Offline fallback page ?
    → Update disponible notifié à l'utilisateur ?

  □ HTTPS obligatoire (PWA ne fonctionne pas en HTTP non-localhost) ?

  □ Installabilité :
    → install prompt disponible ?
    → beforeinstallprompt intercepté ?
```

---

## BD10 — ANALYSE LOGS & MONITORING

```bash
grep -rn "sentry\|Sentry\|SENTRY" api.py backend/ docling-pwa/src/ -i | head -20
grep -rn "logger\|logging" backend/ --include="*.py" | head -20
```

```
Backend :
  □ Sentry initialisé avec le bon DSN ?
  □ Sentry traces_sample_rate configuré (0.1 en prod, 1.0 en dev) ?
  □ Erreurs non-catchées remontent à Sentry ?
  □ Logging format JSON (pour agrégateurs comme Datadog, Loki) ?
  □ Logging level configurable via ENVIRONMENT ?
  □ Logs de démarrage indiquent la version et la config ?

Frontend :
  □ @sentry/react intégré avec ErrorBoundary ?
  □ Sentry.captureException() sur les erreurs API critiques ?
  □ Performance monitoring activé ?
  □ Release tagging (version dans les releases Sentry) ?
```

---

## CORRECTIONS BUILD REQUISES

```
[BD-001] PROBLÈME BUILD
  Fichier  : [fichier]
  Erreur   : [message exact]
  Fix      : [code complet]
  Vérif    : [commande pour confirmer le fix]

[BD-XXX] ...
```

---

## SCORECARD BUILD & DÉPLOIEMENT

| Domaine | Score /100 | Problèmes 🔴 | Problèmes 🟠 | Notes |
|---------|-----------|-------------|-------------|-------|
| Build frontend | /100 | | | |
| Build backend | /100 | | | |
| Dockerfile | /100 | | | |
| CI/CD pipeline | /100 | | | |
| Variables d'env | /100 | | | |
| PWA config | /100 | | | |
| Monitoring | /100 | | | |
| **GLOBAL** | **/100** | | | |

---

## ✅ GATE BD — BUILD & DÉPLOIEMENT

```bash
# 1. Build frontend propre
cd docling-pwa
npm ci && npm run build
# → Exit code 0

# 2. Lint sans erreurs bloquantes
npm run lint
# → Exit code 0

# 3. Import backend sans erreur
cd ..
python -c "import api; print('OK')"
# → OK

# 4. .env.example complet
diff <(grep -oE '^[A-Z_]+=?' .env.example | sort) \
     <(grep -rn "os.getenv\|os.environ\|settings\." backend/ api.py | \
       grep -oE '[A-Z_]{4,}' | sort | uniq) 2>/dev/null
# → Idéalement 0 différences (toutes les variables documentées)

# 5. package-lock.json présent
test -f docling-pwa/package-lock.json && echo "✅ lockfile présent" || echo "❌ ABSENT"

PASS si :
  → npm run build → exit code 0
  → python import → 0 erreur
  → 0 secret hardcodé dans le code
  → package-lock.json présent

STATUS : [ ] PASS  [ ] FAIL
```
