# Audit intégral — Référence détaillée

Checklists complètes pour chaque phase. Utiliser quand le prompt principal nécessite plus de précision.

---

## Phase 0 — Inventaire exhaustif (AUCUNE exclusion)

**Périmètre** : TOUS les fichiers du projet. Aucune exclusion.
- Sources : api.py, backend/, docling-pwa/src/
- Config : package.json, vite.config, .env.example
- Dépendances : node_modules/, .venv/, __pycache__/
- Build : dist/, .vite/
- Docs, CI, Cursor : docs/, .github/, .cursor/, .agents/

**Pour chaque fichier** : C'est quoi ? À quoi ça sert ?

**Format inventaire** :
```
# | Chemin | Lignes | C'est quoi ? | À quoi ça sert ?
001 | api.py | 532 | Fichier Python | Routeur FastAPI principal
002 | docling-pwa/node_modules/react/package.json | 50 | package.json | Déclaration package React
...
```

**⛔ NE JAMAIS** : Se référer à AUDIT_RESULTS.md, docs/AUDIT-*.md, ou tout rapport d'audit existant. Analyse fraîche uniquement.

**⛔ NE JAMAIS INVENTER** : Uniquement faits vérifiés dans le code. Références Stripe, Vercel, Linear, Notion : uniquement pour des pratiques documentées et connues.

---

## Note globale par fichier source (0-10)

| Critère | Poids | Exemple |
|---------|-------|---------|
| Lisibilité | 2 | Nommage, commentaires utiles |
| Maintenabilité | 2 | DRY, SOLID, pas de duplication |
| Robustesse | 2 | Gestion erreurs, pas de bare except |
| Conformité | 2 | backend-conventions, frontend-conventions |
| Tests | 2 | Couverts, fixtures correctes |

**Qualité code à relever** : erreurs, code mort, imports inutilisés, fonctions jamais appelées, duplications, magic strings, profondeur d'imbrication >4.

---

## Audit par point (ultra-détaillé)

### ENV (variables d'environnement)
- Liste exhaustive (backend, frontend)
- Validation au démarrage ?
- Manquantes en prod ?
- Secrets dans le code ?
- Référentiel : .cursor/rules/security-guidelines

### DEP (dépendances)
- requirements.txt : chaque ligne — utilisée ? version ? CVE ?
- package.json : dependencies vs devDependencies — npm audit

### FICHIER (chaque fichier source)
- Note /10
- C'est quoi ? À quoi ça sert ?
- Erreurs, code mort, problèmes
- Référentiel : .cursor/rules/backend-conventions, frontend-conventions

### CODE
- Erreurs : fichier, ligne, type, correction exacte
- Code mort : fichier, ligne, action (supprimer/documenter)
- Duplications : extraire, centraliser

### ERREUR
- Liste exhaustive | Fichier | Ligne | Erreur | Impact | Correction |

### PROBLÈME
- Liste | Sévérité | Fichier | Description | Impact |

### AMÉLIORATION
- Suggestions expert | Fichier | Référence (Stripe/Vercel/Linear/Notion) | Action |

---

## Phase 1.5 — Docker & CI

- Dockerfile : multi-stage ? user non-root ? .dockerignore ?
- docker-compose : services, volumes, env, healthcheck ?
- GitHub Actions : lint, test, build, déploiement ?

---

## Phase 2.1 — api.py (par endpoint)

- Route, méthode HTTP, auth requise ?
- Validation inputs (Pydantic, Form, Query)
- Séparation logique métier / route
- Gestion erreurs (HTTPException, code correct)
- Logging (suffisant ? verbeux ?)
- Sécurité : injection, overflow, IDOR
- Docstring ?

**Questions obligatoires** :
- □ Non-auth peut accéder ?
- □ Inputs validés taille + type ?
- □ Erreur 500 masquée ?
- □ Réponse contient données sensibles inutiles ?

**Upload (si applicable)** : MIME autorisés ? Taille max ? Extensions bloquées (.exe, .bat) ?

---

## Phase 2.2 — db_manager.py

- Pool connexions configuré ?
- Transactions atomiques (commit/rollback) ?
- SQL dynamique → injection ?
- N+1 queries ?
- Index sur WHERE ?
- Erreurs DB (connection lost, timeout) ?
- Méthodes inutilisées ?

---

## Phase 2.3 — services/

Par service (gemini, watchdog, facturx...) :
- Responsabilité unique ?
- Circuit breaker ?
- Timeout ?
- Retry logic ?
- Logs production ?
- Tests unitaires ?

---

## Phase 4.2 — Gestion erreurs E2E

| Code | Comportement attendu |
|------|----------------------|
| 401 | Redirection login |
| 403 | Message "accès refusé" |
| 422 | Erreurs validation affichées |
| 429 | Rate limit affiché |
| 500 | Message générique (pas stack trace) |
| Timeout | Retry ou message clair |

---

## Phase 4.3 — Flux détaillés

**FLUX 1** : Inscription → Login → Premier scan
- Backend : register, login, process
- Frontend : RegisterPage → LoginPage → ScanPage
- DB : users, jobs
- Vérifier : token, refresh, expiration

**FLUX 2** : Scan → Extraction → Validation → Catalogue
- Upload → Job → Polling → Extraction
- Validation → Batch save → Catalogue
- Vérifier : source, fournisseur

**FLUX 3** : Catalogue → Devis → PDF
- Filtres → Devis → TVA → PDF logo

**FLUX 4** : Offline → Sync
- Queue IndexedDB → Reconnexion → Upload
- Vérifier : pas doublon, status

---

## Phase 6.4 — Tests manquants critiques

**Backend** : register+login, upload 413, auth 401, isolation user_id, validation Pydantic

**Frontend** : ScanPage (upload, states), CataloguePage (filtres, tri), ValidationPage (édition), DevisPage (total, TVA, PDF)

---

## Phase 6.6 — Critères tests

- Tester comportement, pas implémentation
- Happy path + cas d'erreur
- Indépendants
- Données explicites (pas magie)

---

## Sécurité (OWASP Top 10)

- A01 Broken Access Control : isolation user_id, IDOR
- A02 Cryptographic Failures : JWT secret, argon2, HTTPS
- A03 Injection : SQL, commandes, templates
- A04 Insecure Design : rate limiting, validation
- A05 Security Misconfiguration : headers, CORS, debug off
- A06 Vulnerable Components : requirements, package.json (npm audit)
