# 🏗️ AUDIT BÉTON — DOCLING AGENT v4
# Prompt Maître — Point d'entrée unique
# Stack 2026 · Sévérité maximale · Exhaustivité totale · Zéro tolérance

---

## ⚠️ AVERTISSEMENT PRÉLIMINAIRE

```
CE PROMPT EST SÉVÈRE. PAS DE COMPLAISANCE.
Chaque ligne de code sera lue. Chaque fonction sera jugée.
Chaque fichier inutile sera supprimé. Chaque bug sera corrigé.

SI TU NE PEUX PAS LIRE CHAQUE FICHIER EN ENTIER → ARRÊTE-TOI.
SI TU NE PEUX PAS FOURNIR DU CODE COMPLET → ARRÊTE-TOI.
SI TU PENSES RACCOURCIR → ARRÊTE-TOI.

Il n'existe pas de "ça a l'air correct".
Il n'existe pas de "probablement OK".
Il n'existe pas de "à adapter selon le contexte".

Il existe seulement :
  → J'ai lu. J'ai vérifié. Voici le code exact. Ça marche.
```

---

## 🆕 STACK CIBLE 2026 — STANDARDS OBLIGATOIRES

```
BACKEND :
  Runtime       → Python 3.12+ (3.13 si dispo)
  Framework     → FastAPI 0.115+ (lifespan context, pas @app.on_event)
  Validation    → Pydantic v2 (model_config, @model_validator, @field_validator)
  DB async      → asyncpg 0.30+ OU SQLAlchemy 2.0+ async engine
  Migrations    → Alembic 1.13+
  Crypto        → argon2-cffi (argon2id) + PyJWT 2.x avec RS256 si possible
  HTTP client   → httpx (jamais requests en async)
  Logs          → structlog (JSON structuré) ou loguru
  Package mgr   → uv (pip en fallback), jamais pip sans uv en 2026
  Linter/Format → Ruff (remplace flake8 + black + isort en un seul outil)
  Type check    → mypy 1.10+ strict OU pyright
  Tests         → pytest 8+ avec pytest-asyncio 0.24+
  Sécurité scan → pip-audit + bandit 1.8+

FRONTEND :
  Runtime       → Node 22 LTS (jamais Node 18 en 2026)
  Framework     → React 19 stable (use() hook, Actions, optimistic updates)
  Build         → Vite 6+ (jamais CRA, jamais webpack)
  Router        → TanStack Router v1 (file-based) OU React Router v7
  Data fetch    → TanStack Query v5 (ex-React Query) — Axios uniquement si legacy
  State         → Zustand 5+ (jamais Redux sans raison forte)
  Styles        → Tailwind CSS v4 (CSS-first config, @theme en CSS)
  Linter        → Biome 1.9+ (remplace ESLint + Prettier en un seul outil)
  Tests unit    → Vitest 2.x + Testing Library React 16+
  Tests E2E     → Playwright 1.45+
  Package mgr   → pnpm 9+ (ou bun) — npm uniquement si contrainte externe
  Type check    → TypeScript 5.5+ strict (JSX en .tsx, jamais .jsx en 2026)
  PWA           → vite-plugin-pwa 0.21+

INFRASTRUCTURE :
  Container     → Docker avec multi-stage + BuildKit
  CI/CD         → GitHub Actions avec cache optimisé (uv cache, pnpm store)
  DB host       → Neon PostgreSQL (branching pour les migrations)
  Monitoring    → Sentry SDK v8+ (backend + frontend)
  Secrets       → Variables env validées au startup (jamais hardcodées)

SÉCURITÉ 2026 :
  Auth          → JWT RS256 (asymétrique) ou Passkeys/WebAuthn
  Headers       → Permissions-Policy, Cross-Origin-Opener-Policy (COOP)
  CORS          → Liste blanche stricte (jamais "*" avec credentials)
  Input         → Validation Pydantic v2 + schéma LLM strict (prompt injection)
  Deps          → pip-audit + npm audit + Trivy dans CI
```

---

## 🗂️ STRUCTURE DES LIVRABLES

```
Cet audit produit 10 fichiers .md dans un dossier AUDIT_BETON/ :

  AUDIT_BETON/
  ├── 00_MASTER_PROMPT.md          ← Ce fichier (point d'entrée)
  ├── 01_NETTOYAGE.md              ← Nettoyage projet AVANT audit
  ├── 02_CARTOGRAPHIE.md           ← Référence exhaustive de TOUS les fichiers
  ├── 03_BACKEND.md                ← Audit complet backend
  ├── 04_FRONTEND.md               ← Audit complet frontend
  ├── 05_BASE_DE_DONNEES.md        ← Audit BDD, migrations, schémas
  ├── 06_SECURITE.md               ← Audit sécurité OWASP 2025 complet
  ├── 07_TESTS.md                  ← Audit tests + écriture des manquants
  ├── 08_BUILD_DEPLOIEMENT.md      ← CI/CD, Docker, envs, déploiement
  ├── 09_PERFORMANCE.md            ← Perf backend, frontend, bundle, Core Web Vitals
  └── 10_RAPPORT_FINAL.md          ← Scorecard, plan d'action, verdict

ORDRE D'EXÉCUTION OBLIGATOIRE :
  01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10
  Chaque fichier se termine par un "GATE" binaire (PASS/FAIL)
  avant de passer au suivant.
```

---

## 🔥 RÈGLES ABSOLUES — NON NÉGOCIABLES

```
RÈGLE 1 — LECTURE INTÉGRALE
  Lire chaque fichier de la première à la dernière ligne.
  Citer le numéro de ligne pour chaque observation.
  "J'ai lu X lignes" est la première phrase de chaque analyse.

RÈGLE 2 — ZÉRO FICHIER IGNORÉ
  Tout fichier dans le repo est analysé.
  Même les fichiers de config (biome.json, pyproject.toml, tsconfig.json).
  Même les fichiers vides (pourquoi existent-ils ?).
  Même les README.md de sous-dossiers.

RÈGLE 3 — IGNORER LES ANCIENS RÉSULTATS D'AUDIT
  Tout fichier contenant "audit", "résultat", "ancien", "backup",
  "old", "v1", "v2", "v3", "draft", "temp", "todo" dans son nom
  → Lister dans 01_NETTOYAGE.md pour SUPPRESSION.
  Ces fichiers NE SONT PAS analysés comme code source.

RÈGLE 4 — CODE COMPLET UNIQUEMENT
  Chaque correction est un fichier complet, prêt à remplacer.
  Format :
  \`\`\`python
  # FICHIER COMPLET : backend/core/config.py
  # REMPLACE : backend/core/config.py
  # PYTHON 3.12+ | PYDANTIC V2 | RUFF COMPLIANT
  # LIGNES : 1 à N (tout le fichier)
  [code intégral ici]
  \`\`\`

RÈGLE 5 — SÉVÉRITÉ MAXIMALE
  🔴 FATAL    → Bloque la prod. À corriger avant tout.
  🟠 CRITIQUE → Cause des bugs en prod. À corriger cette semaine.
  🟡 MAJEUR   → Dette technique sérieuse / patterns dépassés 2026. Ce mois.
  🔵 MINEUR   → Qualité code. À corriger quand possible.
  ⚪ INFO     → Observation sans action requise.
  🆕 UPGRADE  → Code fonctionnel mais pattern 2025 → migrer vers 2026.

  SEUIL MINIMUM POUR "PRÊT PROD" :
  → 0 problème 🔴
  → 0 problème 🟠
  → < 5 problèmes 🟡
  → Tous les 🆕 UPGRADE planifiés dans la roadmap

RÈGLE 6 — VÉRIFICATION BUILD APRÈS CHAQUE DOMAINE
  À la fin de chaque fichier .md :
  → Fournir les commandes exactes de vérification
  → Le résultat attendu
  → GATE : PASS ou FAIL

RÈGLE 7 — AUCUNE RÉFÉRENCE AUX ANCIENS AUDITS
  Les résultats d'audits précédents sont IGNORÉS.
  L'audit est FRAIS. Sans biais. Sans complaisance.

RÈGLE 8 — COMPARAISON STACK 2026 [NOUVELLE]
  Pour chaque pattern identifié, signaler s'il est :
  → ✅ CURRENT 2026 : Standard actuel, rien à changer
  → 🆕 UPGRADE 2026 : Fonctionnel mais pattern dépassé, plan de migration
  → ❌ LEGACY : Pattern abandonné, migration obligatoire
  
  Exemples :
  ❌ LEGACY  : @app.on_event("startup") → utiliser lifespan()
  ❌ LEGACY  : react-router v5 → utiliser TanStack Router ou RRv7
  ❌ LEGACY  : ESLint + Prettier séparés → utiliser Biome
  ❌ LEGACY  : npm → utiliser pnpm ou bun
  ❌ LEGACY  : .jsx → utiliser .tsx avec TypeScript strict
  🆕 UPGRADE : React 18 → migrer React 19 (use(), Actions)
  🆕 UPGRADE : HS256 JWT → préférer RS256 ou Passkeys
  🆕 UPGRADE : Axios seul → TanStack Query v5 + Axios
```

---

## 🚀 DÉMARRAGE — SÉQUENCE D'INITIALISATION 2026

```bash
# ÉTAPE INIT-1 : Versions du runtime (CRITIQUE en 2026)
python --version  # → doit être >= 3.12
node --version    # → doit être >= 22 (LTS)
pnpm --version 2>/dev/null || npm --version  # → pnpm préféré

# ÉTAPE INIT-2 : Cartographie brute
find . -type f | grep -v ".git" | grep -v node_modules \
  | grep -v __pycache__ | grep -v ".pyc" | grep -v "dist/" | sort \
  > /tmp/all_files_raw.txt
wc -l /tmp/all_files_raw.txt

# ÉTAPE INIT-3 : Détecter les outils utilisés (stack réelle vs stack cible)
echo "=== OUTILS DÉTECTÉS ==="
[ -f "ruff.toml" ] || [ -f "pyproject.toml" ] && grep -q "ruff" pyproject.toml \
  && echo "✅ Ruff" || echo "❌ Ruff manquant (flake8/black legacy ?)"
[ -f "biome.json" ] && echo "✅ Biome" || echo "❌ Biome manquant (ESLint legacy ?)"
[ -f "pnpm-lock.yaml" ] && echo "✅ pnpm" || echo "⚠️ npm/yarn (migrer vers pnpm)"
[ -f "bun.lockb" ] && echo "✅ bun"
python -c "import uv" 2>/dev/null && echo "✅ uv" || echo "⚠️ uv non détecté"
grep -q "lifespan" api.py 2>/dev/null && echo "✅ FastAPI lifespan" \
  || echo "❌ @app.on_event legacy détecté"
grep -q "model_config" backend/schemas/*.py 2>/dev/null \
  && echo "✅ Pydantic v2" || echo "❌ Pydantic v1 legacy"

# ÉTAPE INIT-4 : Identifier les fichiers suspects
grep -i "audit\|backup\|old\|v1\|v2\|v3\|draft\|temp\|ancien\|résultat" \
  /tmp/all_files_raw.txt | grep -v ".git"

# ÉTAPE INIT-5 : Compter les lignes de code réelles
find . \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) \
  | grep -v node_modules | grep -v .git | grep -v dist \
  | xargs wc -l 2>/dev/null | tail -1

# ÉTAPE INIT-6 : État du build AVANT audit
echo "=== ÉTAT BUILD INITIAL ==="
cd docling-pwa
pnpm build 2>&1 | tail -20 || npm run build 2>&1 | tail -20
cd ..
python -c "import api" 2>&1
ruff check . 2>&1 | tail -10 || echo "Ruff non installé"
pnpm biome check ./docling-pwa/src 2>&1 | tail -10 || echo "Biome non installé"

SEULEMENT APRÈS ces 6 étapes → commencer le fichier 01_NETTOYAGE.md
```

---

## 📌 POINT DE CONTRÔLE FINAL

```
L'audit est terminé quand et SEULEMENT quand :

  ✅ 01_NETTOYAGE.md     : Projet nettoyé, confirmé
  ✅ 02_CARTOGRAPHIE.md  : 100% des fichiers référencés
  ✅ 03_BACKEND.md       : GATE = PASS (0 fatal, 0 critique)
  ✅ 04_FRONTEND.md      : GATE = PASS
  ✅ 05_BASE_DE_DONNEES.md : GATE = PASS
  ✅ 06_SECURITE.md      : GATE = PASS
  ✅ 07_TESTS.md         : GATE = PASS (build + tests verts)
  ✅ 08_BUILD_DEPLOIEMENT.md : GATE = PASS
  ✅ 09_PERFORMANCE.md   : GATE = PASS (Core Web Vitals OK)
  ✅ 10_RAPPORT_FINAL.md : Scorecard calculé

  pnpm build       → 0 erreur, bundle < 500KB gzip
  pytest tests/    → 0 fail, couverture > 80%
  pnpm test        → 0 fail
  ruff check .     → 0 erreur
  pnpm biome check → 0 erreur
  pip-audit        → 0 CVE critique/haute
  pnpm audit       → 0 CVE critique/haute

  Score final calculé OBJECTIVEMENT sur les 10 domaines.
  Verdict : PRÊT PROD / NON PRÊT / CONDITIONNEL + liste blockers.
  Roadmap 2026 : plan de migration des patterns 🆕 UPGRADE listés.
```