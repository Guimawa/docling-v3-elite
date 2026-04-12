# 🗺️ 02 — CARTOGRAPHIE EXHAUSTIVE 2026
# Référence de 100% des fichiers · TypeScript · Python 3.12+
# Aucun fichier ignoré — Aucune supposition

---

## PRINCIPE

```
Cette cartographie est LA référence absolue du projet.
En 2026, elle inclut également :
  → Détection des patterns legacy vs current 2026
  → Couverture TypeScript (%.tsx vs .jsx restants)
  → Présence des configs modernes (pyproject.toml, biome.json)

FORMAT DE CHAQUE ENTRÉE :
  [chemin/fichier]
  ├── LIGNES       : N
  ├── TYPE         : .ts/.tsx/.py (jamais .jsx en 2026)
  ├── RÔLE         : Ce que ce fichier fait en 1 phrase
  ├── DÉPEND DE    : Fichiers/modules qu'il importe
  ├── UTILISÉ PAR  : Fichiers qui l'importent
  ├── DERNIER MAJ  : git log -1 --format="%ar" -- [fichier]
  ├── PATTERN 2026 : ✅ Current / 🆕 Upgrade / ❌ Legacy
  └── ÉTAT         : ✅ Normal / ⚠️ À surveiller / ❌ Problème
```

---

## GÉNÉRATION DE LA CARTOGRAPHIE

```bash
# 1. Arborescence complète (exclure les artifacts)
find . -type f \
  | grep -v ".git" | grep -v "node_modules" \
  | grep -v "__pycache__" | grep -v "*.pyc" \
  | grep -v "/dist/" | grep -v "/.vite/" \
  | grep -v ".ruff_cache" | grep -v ".mypy_cache" \
  | sort > /tmp/project_files.txt
echo "TOTAL FICHIERS : $(wc -l < /tmp/project_files.txt)"

# 2. Taille et lignes des fichiers source
for f in $(find . \
  \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" \
     -o -name "*.css" -o -name "*.json" \) \
  | grep -v node_modules | grep -v dist | grep -v ".git"); do
  lines=$(wc -l < "$f" 2>/dev/null || echo 0)
  size=$(du -h "$f" 2>/dev/null | cut -f1)
  echo "$lines lignes | $size | $f"
done | sort -rn > /tmp/files_by_size.txt

# 3. Top 10 fichiers les plus longs (fichiers à surveiller)
echo "=== TOP 10 FICHIERS LES PLUS LONGS ==="
head -10 /tmp/files_by_size.txt

# 4. Ratio TypeScript : .tsx+.ts vs .jsx+.js restants
tsx_count=$(find docling-pwa/src -name "*.tsx" -o -name "*.ts" | wc -l)
jsx_count=$(find docling-pwa/src -name "*.jsx" -o -name "*.js" \
  | grep -v ".config." | wc -l)
echo "TypeScript : $tsx_count fichiers .ts/.tsx"
echo "JavaScript  : $jsx_count fichiers .js/.jsx (à migrer)"
echo "Couverture TypeScript : $(echo "scale=0; $tsx_count * 100 / ($tsx_count + $jsx_count)" | bc)%"

# 5. Fichiers non trackés par git
git status --porcelain | grep "^??" | awk '{print $2}'
```

---

## SECTION C1 — RACINE DU PROJET

```bash
ls -la | grep -v "^total\|^\.$\|^\.\.$"
```

### Tableau C1 — Racine

| Fichier | Lignes | Rôle | Pattern 2026 | Anomalies |
|---------|--------|------|-------------|-----------|
| api.py | N | Routeur FastAPI principal | ✅/🆕/❌ | lifespan() ? |
| pyproject.toml | N | Config centralisée (ruff, pytest, mypy) | ✅/❌ | |
| requirements.txt | N | Dépendances Python | ✅ si uv.lock aussi | |
| uv.lock | N | Lockfile uv déterministe | ✅ si présent | |
| .env.example | N | Template variables d'env | ✅ | |
| .gitignore | N | Exclusions git | ✅/❌ | |
| Makefile | N | Commandes projet | ✅ | |
| docker-compose.yml | N | Services Docker | ✅/🆕 | BuildKit ? |
| README.md | N | Documentation projet | ✅ | |
| alembic.ini | N | Config Alembic | ✅ | env var URL ? |
| [AGENT: compléter] | | | | |

**Configs modernes attendues à la racine en 2026 :**

| Fichier | Présent ? | Remplace | Action si absent |
|---------|-----------|---------|-----------------|
| pyproject.toml | | pytest.ini + setup.cfg | Créer et consolider |
| ruff.toml ou [tool.ruff] | | .flake8 + black config | Créer |
| biome.json (dans docling-pwa/) | | .eslintrc + .prettierrc | Créer |
| .github/workflows/ci.yml | | — | Créer |

---

## SECTION C2 — BACKEND/

```bash
find backend/ -type f | grep -v __pycache__ | grep -v ".pyc" | sort
```

### Sous-section C2.1 — backend/core/

| Fichier | Lignes | Rôle | Pydantic v2 ? | Type hints ? | Ruff OK ? | Pattern 2026 |
|---------|--------|------|--------------|-------------|----------|-------------|
| config.py | N | Settings Pydantic v2 | ✅/❌ | ✅/❌ | | ✅/🆕/❌ |
| db_manager.py | N | Pool asyncpg + CRUD | — | ✅/❌ | | |
| orchestrator.py | N | Pipeline extraction | — | ✅/❌ | | |
| [AGENT: compléter] | | | | | | |

**Points de vérification FastAPI 2026 dans api.py :**

```python
# PATTERN LEGACY (❌) → à corriger :
@app.on_event("startup")
async def startup():
    ...

# PATTERN 2026 (✅) → lifespan context manager :
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await db.connect()
    yield
    # shutdown
    await db.disconnect()

app = FastAPI(lifespan=lifespan)
```

### Sous-section C2.2 — backend/services/

| Fichier | Lignes | Rôle | httpx ? | structlog ? | Type hints complets ? | Pattern 2026 |
|---------|--------|------|---------|-------------|----------------------|-------------|
| auth_service.py | N | JWT + Argon2id | — | | | |
| gemini_service.py | N | Extraction IA | OUI/NON | | | |
| watchdog_service.py | N | Surveillance dossier | — | | | |
| storage_service.py | N | Upload S3/Storj | — | | | |
| [AGENT: compléter] | | | | | | |

### Sous-section C2.3 — backend/schemas/

| Fichier | Lignes | Schémas | model_config ? | @model_validator ? | Exemples OpenAPI ? |
|---------|--------|---------|---------------|-------------------|-------------------|
| invoice.py | N | Product, BatchSave... | OUI/NON | OUI/NON | OUI/NON |
| [AGENT: compléter] | | | | | |

**Pydantic v2 — Patterns à vérifier :**
```python
# ❌ LEGACY Pydantic v1
class Product(BaseModel):
    class Config:
        orm_mode = True

# ✅ CURRENT Pydantic v2
class Product(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
```

### Sous-section C2.4 — backend/utils/

| Fichier | Lignes | Rôle | Tests unitaires ? | Pattern 2026 |
|---------|--------|------|------------------|-------------|
| serializers.py | N | asyncpg Record → dict | OUI/NON | |
| [AGENT: compléter] | | | | |

---

## SECTION C3 — MIGRATIONS/

```bash
ls migrations/versions/ | sort
```

| Fichier | Lignes | Description | has downgrade() | IF NOT EXISTS | Pattern 2026 |
|---------|--------|-------------|----------------|---------------|-------------|
| env.py | N | Config Alembic | — | — | asyncpg correct ? |
| [AGENT: toutes les versions] | | | | | |

---

## SECTION C4 — TESTS/

```bash
find tests/ -type f | sort
```

| Fichier | Lignes | Ce qui est testé | Nb tests | pytest-asyncio | Couverture estimée |
|---------|--------|-----------------|----------|---------------|-------------------|
| conftest.py | N | Fixtures + DB test | — | asyncio_mode? | — |
| test_api.py | N | Endpoints HTTP | N | OUI/NON | N% |
| test_services.py | N | Services métier | N | OUI/NON | N% |
| [AGENT: compléter] | | | | | |

**Pattern pytest 2026 attendu :**
```python
# pyproject.toml : asyncio_mode = "auto"
# conftest.py :
import pytest
from httpx import AsyncClient, ASGITransport
from api import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
# ❌ LEGACY : TestClient(app) — bloquant, ne teste pas les vrais async
```

---

## SECTION C5 — DOCLING-PWA/

```bash
find docling-pwa/src -type f | sort
find docling-pwa -maxdepth 1 -type f | sort
```

### Sous-section C5.1 — Pages

| Fichier | Extension | Lignes | Route | TanStack Router ? | Lazy ? | Pattern 2026 |
|---------|-----------|--------|-------|------------------|--------|-------------|
| App.tsx/.jsx | .tsx/.jsx | N | / toutes | OUI/NON | OUI/NON | ✅/🆕/❌ |
| ScanPage.tsx | | N | /scan | | | |
| ValidationPage.tsx | | N | /validation | | | |
| [AGENT: toutes les pages] | | | | | | |

**Détection des patterns React 19 :**
```tsx
// 🆕 UPGRADE vers React 19 : use() pour les Promises
import { use, Suspense } from 'react';

// Avant (React 18) :
const [data, setData] = useState(null);
useEffect(() => { fetchData().then(setData); }, []);

// Après (React 19) :
function Component({ dataPromise }) {
  const data = use(dataPromise); // Suspend automatiquement
  return <div>{data.name}</div>;
}

// 🆕 UPGRADE : Actions React 19 (remplace useMutation de React Query)
async function submitAction(formData: FormData) {
  'use server'; // ou côté client avec useTransition
  await saveData(formData);
}
```

### Sous-section C5.2 — Components

| Fichier | Extension | Lignes | Props typées ? | memo ? | Utilisé par | Pattern 2026 |
|---------|-----------|--------|--------------|--------|-------------|-------------|
| Navbar.tsx | .tsx | N | Interface TS ? | | App | ✅/🆕/❌ |
| [AGENT: tous les composants] | | | | | | |

### Sous-section C5.3 — Services

| Fichier | Extension | Lignes | TanStack Query ? | Type-safe ? | Pattern 2026 |
|---------|-----------|--------|-----------------|------------|-------------|
| apiClient.ts | .ts | N | OUI/NON | OUI/NON | ✅/🆕/❌ |
| offlineQueue.ts | .ts | N | — | OUI/NON | |
| [AGENT: compléter] | | | | | |

**TanStack Query v5 pattern (2026) :**
```typescript
// ❌ LEGACY : useEffect + useState pour la data
useEffect(() => {
  fetch('/api/catalogue').then(r => r.json()).then(setData);
}, []);

// ✅ CURRENT 2026 : TanStack Query v5
import { useQuery, useMutation } from '@tanstack/react-query';

function Catalogue() {
  const { data, isPending, error } = useQuery({
    queryKey: ['catalogue', userId],
    queryFn: () => apiClient.getCatalogue(),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Sous-section C5.4 — Store (Zustand)

| Fichier | Extension | Lignes | Zustand 5 ? | Slices ? | Immer ? | Persistance |
|---------|-----------|--------|------------|---------|---------|------------|
| useStore.ts | .ts | N | OUI/NON | OUI/NON | | OUI/NON |
| [AGENT: compléter] | | | | | | |

**Zustand 5 pattern (2026) :**
```typescript
// ❌ LEGACY Zustand 4 : immer middleware obligatoire pour les updates
// ✅ CURRENT Zustand 5 : updates immuables natifs simplifiés
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  products: Product[];
  addProduct: (p: Product) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      products: [],
      addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
    }),
    { name: 'docling-store' }
  )
);
```

### Sous-section C5.5 — Config & Constants

| Fichier | Extension | Rôle | Type-safe ? | Pattern 2026 |
|---------|-----------|------|------------|-------------|
| api.ts | .ts | URLs endpoints | OUI/NON | |
| features.ts | .ts | Feature flags | OUI/NON | |
| [AGENT: compléter] | | | | |

### Sous-section C5.6 — Hooks Custom

| Fichier | Extension | Hook | Input types | Output types | Testé ? |
|---------|-----------|------|-------------|-------------|---------|
| [AGENT: lister ou confirmer absence] | | | | | |

---

## SECTION C6 — CONFIGURATION ROOT FRONTEND

```bash
find docling-pwa -maxdepth 1 -type f | sort
```

| Fichier | Rôle | Pattern 2026 | Anomalies |
|---------|------|-------------|-----------|
| package.json | Dépendances + scripts | pnpm ? | |
| pnpm-lock.yaml | Lockfile déterministe | ✅ | |
| vite.config.ts | Build + PWA (en .ts!) | Vite 6? | |
| tailwind.config.ts | Tailwind v4 CSS-first | v4? | |
| tsconfig.json | TypeScript strict | strict: true? | |
| biome.json | Lint + Format unifié | ✅/❌ | |
| index.html | Entrée SPA | | |
| [AGENT: compléter] | | | |

**Tailwind v4 — Rupture de config (2026) :**
```css
/* ❌ LEGACY Tailwind v3 : tailwind.config.js avec theme.extend */

/* ✅ CURRENT Tailwind v4 : CSS-first dans le fichier CSS */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.7 0.15 200);
  --font-sans: "Inter", sans-serif;
  --radius-card: 12px;
}
```

---

## SECTION C7 — CI/CD & DÉPLOIEMENT

```bash
find .github/ -type f 2>/dev/null | sort
ls render.yaml vercel.json fly.toml railway.toml 2>/dev/null
```

| Fichier | Rôle | uv/pnpm cache ? | Trivy scan ? | Pattern 2026 |
|---------|------|----------------|-------------|-------------|
| .github/workflows/ci.yml | CI tests | OUI/NON | OUI/NON | |
| .github/workflows/deploy.yml | CD | OUI/NON | OUI/NON | |
| render.yaml | Config Render | — | — | |
| [AGENT: compléter] | | | | |

---

## SECTION C8 — FICHIERS SPÉCIAUX

```bash
ls -la | grep "^\."
find . -name ".cursor" -type d 2>/dev/null | grep -v ".git"
find . -name "*.cursor*" 2>/dev/null | grep -v ".git"
```

| Fichier | Rôle | Commité ? | Devrait l'être ? | Action |
|---------|------|-----------|-----------------|--------|
| .env.example | Template envs | Oui | Oui | |
| .env | Valeurs réelles | [VÉRIFIER] | NON | |
| biome.json | Lint+Format | Oui | Oui | |
| pyproject.toml | Config Python | Oui | Oui | |
| .cursor/ | Config Cursor IDE | [VÉRIFIER] | Non | Ajouter .gitignore |
| [AGENT: compléter] | | | | |

---

## MATRICE DE DÉPENDANCES

```
BACKEND (vérifier les imports circulaires) :
  api.py           → [imports]
  db_manager.py    → [imports]
  orchestrator.py  → [imports]

FRONTEND (vérifier les barrel exports problématiques) :
  App.tsx          → [imports]
  ScanPage.tsx     → [imports]
  apiClient.ts     → [imports]

DÉPENDANCES CIRCULAIRES BACKEND :
  [AGENT: python -c "import ast; ..." ou utiliser pydeps]

DÉPENDANCES CIRCULAIRES FRONTEND :
  [AGENT: pnpm biome check --rule-domains="correctness" src/]

MODULES HUB CRITIQUES (les plus importés) :
  1. [module] → importé par N fichiers
  2. [module] → importé par N fichiers
```

---

## STATISTIQUES FINALES 2026

```
BACKEND :
  Python version       : X.X
  Fichiers .py         : N
  Lignes totales       : N
  Couverture types     : N% (fonctions avec type hints)
  Pydantic v2          : OUI/NON
  FastAPI lifespan()   : OUI/NON
  Ruff configuré       : OUI/NON

FRONTEND :
  Node version         : X.X
  Fichiers .ts/.tsx    : N
  Fichiers .js/.jsx    : N (legacy, à migrer)
  Couverture TS        : N%
  React 19             : OUI/NON
  TanStack Query v5    : OUI/NON
  Tailwind v4          : OUI/NON
  Biome                : OUI/NON

GLOBAL :
  Fichiers source total : N
  Lignes source total   : N
  Ratio test/code       : N% (objectif > 80%)
  CVE connues backend   : N (pip-audit)
  CVE connues frontend  : N (pnpm audit)
  Score stack 2026      : N/10 patterns modernes utilisés
```

---

## ✅ GATE C — CARTOGRAPHIE 2026

```
PASS si :
  → 100% des fichiers source dans les tableaux
  → Ratio TypeScript calculé
  → Patterns 2026 identifiés (✅/🆕/❌)
  → Statistiques remplies
  → Dépendances circulaires vérifiées

STATUS : [ ] PASS  [ ] FAIL
→ Si PASS : continuer vers 03_BACKEND.md
```