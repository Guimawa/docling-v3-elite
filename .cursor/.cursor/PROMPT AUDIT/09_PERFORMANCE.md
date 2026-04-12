# ⚡ 09 — AUDIT PERFORMANCE
# Backend · Database · Frontend · Bundle · Service Worker · Monitoring
# Mesure avant tout — Chaque goulot chiffré — Corrections priorisées

---

## PRINCIPE

```
La performance ne se suppose pas. Elle se mesure.

MÉTHODE :
  1. Mesurer l'état AVANT (baseline)
  2. Identifier le goulot (profiling, logs, EXPLAIN)
  3. Corriger avec la solution la moins invasive
  4. Mesurer l'état APRÈS (vérifier l'amélioration)
  5. Documenter le gain

SEUILS "PRÊT PROD" :
  Backend  → P50 < 200ms, P99 < 1000ms pour les endpoints CRUD
  Frontend → FCP < 1.5s, LCP < 2.5s (3G simulé), TTI < 3s
  Bundle   → JS initial < 150KB gzip (sans chunks lazy)
  DB       → Aucune query > 100ms sur le happy path
```

---

## P1 — BASELINE BACKEND

```bash
echo "=== BASELINE BACKEND ==="

# 1. Import check et démarrage
time python -c "import api; print('import OK')"
# → Doit être < 3s (si > 3s : imports lourds au niveau module)

# 2. Health check latence
curl -s -o /dev/null -w "Health check: %{time_total}s\n" \
  http://localhost:8000/health
# → Doit être < 50ms (pas de DB call dans /health si possible)

# 3. Identifier les endpoints les plus lents via les logs
# (Si logging structuré avec durée des requêtes)
grep -i "duration\|elapsed\|time_ms\|took" logs/app.log 2>/dev/null | \
  sort -t: -k2 -rn | head -20
# Ou depuis Sentry Performance si configuré

# 4. Compter les routes
python -c "
from api import app
routes = [r for r in app.routes if hasattr(r, 'methods')]
print(f'Nombre d\'endpoints : {len(routes)}')
for r in sorted(routes, key=lambda x: x.path):
    methods = ', '.join(r.methods or [])
    print(f'  {methods:20} {r.path}')
"
```

---

## P2 — ANALYSE N+1 QUERIES

```
Le N+1 est le problème de performance le plus fréquent et le plus dévastateur.
1 requête pour la liste + N requêtes pour les détails = catastrophe à l'échelle.

DÉFINITION :
  N+1 = faire N requêtes SQL dans une boucle Python/JS.
  Avec 100 produits → 101 requêtes au lieu de 1.
  Avec 1000 produits → 1001 requêtes. Le serveur s'effondre.

DÉTECTION :
```

```bash
# Pattern 1 : for + await dans le même bloc
grep -rn "for.*in.*:\s*$" backend/ --include="*.py" -A 3 | \
  grep -B 2 "await\|conn\.\|pool\."

# Pattern 2 : fetch dans une boucle
grep -rn "for.*:\s*\n.*fetch\|for.*:\s*\n.*execute" backend/ --include="*.py"

# Pattern 3 : fonctions qui retournent des objets non joins
grep -rn "def get_\|async def get_" backend/ --include="*.py" -A 10 | \
  grep -B 5 "for.*in.*result"
```

### Grille N+1 par endpoint

| Endpoint | Requêtes SQL estimées | N+1 détecté | Impact (N produits) | Fix proposé |
|----------|----------------------|-------------|--------------------|----|
| GET /catalogue | ? | | ? requêtes | Joindre en une requête |
| GET /jobs/{id} | ? | | ? requêtes | — |
| POST /process (save batch) | ? | | N requêtes | INSERT batch |
| GET /export | ? | | ? requêtes | SELECT avec JOIN |
| [AGENT: tous les endpoints] | | | | |

### Exemples de corrections N+1

```python
# ❌ AVANT — N+1 (catastrophe si 500 produits)
products = await conn.fetch("SELECT * FROM products WHERE user_id = $1", user_id)
for product in products:
    supplier = await conn.fetchrow(  # 1 requête par produit !
        "SELECT * FROM suppliers WHERE name = $1", product["fournisseur"]
    )

# ✅ APRÈS — 1 seule requête avec JOIN
products = await conn.fetch("""
    SELECT p.*, s.contact_email
    FROM products p
    LEFT JOIN suppliers s ON s.name = p.fournisseur
    WHERE p.user_id = $1
""", user_id)

# ─────────────────────────────────────────────────────────────────────────────

# ❌ AVANT — INSERT en boucle (N requêtes pour N produits)
for product in products_list:
    await conn.execute(
        "INSERT INTO products (user_id, designation_fr, prix_ht) VALUES ($1, $2, $3)",
        user_id, product.designation_fr, product.prix_ht
    )

# ✅ APRÈS — INSERT batch (1 seule requête)
await conn.executemany(
    "INSERT INTO products (user_id, designation_fr, prix_ht) VALUES ($1, $2, $3)",
    [(user_id, p.designation_fr, p.prix_ht) for p in products_list]
)
# Ou encore plus performant avec copy_records_to_table :
await conn.copy_records_to_table(
    'products',
    records=[(user_id, p.designation_fr, p.prix_ht) for p in products_list],
    columns=['user_id', 'designation_fr', 'prix_ht']
)
```

---

## P3 — ANALYSE DES INDEX DB

```bash
# Extraire TOUTES les requêtes SQL du backend
grep -rn '"""' backend/ --include="*.py" -A 20 | \
  grep -E "SELECT|WHERE|ORDER BY|JOIN|ILIKE" | head -40

# Identifier les WHERE sans index potentiel
grep -rn "WHERE.*AND\|WHERE.*ILIKE\|WHERE.*IN\|ORDER BY" \
  backend/ --include="*.py" | grep -v "user_id\|id\s*=" | head -20
```

### Simulation EXPLAIN ANALYZE par requête critique

```sql
-- Pour chaque requête fréquente, simuler le plan d'exécution :

-- REQUÊTE 1 : Récupération du catalogue
-- SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50

-- Plan attendu avec index :
-- Index Scan using idx_products_user_id on products
--   Index Cond: (user_id = 1)  cost=0.29..8.31 rows=50 width=256

-- Plan sans index (table scan = catastrophe à grande échelle) :
-- Seq Scan on products  cost=0.00..1250.00 rows=50 width=256
--   Filter: (user_id = 1)

-- REQUÊTE 2 : Recherche ILIKE
-- SELECT * FROM products WHERE user_id=$1 AND designation_fr ILIKE '%ciment%'

-- Sans GIN index → Seq Scan garanti :
-- Seq Scan on products  cost=0.00..5000.00 rows=10 width=256
--   Filter: (designation_fr ILIKE '%ciment%')

-- Avec GIN index (pg_trgm) → Index Scan :
-- Bitmap Heap Scan on products  cost=12.00..50.00 rows=10 width=256
--   Recheck Cond: (designation_fr ILIKE '%ciment%')
```

### Tableau index manquants → migrations à créer

| Table | Colonne(s) | Requête concernée | Coût sans index | Migration à créer |
|-------|-----------|------------------|-----------------|-----------------|
| products | user_id | GET /catalogue | Seq Scan | CREATE INDEX CONCURRENTLY |
| products | designation_fr (GIN) | Recherche ILIKE | Seq Scan garanti | CREATE INDEX GIN pg_trgm |
| products | (user_id, famille) | Filtre famille | | Composite index |
| jobs | user_id | GET /jobs | | CREATE INDEX |
| jobs | status | Filtre par status | | |
| jobs | created_at | ORDER BY date | | |
| [AGENT: identifier tous les index manquants] | | | | |

### Migration index manquants

```python
# FICHIER COMPLET : migrations/versions/XXXX_add_performance_indexes.py

"""Add performance indexes for catalogue queries

Revision ID: perf_indexes_001
Revises: [previous_revision]
Create Date: 2025-XX-XX
"""
from alembic import op

def upgrade():
    # Index sur user_id pour l'isolation multi-tenant (critique)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_id
        ON products (user_id);
    """)

    # Index sur jobs.user_id
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_user_id
        ON jobs (user_id);
    """)

    # Index GIN pour la recherche fulltext (pg_trgm)
    # Nécessite l'extension pg_trgm
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_designation_trgm
        ON products USING gin (designation_fr gin_trgm_ops);
    """)

    # Index composite pour les filtres fréquents
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_famille
        ON products (user_id, famille);
    """)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_fournisseur
        ON products (user_id, fournisseur);
    """)

    # Index sur jobs.status et created_at pour les filtres
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status_created
        ON jobs (user_id, status, created_at DESC);
    """)

def downgrade():
    op.execute("DROP INDEX IF EXISTS idx_products_user_id;")
    op.execute("DROP INDEX IF EXISTS idx_jobs_user_id;")
    op.execute("DROP INDEX IF EXISTS idx_products_designation_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_products_user_famille;")
    op.execute("DROP INDEX IF EXISTS idx_products_user_fournisseur;")
    op.execute("DROP INDEX IF EXISTS idx_jobs_status_created;")
```

---

## P4 — ANALYSE PAGINATION

```bash
# Endpoints qui retournent des listes sans LIMIT
grep -rn "SELECT.*FROM.*products\|SELECT.*FROM.*jobs" \
  backend/ --include="*.py" | grep -v "LIMIT\|COUNT"
```

```
RÈGLE ABSOLUE :
  Toute requête sur une table qui peut grandir doit avoir un LIMIT.
  Sans LIMIT → un catalogue de 100 000 produits = timeout + OOM.

PAGINATION CURSOR vs OFFSET :
  OFFSET = lent sur les grandes pages (PostgreSQL doit scanner N lignes)
  CURSOR (WHERE id > last_id) = performant même sur 1M de lignes

OBJECTIF :
  □ GET /catalogue : LIMIT configuré (50 par défaut, max 200) ?
  □ GET /jobs : paginé ?
  □ GET /historique : paginé ?
  □ GET /export : streaming ou limite documentée ?
```

### Exemple pagination cursor correcte

```python
# ✅ Pagination cursor-based (performante)
async def get_catalogue(
    user_id: int,
    limit: int = 50,
    cursor: Optional[int] = None,
    search: Optional[str] = None,
) -> dict:
    """
    Retourne les produits avec pagination cursor.
    cursor = id du dernier élément de la page précédente.
    """
    if limit > 200:
        limit = 200  # Limite maximale — protection DoS

    conditions = ["user_id = $1"]
    params = [user_id]
    param_n = 2

    if cursor:
        conditions.append(f"id < ${param_n}")
        params.append(cursor)
        param_n += 1

    if search:
        # pg_trgm index utilisé ici
        conditions.append(f"designation_fr ILIKE ${param_n}")
        params.append(f"%{search}%")
        param_n += 1

    where = " AND ".join(conditions)

    rows = await conn.fetch(f"""
        SELECT id, designation_fr, famille, fournisseur, prix_ht, quantite, created_at
        FROM products
        WHERE {where}
        ORDER BY id DESC
        LIMIT ${param_n}
    """, *params, limit)

    return {
        "items": [dict(r) for r in rows],
        "next_cursor": rows[-1]["id"] if len(rows) == limit else None,
        "has_more": len(rows) == limit,
    }
```

---

## P5 — ANALYSE POOL ASYNCPG

```bash
grep -rn "create_pool\|asyncpg.create_pool\|min_size\|max_size" \
  backend/ --include="*.py"
```

```
CONFIGURATION RECOMMANDÉE PAR ENVIRONNEMENT :

DÉVELOPPEMENT local :
  min_size=2, max_size=5, command_timeout=30

PRODUCTION (Neon ou Render) :
  min_size=2, max_size=10, command_timeout=60
  ATTENTION : Neon limite les connexions simultanées en free tier !
  → Utiliser pgBouncer ou Neon connection pooler

PROBLÈMES FRÉQUENTS :
  □ Pool trop grand → Neon refuse des connexions (max 20 free tier)
  □ Pool trop petit → requêtes en attente, timeouts
  □ command_timeout absent → requête bloquée à l'infini
  □ Pool jamais libéré si exception avant `async with` → leak
```

### Vérification configuration pool

```python
# LIRE le code actuel et vérifier :
# [AGENT: afficher le code de create_pool dans db_manager.py]

# Configuration recommandée :
pool = await asyncpg.create_pool(
    settings.database_url,
    min_size=2,
    max_size=10,
    command_timeout=60,          # Timeout par requête (secondes)
    max_inactive_connection_lifetime=300,  # Ferme les connexions inactives
    setup=setup_connection,      # Fonction de config par connexion (json, codec)
)

# Vérifier que chaque usage libère la connexion :
async with pool.acquire() as conn:  # ← Context manager = libération garantie
    result = await conn.fetch(...)
# ← ici la connexion est libérée même si exception
```

---

## P6 — ANALYSE TIMEOUTS SERVICES EXTERNES

```bash
grep -rn "timeout\|Timeout\|TIMEOUT" backend/ --include="*.py" | \
  grep -v "test\|#" | head -20
```

```
SERVICES EXTERNES ET TIMEOUTS RECOMMANDÉS :

  Gemini API      → timeout=30s (extraction IA peut être lente)
                    retry=3 avec backoff exponentiel sur 429/503
  Upload S3/Storj → timeout=60s (selon taille fichier)
  DB asyncpg      → command_timeout=30s (protège contre les queries lentes)
  HTTP externe    → timeout=(connect=5, read=30) via httpx

  UN SERVICE SANS TIMEOUT = un service qui peut bloquer une coroutine
  indéfiniment → fuite de ressources → le serveur s'effondre.
```

### Vérification timeouts dans gemini_service.py

```python
# [AGENT: lire gemini_service.py et vérifier]

# ✅ Pattern correct avec timeout + retry + backoff :
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((Exception,)),  # Affiner selon les exceptions Gemini
    reraise=True,
)
async def extract_with_retry(self, image_data: bytes) -> dict:
    try:
        response = await asyncio.wait_for(
            self._call_gemini_api(image_data),
            timeout=30.0  # 30 secondes max par appel
        )
        return response
    except asyncio.TimeoutError:
        raise Exception("Gemini API timeout après 30s")
```

---

## P7 — ANALYSE BUNDLE FRONTEND

```bash
cd docling-pwa
npm run build 2>&1 | grep -E "dist/assets|\.js|\.css|KB|MB" | head -30

echo ""
echo "=== TAILLE DES CHUNKS ==="
ls -la dist/assets/*.js 2>/dev/null | \
  awk '{printf "%-60s %s KB\n", $9, int($5/1024)}' | sort -k2 -rn

echo ""
echo "=== TAILLE GZIP SIMULÉE ==="
for f in dist/assets/*.js; do
  orig=$(wc -c < "$f")
  gzip_size=$(gzip -c "$f" | wc -c)
  echo "$(basename $f): ${orig}B → ${gzip_size}B gzip ($(echo "scale=0; $gzip_size*100/$orig" | bc)%)"
done | sort -t: -k2 -rn
```

### Tableau chunks et objectifs

| Chunk | Taille non-gzip | Taille gzip | OK (< 200KB gz) | Problème | Action |
|-------|----------------|------------|-----------------|---------|--------|
| index.js (main) | KB | KB | | | |
| vendor-react | KB | KB | | | |
| vendor-pdf (jspdf) | KB | KB | | | |
| [AGENT: tous les chunks] | | | | | |

### Optimisations bundle recommandées

```javascript
// vite.config.js — optimisation manualChunks

build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        // Vendor React : cache stable (change rarement)
        if (id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')) {
          return 'vendor-react'
        }

        // PDF : lourd mais utilisé seulement sur DevisPage
        if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
          return 'vendor-pdf'  // Chunk séparé, lazy-loadé avec DevisPage
        }

        // Charts : utilisé seulement sur CataloguePage
        if (id.includes('recharts') || id.includes('d3')) {
          return 'vendor-charts'
        }

        // Zustand + utilitaires : petit, peut aller dans vendor-react
        if (id.includes('zustand') || id.includes('axios')) {
          return 'vendor-state'
        }
      }
    }
  }
}

// Lazy loading des pages lourdes :
// Dans App.jsx
const DevisPage = React.lazy(() => import('./pages/DevisPage'))
// → jspdf n'est téléchargé que si l'utilisateur navigue vers /devis
```

---

## P8 — ANALYSE LAZY LOADING REACT

```bash
grep -rn "React.lazy\|import('" docling-pwa/src/ --include="*.jsx" --include="*.js" | \
  grep -v "node_modules" | grep -v "test"
```

```
PAGES QUI DOIVENT ÊTRE EN LAZY LOADING :

Page              Poids estimé   Raison
─────────────────────────────────────────────────────
DevisPage         Lourd (jspdf)  Pas utilisée au premier chargement
CataloguePage     Moyen          Pas la page d'entrée
ValidationPage    Moyen          Utilisée après scan
HistoryPage       Léger          Rarement visitée
SettingsPage      Léger          Rarement visitée

PAGES QUI NE DOIVENT PAS ÊTRE EN LAZY :
  ScanPage    → Page d'entrée, doit charger immédiatement
  LoginPage   → Page d'entrée si non auth
  RegisterPage → Rare mais critique
```

### Vérification lazy loading

```javascript
// [AGENT: vérifier App.jsx — les imports suivants doivent être lazy :]

// ✅ Correct
const DevisPage = React.lazy(() => import('./pages/DevisPage'))
const CataloguePage = React.lazy(() => import('./pages/CataloguePage'))

// ❌ Incorrect (pas lazy → inclus dans le bundle initial)
import DevisPage from './pages/DevisPage'

// Suspense avec skeleton (pas juste null ou spinner vide)
<Suspense fallback={<PageSkeleton />}>
  <DevisPage />
</Suspense>
```

---

## P9 — ANALYSE RE-RENDERS

```bash
# Détecter les useMemo/useCallback manquants fréquents
grep -rn "map\|filter\|sort\|reduce" docling-pwa/src/pages/ --include="*.jsx" | \
  grep -v "//\|test\|import" | head -20
# → Les opérations map/filter/sort dans le render → candidats useMemo
```

```
RÈGLES DES RE-RENDERS :

1. PAS de création d'objet ou fonction inline dans le JSX rendu :
   ❌ <Component handler={() => doSomething(id)} />  → crée une nouvelle fn à chaque render
   ✅ handler = useCallback(() => doSomething(id), [id])

2. PAS de map/filter/sort en inline dans le render sans useMemo :
   ❌ {products.filter(p => p.famille === selected).sort(...).map(...)}
   ✅ const filteredProducts = useMemo(() =>
        products.filter(p => p.famille === selected).sort(...),
        [products, selected])

3. MAIS ne pas over-memoïser :
   → useMemo sur une opération simple (.length, ternaire) = overhead > gain
   → useMemo justifié : tri/filtre sur > 50 éléments, objets composés complexes

4. Context qui change trop souvent :
   → Un Context.Provider qui re-render force TOUS ses consumers à re-render
   → Séparer les contextes (AuthContext séparé de ThemeContext)
   → Ou utiliser useMemo pour la valeur du context
```

### Grille re-renders par composant

| Composant | Causes de re-render identifiées | useMemo justifié | useCallback justifié | Problème |
|-----------|--------------------------------|-----------------|---------------------|---------|
| CataloguePage | filter + sort sur la liste | OUI | OUI (handlers ligne) | |
| ValidationPage | | | | |
| ScanPage | | | | |
| [AGENT: analyser chaque page] | | | | |

---

## P10 — ANALYSE VIRTUALISATION LISTES

```bash
grep -rn "react-virtual\|react-window\|@tanstack/virtual" \
  docling-pwa/src/ docling-pwa/package.json | grep -v node_modules
```

```
RÈGLE DE VIRTUALISATION :
  Une liste > 100 éléments rendue sans virtualisation = DOM lourd.
  CataloguePage avec 1000 produits = 1000 nœuds DOM simultanément
  = laggy scroll, TTI dégradé, mémoire saturée.

SOLUTION :
  @tanstack/react-virtual (ou react-window pour les listes simples)

VÉRIFIER :
  □ CataloguePage : virtualisation sur la liste produits ?
  □ ValidationPage : virtualisation sur la liste extraction ?
  □ HistoryPage : virtualisation si > 50 items ?
```

### Implémentation virtualisation recommandée

```jsx
// CataloguePage — exemple avec @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

function ProductList({ products }) {
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,  // Hauteur estimée d'une ligne en pixels
    overscan: 5,             // Pré-rendre 5 éléments hors viewport
  })

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}  // Container height fixe obligatoire
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const product = products[virtualItem.index]
          return (
            <div
              key={product.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ProductRow product={product} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## P11 — ANALYSE SERVICE WORKER & CACHE

```bash
# Vérifier la configuration workbox dans vite.config.js
grep -A 30 "workbox\|runtimeCaching\|VitePWA" docling-pwa/vite.config.js
```

### Stratégies de cache recommandées

```javascript
// Configuration workbox correcte dans vite.config.js

VitePWA({
  workbox: {
    // Assets hashés → CacheFirst (immutable)
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

    runtimeCaching: [
      // API calls → NetworkFirst (données fraîches prioritaires)
      {
        urlPattern: /\/api\/v1\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 300,  // Cache 5 minutes max
          },
        },
      },
      // Images uploadées → StaleWhileRevalidate
      {
        urlPattern: /\.(png|jpg|jpeg|webp)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60,  // 7 jours
          },
        },
      },
      // Fonts Google/CDN → CacheFirst (ne changent jamais)
      {
        urlPattern: /fonts\.(googleapis|gstatic)\.com/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'font-cache',
          expiration: {
            maxAgeSeconds: 365 * 24 * 60 * 60,  // 1 an
          },
        },
      },
    ],
  }
})
```

---

## P12 — WEB VITALS — MESURE

```bash
# Build + mesure avec Lighthouse (si disponible)
cd docling-pwa
npm run build && npm run preview &
sleep 3

# Lighthouse CLI
npx lighthouse http://localhost:4173 \
  --only-categories=performance \
  --output=json \
  --output-path=/tmp/lighthouse.json \
  --chrome-flags="--headless" 2>/dev/null

python3 -c "
import json
with open('/tmp/lighthouse.json') as f:
    data = json.load(f)
cats = data.get('categories', {})
audits = data.get('audits', {})
print('=== WEB VITALS ===')
for key in ['first-contentful-paint', 'largest-contentful-paint',
            'total-blocking-time', 'cumulative-layout-shift', 'interactive']:
    audit = audits.get(key, {})
    score = audit.get('score', 0)
    value = audit.get('displayValue', 'N/A')
    status = '✅' if score >= 0.9 else ('⚠️' if score >= 0.5 else '❌')
    print(f'  {status} {key}: {value} (score: {score:.0%})')
print()
perf_score = cats.get('performance', {}).get('score', 0)
print(f'Score global performance : {perf_score:.0%}')
" 2>/dev/null || echo "Lighthouse non disponible — mesurer manuellement via DevTools"
```

### Tableau Web Vitals — objectifs

| Métrique | Valeur actuelle | Objectif (Good) | Statut | Action si KO |
|---------|----------------|-----------------|--------|-------------|
| FCP (First Contentful Paint) | | < 1.8s | | |
| LCP (Largest Contentful Paint) | | < 2.5s | | |
| CLS (Cumulative Layout Shift) | | < 0.1 | | |
| TBT (Total Blocking Time) | | < 200ms | | |
| TTI (Time to Interactive) | | < 3.8s | | |
| **Performance Score** | | **> 80** | | |

---

## P13 — ANALYSE PERFORMANCE GEMINI & IA

```
□ Temps moyen d'extraction Gemini (logs) :
  grep -rn "gemini.*duration\|extraction.*time\|took.*gemini" logs/ 2>/dev/null

□ Le modèle configuré est-il le bon ? (vitesse vs précision)
  → gemini-1.5-flash : rapide (~3s), moins précis
  → gemini-1.5-pro : lent (~10-15s), plus précis
  → Le choix dépend du cas d'usage (batch = flash, factures complexes = pro)

□ Les images sont-elles redimensionnées avant envoi à Gemini ?
  → Envoyer une image 4K à Gemini coûte plus de tokens et prend plus de temps
  → Redimensionner à max 1024x1024 avant envoi

□ Les PDF sont-ils convertis page par page ou en entier ?
  → PDF multi-pages → traiter seulement les pages pertinentes (1ère et dernière)

□ Cache des résultats :
  → Même fichier soumis deux fois → recalculer ou utiliser le cache ?
  → Hash du fichier (MD5/SHA256) comme clé de cache ?
```

---

## SCORECARD PERFORMANCE

| Domaine | Score /100 | Problèmes 🟠 | Problèmes 🟡 | Valeur mesurée | Objectif |
|---------|-----------|-------------|-------------|---------------|---------|
| N+1 queries | /100 | | | N queries/req | 1-3 queries/req |
| Index DB | /100 | | | N manquants | 0 manquant |
| Pagination | /100 | | | Tous paginés ? | LIMIT sur tout |
| Pool asyncpg | /100 | | | min/max size | 2/10 |
| Timeouts services | /100 | | | Définis ? | Tous définis |
| Bundle JS initial | /100 | | | N KB gzip | < 150 KB |
| Lazy loading pages | /100 | | | N pages lazy | Toutes sauf main |
| Re-renders | /100 | | | N inutiles | 0 inutile |
| Virtualisation | /100 | | | Implémentée ? | Sur listes > 100 |
| Web Vitals (LCP) | /100 | | | N ms | < 2500ms |
| Cache SW | /100 | | | Config OK ? | Stratégies correctes |
| **GLOBAL** | **/100** | | | | |

---

## LISTE DES PROBLÈMES PERFORMANCE

```
[P-001] 🟠 CRITIQUE
  Domaine  : [N+1 / Bundle / Re-render / Index / etc.]
  Fichier  : [fichier]:[ligne]
  Mesure   : [avant : X ms / X KB / X requêtes]
  Impact   : [ce qui se passe en production avec N utilisateurs]
  Fix      : [code correct complet]
  Gain estimé : [après : Y ms / Y KB / Y requêtes]

[P-XXX] 🟡 MAJEUR
  ...
```

---

## ✅ GATE P — PERFORMANCE

```bash
echo "=== GATE PERFORMANCE ==="

cd docling-pwa

# 1. Bundle size (chunk principal)
echo "--- Bundle size ---"
npm run build 2>/dev/null
main_chunk=$(ls -la dist/assets/index*.js 2>/dev/null | awk '{print $5}' | sort -rn | head -1)
main_gzip=$(ls dist/assets/index*.js 2>/dev/null | head -1 | xargs gzip -c | wc -c)
echo "Chunk principal : ${main_chunk} bytes non-gzip"
echo "Chunk principal : ${main_gzip} bytes gzip"
[ "${main_gzip:-999999}" -lt 204800 ] && echo "✅ Bundle < 200KB gzip" || echo "⚠️ Bundle > 200KB gzip"

# 2. N+1 queries détectées
cd ..
n_plus_one=$(grep -rn "for.*in.*:\s*$" backend/ --include="*.py" -A 3 | \
  grep "await\|conn\.\|pool\." | wc -l)
echo "--- N+1 potentiels : $n_plus_one ---"
[ "$n_plus_one" -eq 0 ] && echo "✅ Aucun N+1 détecté" || echo "⚠️ ${n_plus_one} N+1 potentiels à vérifier"

# 3. Requêtes sans LIMIT
no_limit=$(grep -rn "SELECT.*FROM.*products\|SELECT.*FROM.*jobs" \
  backend/ --include="*.py" | grep -v "LIMIT\|COUNT\|#" | wc -l)
echo "--- Requêtes sans LIMIT : $no_limit ---"
[ "$no_limit" -eq 0 ] && echo "✅ Toutes les listes sont paginées" || echo "❌ ${no_limit} requêtes sans LIMIT"

# 4. Lazy loading des pages principales
lazy_count=$(grep -rn "React.lazy\|import('" docling-pwa/src/App.jsx 2>/dev/null | wc -l)
echo "--- Lazy loaded pages : $lazy_count ---"
[ "$lazy_count" -ge 3 ] && echo "✅ Lazy loading en place" || echo "⚠️ Peu de pages lazy-loadées"

# 5. Timeout Gemini défini
gemini_timeout=$(grep -rn "timeout\|wait_for\|asyncio.wait" \
  backend/services/gemini_service.py 2>/dev/null | wc -l)
echo "--- Timeout Gemini défini : $gemini_timeout références ---"
[ "$gemini_timeout" -gt 0 ] && echo "✅ Timeout défini" || echo "❌ Pas de timeout sur Gemini"

echo ""
echo "PASS si :"
echo "  ✓ Bundle < 200KB gzip"
echo "  ✓ 0 N+1 queries confirmé"
echo "  ✓ Toutes listes paginées (LIMIT)"
echo "  ✓ Pages lourdes en lazy loading"
echo "  ✓ Timeout défini sur tous les services externes"

STATUS : [ ] PASS  [ ] FAIL
```