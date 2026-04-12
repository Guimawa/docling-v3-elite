# 🧹 01 — NETTOYAGE PROJET 2026
# Exécuter EN PREMIER — Avant tout audit
# Un projet propre = un audit juste + migration stack 2026 identifiée

---

## PRINCIPE

```
Un projet encombré de fichiers obsolètes produit des faux positifs
et cache les vrais problèmes.

En 2026, le nettoyage inclut également :
  → Identification des outils legacy (ESLint, Prettier, flake8, black, pip, npm)
  → Plan de migration vers la stack 2026 (Biome, Ruff, uv, pnpm)
  → Suppression des patterns dépréciés dans les configs

NETTOYAGE ≠ SUPPRESSION AVEUGLE.
Chaque suppression est justifiée et documentée.
Chaque fichier supprimé est sauvegardé dans /tmp/cleaned_backup/ avant.
```

---

## PHASE N1 — IDENTIFIER LES FICHIERS PARASITES

```bash
# N1-A : Fichiers d'anciens audits et résultats
find . -type f \( \
  -iname "*audit*" -o -iname "*resultat*" -o -iname "*result*" \
  -o -iname "*rapport*" -o -iname "*report*" -o -iname "*backup*" \
  -o -iname "*.bak" -o -iname "*ancien*" -o -iname "*old*" \
  -o -iname "*v1_*" -o -iname "*v2_*" -o -iname "*v3_*" \
  -o -iname "*draft*" -o -iname "*temp*" -o -iname "*tmp*" \
  -o -iname "*todo*" -o -iname "*notes*" \
\) | grep -v ".git" | grep -v "node_modules" | sort

# N1-B : Fichiers vides
find . -type f -empty | grep -v ".git" | grep -v "node_modules"

# N1-C : Fichiers dupliqués (même contenu)
find . -type f | grep -v ".git" | grep -v "node_modules" \
  | xargs md5sum 2>/dev/null | sort | awk 'seen[$1]++'

# N1-D : Code orphelin backend
for f in $(find backend/ -name "*.py" -not -name "__init__.py"); do
  module=$(basename $f .py)
  count=$(grep -rn "from.*$module\|import.*$module" \
    --include="*.py" . | grep -v "$f" | wc -l)
  echo "$count $f"
done | sort -n | head -20

# N1-E : Code orphelin frontend (TypeScript/TSX)
for f in $(find docling-pwa/src -name "*.tsx" -o -name "*.ts"); do
  name=$(basename $f | sed 's/\..*//')
  count=$(grep -rn "import.*$name\|from.*$name" \
    docling-pwa/src --include="*.tsx" --include="*.ts" | wc -l)
  echo "$count $f"
done | sort -n | head -20

# N1-F : Caches et artifacts
find . -name "__pycache__" -type d | grep -v ".git"
find . -name "*.pyc" | grep -v ".git"
find . -name ".pytest_cache" -type d | grep -v ".git"
find . -name ".mypy_cache" -type d | grep -v ".git"
find . -name ".ruff_cache" -type d | grep -v ".git"

# N1-G : Fichiers .env committés par erreur
git ls-files | grep -E "^\.env$|\.env\.[^e]"  # .env.example est OK

# N1-H : dist/ ou build/ committés
git ls-files | grep -E "^dist/|^build/|^docling-pwa/dist/"

# N1-I : Lockfiles concurrents (symptôme de gestionnaire mixte)
ls docling-pwa/package-lock.json 2>/dev/null && echo "⚠️ npm lockfile"
ls docling-pwa/yarn.lock 2>/dev/null && echo "⚠️ yarn lockfile"
ls docling-pwa/pnpm-lock.yaml 2>/dev/null && echo "✅ pnpm lockfile"
ls docling-pwa/bun.lockb 2>/dev/null && echo "✅ bun lockfile"
# → Un seul gestionnaire de paquets par projet !
```

### Tableau résultat N1 (à remplir par l'agent)

| Fichier | Raison | Action |
|---------|--------|--------|
| [AGENT: lister] | | SUPPRIMER / GARDER |

---

## PHASE N2 — INVENTAIRE DÉPENDANCES FANTÔMES & LEGACY

### Backend Python

```bash
# Installer uv si absent (gestionnaire moderne)
curl -LsSf https://astral.sh/uv/install.sh | sh 2>/dev/null || pip install uv

# Dépendances non utilisées
uv run pip-audit 2>/dev/null || pip-audit
uv run python -m pipreqs . --print 2>/dev/null | sort > /tmp/required_packages.txt
cat requirements.txt | grep -v "^#" | grep -v "^$" \
  | sed 's/[>=<!\[].*//' | tr '[:upper:]' '[:lower:]' | sort \
  > /tmp/declared_packages.txt
comm -23 /tmp/declared_packages.txt /tmp/required_packages.txt

# Détecter les packages legacy à remplacer en 2026
echo "=== PACKAGES LEGACY BACKEND ==="
grep -iE "^requests" requirements.txt \
  && echo "🆕 UPGRADE: requests → httpx (async natif)"
grep -iE "^black|^flake8|^isort|^pylint" requirements.txt \
  && echo "🆕 UPGRADE: black/flake8/isort → ruff (un seul outil)"
grep -iE "^python-jose|^pyjwt.*==1\." requirements.txt \
  && echo "🆕 UPGRADE: JWT library → PyJWT 2.x avec RS256"
grep -iE "^celery" requirements.txt \
  && echo "⚪ INFO: Celery présent (taskiq plus moderne en 2026)"
grep -iE "^pydantic==1\." requirements.txt \
  && echo "❌ LEGACY: Pydantic v1 → migrer vers Pydantic v2 OBLIGATOIRE"
grep -iE "^fastapi==0\.(9[0-9]|10[0-3])\." requirements.txt \
  && echo "🆕 UPGRADE: FastAPI < 0.115 → mettre à jour"
grep -iE "^psycopg2\b" requirements.txt \
  && echo "🆕 UPGRADE: psycopg2 sync → asyncpg ou psycopg3 async"
```

### Tableau dépendances backend

| Package | Version actuelle | Statut 2026 | Action |
|---------|-----------------|-------------|--------|
| fastapi | | ✅/🆕/❌ | GARDER / MIGRER |
| pydantic | | ✅/🆕/❌ | |
| requests | | ❌ LEGACY | → httpx |
| black/flake8/isort | | ❌ LEGACY | → ruff |
| [AGENT: compléter] | | | |

---

### Frontend Node

```bash
cd docling-pwa

# Dépendances non utilisées (avec pnpm/biome)
pnpm dlx depcheck --json 2>/dev/null | python3 -m json.tool \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(d.get('unused',{}).get('dependencies',[])))"

# Packages legacy à remplacer en 2026
echo "=== PACKAGES LEGACY FRONTEND ==="
node -e "
const pkg = require('./package.json');
const all = {...pkg.dependencies, ...pkg.devDependencies};
const checks = [
  ['react-router-dom', 'react-router-dom v5/v6', '→ TanStack Router v1 ou RRv7'],
  ['axios', 'axios seul', '→ TanStack Query v5 + axios (ou fetch natif)'],
  ['eslint', 'ESLint', '→ Biome 1.9+ (lint + format en un)'],
  ['prettier', 'Prettier', '→ Biome 1.9+ (lint + format en un)'],
  ['react-query', '@tanstack/react-query v4', '→ TanStack Query v5'],
  ['styled-components', 'styled-components', '→ Tailwind v4'],
  ['moment', 'moment.js (lourd)', '→ date-fns ou Temporal API'],
  ['lodash', 'lodash (lourd)', '→ natif ES2024 ou lodash-es tree-shakeable'],
  ['react', null, null],
];
checks.forEach(([pkg, label, suggestion]) => {
  const version = all[pkg];
  if (version) {
    const v = version.replace(/[^0-9.]/g,'').split('.')[0];
    if (pkg === 'react') {
      const major = parseInt(v);
      if (major < 19) console.log('🆕 UPGRADE: React ' + version + ' → React 19 stable');
      else console.log('✅ React 19+');
    } else {
      console.log('🆕 UPGRADE: ' + label + ' ' + version + ' ' + suggestion);
    }
  }
});
"

# Vérifier si TypeScript est utilisé (obligatoire en 2026)
ls src/**/*.jsx 2>/dev/null | wc -l | xargs -I{} echo "⚠️ {} fichiers .jsx → migrer en .tsx"
ls src/**/*.tsx 2>/dev/null | wc -l | xargs -I{} echo "✅ {} fichiers .tsx"
cat tsconfig.json 2>/dev/null | python3 -c "
import json,sys
c = json.load(sys.stdin)
co = c.get('compilerOptions', {})
issues = []
if not co.get('strict'): issues.append('strict: true manquant')
if not co.get('noUncheckedIndexedAccess'): issues.append('noUncheckedIndexedAccess manquant')
if co.get('target','') not in ['ES2022','ES2023','ES2024','ESNext']: issues.append('target trop vieux')
print('TypeScript issues:', issues if issues else 'OK')
" 2>/dev/null || echo "❌ tsconfig.json absent — TypeScript non configuré"

# deps → devDeps suspects
node -e "
const pkg = require('./package.json');
const deps = pkg.dependencies || {};
const suspects = Object.keys(deps).filter(k => k.match(
  /vite|vitest|eslint|prettier|biome|@types\/|typescript|tailwind|postcss|autoprefixer|testing-library|playwright|@vitejs/
));
if (suspects.length) console.log('Suspects (deps → devDeps):', suspects.join(', '));
"
```

### Tableau dépendances frontend

| Package | Catégorie actuelle | Statut 2026 | Action |
|---------|-------------------|-------------|--------|
| react | dependencies | ✅/🆕 | |
| react-router-dom | | 🆕 UPGRADE | → TanStack Router |
| eslint + prettier | devDeps | ❌ LEGACY | → Biome |
| [AGENT: tous] | | | |

---

## PHASE N3 — MIGRATION CONFIGS 2026

### N3-A : Détecter configs legacy à migrer

```bash
# ESLint + Prettier → Biome
[ -f ".eslintrc*" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] \
  && echo "🆕 .eslintrc → migrer vers biome.json"
[ -f ".prettierrc*" ] \
  && echo "🆕 .prettierrc → migrer vers biome.json (format)"
[ -f "babel.config.*" ] \
  && echo "🆕 babel → vite gère la transpilation, babel inutile"

# setup.cfg / setup.py → pyproject.toml
[ -f "setup.cfg" ] && echo "🆕 setup.cfg → consolider dans pyproject.toml"
[ -f "setup.py" ] && echo "🆕 setup.py → consolider dans pyproject.toml"

# flake8/black/isort configs → ruff
[ -f ".flake8" ] && echo "🆕 .flake8 → migrer vers [tool.ruff] dans pyproject.toml"
[ -f ".black" ] || grep -q "black" pyproject.toml 2>/dev/null \
  && echo "🆕 black config → migrer vers ruff format"

# pytest.ini → pyproject.toml
[ -f "pytest.ini" ] \
  && echo "🆕 pytest.ini → consolider dans [tool.pytest.ini_options] pyproject.toml"

# package.json scripts legacy
node -e "
const s = require('./docling-pwa/package.json').scripts || {};
if (!s['lint'] || s['lint'].includes('eslint')) console.log('🆕 lint script → utiliser biome check');
if (!s['format'] || s['format'].includes('prettier')) console.log('🆕 format script → utiliser biome format');
if (!s['type-check']) console.log('❌ type-check script manquant → tsc --noEmit');
if (!s['test:e2e']) console.log('⚠️ test:e2e manquant → configurer Playwright');
" 2>/dev/null
```

### N3-B : Template pyproject.toml 2026 (générer si absent/incomplet)

```toml
# FICHIER CIBLE : pyproject.toml
[project]
name = "docling-agent"
version = "4.0.0"
requires-python = ">=3.12"
dependencies = []  # Lire requirements.txt

[tool.ruff]
target-version = "py312"
line-length = 100
fix = true

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "A", "C4", "PT", "SIM", "TCH", "ARG", "S"]
ignore = ["S101"]  # assert en test OK

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --tb=short --cov=. --cov-report=term-missing"

[tool.coverage.report]
fail_under = 80
exclude_lines = ["pragma: no cover", "if TYPE_CHECKING"]
```

### N3-C : Template biome.json 2026 (générer si absent)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "error" },
      "suspicious": { "noExplicitAny": "warn" },
      "style": { "useImportType": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "trailingCommas": "all" }
  },
  "files": {
    "ignore": ["node_modules", "dist", "build", "coverage", ".next"]
  }
}
```

---

## PHASE N4 — NETTOYAGE GIT

```bash
# N4-A : Branches locales mortes
git branch --merged main | grep -v "^\* main$" | grep -v "main"

# N4-B : Fichiers trackés → .gitignore
git ls-files | grep -E "\.(env|log|tmp|bak|orig|DS_Store)$"
git ls-files | grep -E "^dist/|^build/|^\.pytest_cache/|^__pycache__/|^\.ruff_cache/"

# N4-C : Secrets potentiels dans l'historique git
git log --all -p | grep -iE \
  "(password|secret|token|apikey|api_key|private_key)\s*[=:]\s*['\"][^'\"]{8}" \
  | grep -v "example\|placeholder\|your_\|os\.\|settings\." | head -20

# N4-D : Gros fichiers (> 1Mo) committés par erreur
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {if ($3 > 1048576) print $3/1024/1024 "MB", $4}' | sort -rn | head -10
```

---

## PHASE N5 — .gitignore 2026

```
Vérifier que .gitignore contient AU MINIMUM :

Backend Python 3.12+ :
  __pycache__/
  *.pyc
  *.pyo
  .env
  .env.*
  !.env.example
  venv/ | .venv/
  *.egg-info/
  dist/ | build/
  .pytest_cache/
  .mypy_cache/
  .ruff_cache/
  .coverage | htmlcov/
  *.log

Frontend (pnpm + Vite + TypeScript) :
  node_modules/
  dist/ | build/
  .env | .env.*
  !.env.example
  *.local
  .DS_Store
  coverage/
  .vite/
  *.tsbuildinfo        ← TypeScript incremental build

Global 2026 :
  .DS_Store
  Thumbs.db
  *.swp | *.swo
  .idea/
  .vscode/settings.json
  *.orig | *.bak
  .cursor/            ← Fichiers Cursor IDE (peuvent contenir des infos sensibles)
```

---

## PHASE N6 — EXÉCUTION & VALIDATION DU NETTOYAGE

```bash
# Sauvegarder avant suppression
mkdir -p /tmp/cleaned_backup_$(date +%Y%m%d_%H%M)

# Nettoyer les caches
find . -type d -name "__pycache__" | grep -v ".git" | xargs rm -rf
find . -name "*.pyc" -o -name "*.pyo" | xargs rm -f
find . -name ".DS_Store" | xargs rm -f
find . -name ".ruff_cache" -type d | xargs rm -rf
find . -name ".mypy_cache" -type d | xargs rm -rf

# Valider que le projet tourne encore
python -c "import api; print('✅ Backend OK')"
cd docling-pwa
pnpm build 2>&1 | tail -5 || npm run build 2>&1 | tail -5

# Bilan
echo "=== BILAN NETTOYAGE ==="
echo "Fichiers avant : $(cat /tmp/all_files_raw.txt | wc -l)"
echo "Fichiers après : $(find . -type f | grep -v .git | grep -v node_modules | wc -l)"
```

---

## RAPPORT DE NETTOYAGE

```
| Catégorie              | Trouvés | Supprimés | Gardés | Justification |
|------------------------|---------|-----------|--------|---------------|
| Anciens audits         |         |           |        |               |
| Fichiers vides         |         |           |        |               |
| Fichiers dupliqués     |         |           |        |               |
| Code orphelin backend  |         |           |        |               |
| Code orphelin frontend |         |           |        |               |
| Deps fantômes backend  |         |           |        |               |
| Deps fantômes frontend |         |           |        |               |
| Configs legacy         |         |           |        |               |
| Lockfiles concurrents  |         |           |        |               |
| TOTAL                  |         |           |        |               |

MIGRATION STACK IDENTIFIÉE :
  Packages backend à migrer   : N
  Packages frontend à migrer  : N
  Configs à consolider        : N
  Estimé effort migration     : X jours
```

---

## ✅ GATE N — NETTOYAGE 2026

```bash
# 1. Build OK après nettoyage
cd docling-pwa && pnpm build 2>&1 | grep -c "error" | xargs -I{} test {} -eq 0 \
  && echo "✅ Build OK" || echo "❌ Build cassé"

# 2. Import backend OK
python -c "import api; print('✅')" 2>&1

# 3. Pas de fichiers d'audit dans le projet
find . -iname "*audit*" | grep -v ".git" | grep -v node_modules | wc -l
# → 0 (sauf le dossier AUDIT_BETON lui-même)

# 4. Un seul lockfile
ls docling-pwa/package-lock.json docling-pwa/yarn.lock \
   docling-pwa/pnpm-lock.yaml docling-pwa/bun.lockb 2>/dev/null | wc -l
# → 1 (un seul)

PASS si :
  → 0 fichier d'ancien audit
  → Build OK
  → Import backend OK
  → .gitignore complet
  → Un seul lockfile

STATUS : [ ] PASS  [ ] FAIL
→ Si PASS : continuer vers 02_CARTOGRAPHIE.md
```