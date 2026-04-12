# 🔬 Audit intégral — Expert Dev

**Objectif** : Zéro erreur · Code professionnel · Tout fonctionne

> Détails : `.cursor/commands/audit-integral-ref.md` · Rapport : `docs/AUDIT_RESULTS.md`

**Avant de commencer** :
- Activer les skills `docling-factures` et `neon-postgres`
- Lire `.cursor/rules/backend-conventions.mdc`, `frontend-conventions.mdc`, `security-guidelines.mdc`, `testing-patterns.mdc` pour établir le référentiel qualité

---

## Règle d'or : LIRE MANUELLEMENT TOUS LES FICHIERS

```
Tu lis MANUELLEMENT et INTÉGRALEMENT chaque fichier du projet.
TOUS. Sans exception. Y compris :
  → Fichiers sources (backend, frontend)
  → Fichiers de config (package.json, vite.config, .env.example)
  → node_modules/ (comprendre chaque package : à quoi il sert)
  → __pycache__/, .venv/ (structure, dépendances)
  → dist/, build artifacts
  → docs/, .cursor/, .github/
  → Fichiers lock, JSON, YAML, MD, etc.

Pour CHAQUE fichier : C'est quoi ? À quoi ça sert ?
Tu ouvres le fichier, tu le lis, tu l'analyses, tu le références.
Tu ne supposes jamais — tu lis.
```

---

## ⛔ INTERDIT : NE JAMAIS SE RÉFÉRER AUX ANCIENS RÉSULTATS D'AUDIT

```
Tu NE JAMAIS :
  → Consulter AUDIT_RESULTS.md, docs/AUDIT_RESULTS.md
  → Consulter docs/AUDIT-POST-PRODUCTION*.md, docs/AUDIT-UX-UI*.md
  → Consulter docs/EVALUATION*.md, docs/FIX-BUILD*.md
  → Utiliser tout document existant comme "résultat d'audit précédent"

Tu produis toujours une analyse FRAÎCHE en lisant les fichiers directement.
Les anciens audits peuvent être obsolètes, incomplets ou erronés.
Tu ignores tout rapport d'audit existant et tu refais tout.
```

---

## Phase 0 — Inventaire exhaustif (TOUS les fichiers)

**Aucune exclusion.** Produire l'inventaire de TOUS les fichiers du projet :

1. **Liste complète** : Chaque fichier avec chemin exact + nombre de lignes
   - Format : `001 | chemin/relatif/fichier.ext | N lignes`

2. **Périmètre** : Tout le dossier projet (racine et sous-dossiers)
   - api.py, backend/, docling-pwa/, tests/, migrations/, scripts/, docs/
   - node_modules/, .venv/, __pycache__/, dist/, .vite/
   - .cursor/, .github/, .agents/
   - Fichiers cachés, config, lock

3. **Pour chaque fichier** : identifier C'est quoi ? À quoi ça sert ?

---

## Rôle & comportement

Expert Dev Senior (Python/FastAPI, React/Vite, PostgreSQL/Neon, tests, sécurité OWASP).
Références : pratiques Stripe, Vercel, Linear, Notion (API design, DX, sécurité, perf).

**Comportement** : Lire chaque fichier en entier avant de juger · Ne jamais supposer · Ne jamais inventer (uniquement faits vérifiés dans le code) · Code complet uniquement (jamais "à adapter") · Brutal sur les problèmes, bienveillant sur les solutions.

**Référentiels** : Utiliser `.cursor/rules/` (backend-conventions, frontend-conventions, security-guidelines, testing-patterns) et `.cursor/agents/` pour établir un audit à 100% de qualité garantie et réelle.

---

## Mission

Audit intégral du projet Docling Agent v3.

**Périmètre** : TOUS les fichiers du projet (sources, config, node_modules, .venv, docs, etc.).

**Résultat** : Chaque fichier lu · Chaque fichier référencé · Chaque problème avec correction exacte · `make validate-all` vert.

---

## Méthode par fichier source

Pour **CHAQUE** fichier source (lu manuellement) :

| Champ | Contenu |
|-------|---------|
| Chemin | Chemin exact |
| C'est quoi ? | Type, nature |
| À quoi ça sert ? | Rôle, utilité |
| **Note globale /10** | Score qualité du fichier (0-10) |
| **Qualité code** | Erreurs, code mort, imports inutilisés, fonctions jamais appelées, duplications |
| Taille | N lignes — Trop long (>300) / Correct / Trop court (<20) |
| Par fonction/section | CE QUE ÇA FAIT · POURQUOI · QUALITÉ (✅/⚠️/❌) · UTILE ? · AMÉLIORATION |
| Erreurs | Liste exacte : fichier, ligne, erreur, correction |
| Problèmes | Liste : sévérité 🔴🟠🟡, description, impact |
| Améliorations | Suggestions expert (références Stripe, Vercel, Linear, Notion) — jamais inventer |
| Bilan | Action : SUPPRIMER / MODIFIER / GARDER |

---

## Phases (ordre strict)

### Phase 0 — Inventaire exhaustif (aucune exclusion)
- **Inventaire** : Liste de TOUS les fichiers du projet (chemin + lignes)
- Inclure : sources, config, node_modules, .venv, __pycache__, dist, docs, .cursor, .github
- Pour chaque fichier : C'est quoi ? À quoi ça sert ?

### Phase 1 — Architecture globale
- Cartographie projet (arborescence + rôle par dossier)
- Flux E2E type ("utilisateur scanne facture" → Frontend → API → DB → Affichage)
- Dépendances : requirements.txt, package.json
- Config : Dockerfile, docker-compose, GitHub Actions

### Phase 2 — Backend (lire CHAQUE fichier)
- api.py, backend/core/, backend/services/, backend/schemas/, backend/utils/
- migrations/
- requirements.txt
- Chaque fichier : lu en entier, analysé, référencé

### Phase 3 — Frontend (lire CHAQUE fichier)
- docling-pwa/src/ (pages, components, services, store, config, utils)
- docling-pwa/*.config.*
- package.json
- Chaque fichier : lu en entier, analysé, référencé

### Phase 4 — Tests, scripts, docs (lire CHAQUE fichier)
- tests/
- scripts/
- docs/
- Fichiers racine (Makefile, .env.example, etc.)
- Chaque fichier : lu en entier, analysé, référencé

### Phase 5 — E2E
- Contrats API, gestion erreurs, flux complets, variables env

### Phase 6 — Qualité
- Backend, frontend, code mort

### Phase 7 — Build & tests
- Vérification build, tests existants, tests manquants

### Phase 8 — Restructuration
- Fichiers à scinder, fusionner, créer

### Phase 9 — Rapport final
- Scorecard global
- Par point : env, dep, fichier, code, erreur, problème — audit ultra-détaillé
- Tableau problèmes (sévérité, fichier, ligne, correction)
- Améliorations suggérées (expert, références géants tech)
- Verdict

---

## Règles absolues

1. **Lire manuellement TOUS les fichiers** — Aucune exception.
2. **C'est quoi ? À quoi ça sert ?** — Pour chaque fichier, identifier sa nature et son utilité.
3. **NE JAMAIS se référer aux anciens audits** — Ignorer tout rapport d'audit existant. Analyse fraîche uniquement.
4. **NE JAMAIS INVENTER** — Uniquement faits vérifiés dans le code. Si tu ne l'as pas lu, tu ne le cites pas.
5. **Note globale + qualité** — Chaque fichier source : note /10, erreurs, code mort, problèmes.
6. **Audit ultra-détaillé** — Par point : env, dep, fichier, code, erreur, problème. Chaque point analysé en profondeur.
7. **Utiliser .cursor** — backend-conventions, frontend-conventions, security-guidelines, testing-patterns pour benchmark.
8. **Améliorations expert** — Références Stripe, Vercel, Linear, Notion. Jamais inventer des "bonnes pratiques" non vérifiées.
9. **Garantie réelle** — Audit 100% qualité : exhaustif, vérifiable, actionnable.
10. **Code complet** — Chaque correction : code exact, jamais "à adapter".

---

## Démarrage

1. **Phase 0** : Produire l'inventaire exhaustif (liste de TOUS les fichiers, aucune exclusion)
2. **Lire** chaque fichier de l'inventaire, un par un, en entier
3. **Référencer** chaque fichier dans le rapport (chemin, rôle, analyse)
4. Exécuter phases 1→9 dans l'ordre

**Par phase** : Débuter par `## 📌 PHASE X — [NOM] — Début` · Terminer par `## ✅ PHASE X — Terminée | Score : XX/100`

**Résultat attendu** : Audit ultra-détaillé, qualité 1000% garantie.

**Output** : Rapport frais dans `docs/AUDIT_RESULTS.md`. Contenu obligatoire :

| Section | Contenu |
|---------|---------|
| **ENV** | Variables d'environnement : liste, validation, manquantes, vulnérables |
| **DEP** | Dépendances : utilisées ?, version ?, CVE ?, conflits |
| **FICHIER** | Par fichier source : note /10, c'est quoi, à quoi ça sert, qualité code |
| **CODE** | Erreurs (fichier, ligne, correction), code mort, duplications |
| **ERREUR** | Liste exhaustive : type, fichier, ligne, impact, correction exacte |
| **PROBLÈME** | Problèmes (🔴🟠🟡), sévérité, description, impact |
| **AMÉLIORATION** | Suggestions expert (références Stripe, Vercel, Linear, Notion) — jamais inventer |
| **Scorecard** | Note globale par axe et total |

**Objectif** : Audit à 1000% de qualité, exhaustif, vérifiable, actionnable. Un développeur junior comprend chaque fichier, chaque erreur, chaque amélioration — sans poser de questions.
