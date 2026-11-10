# 🔍 RAPPORT D'AUDIT TECHNIQUE GLOBAL — DOCLING V3 MONOREPO
**Date d'audit** : Novembre 2026
**Auditeur** : Jules — Expert Lead Architect & Sécurité Senior
**Périmètre** : Audit intégral sans modification du code existant (10 132 fichiers, 2 339 468 lignes analysées)
**Normes d'évaluation** : OWASP Top 10, Clean Architecture 2026, Standards Cloudflare Workers & React 19

---

## 📊 1. RÉSUMÉ EXÉCUTIF & TABLEAU DE BORD (SCORECARD)

| Domaine Analysé | Score / 100 | Niveau de Risque | Synthèse de l'évaluation |
| :--- | :---: | :---: | :--- |
| **Bugs Potentiels & Runtimes** | **54/100** | 🔴 ÉLEVÉ | Des erreurs de compilation et de runtime bloquantes sont présentes dans `apps/api`, `apps/web`, `apps/email-worker` et `apps/desktop-agent`. |
| **Failles de Sécurité (OWASP)** | **48/100** | 🔴 CRITIQUE | Wildcard CORS non restreint, bypass de test token hardcodé, absence de RLS sur la table des prix communautaires, et 71 vulnérabilités de dépendances. |
| **Performance & Scalabilité** | **68/100** | 🟡 MODÉRÉ | Bonne orientation serverless Edge (Cloudflare Workers / Hono), mais absence de cache Redis/KV distribué et déduplication superficielle par simple nom de fichier. |
| **Architecture & Refactorisation** | **62/100** | 🟡 MODÉRÉ | Conflits structurels majeurs : coexistence d'un frontend complet en React 18 (`apps/pwa`) et d'un nouveau dashboard React 19 (`apps/web`), legacy FastAPI orphelin. |
| **SCORE GLOBAL D'AUDIT** | **58.0/100** | 🔴 **CRITIQUE** | **NON QUALIFIÉ POUR DÉPLOIEMENT EN PRODUCTION SANS RÉSOLUTION DES BLOQUANTS** |

---

## 🐛 2. BUGS POTENTIELS ET ERREURS D'EXÉCUTION (RUNTIME & BUILD)

### 🔴 P0 — `apps/api/src/index.ts` : Instanciation Stripe sans import
- **Localisation** : `apps/api/src/index.ts:30`
- **Description** : L'objet `Stripe` est instancié directement (`new Stripe(c.env.STRIPE_SECRET_KEY, ...)`), or la classe `Stripe` n'est pas importée en tête de fichier.
- **Impact** : Lors de tout appel webhook Stripe (`/api/stripe/webhook`), le Worker crashe avec `ReferenceError: Stripe is not defined`.
- **Correction recommandée** :
  ```typescript
  import Stripe from 'stripe';
  ```

### 🔴 P0 — `apps/api/src/index.ts` : Discordance de signature du constructeur `StorageService`
- **Localisation** : `apps/api/src/index.ts:187` vs `apps/api/src/services/storage.ts:4`
- **Description** : Dans `index.ts`, le service est instancié avec deux paramètres : `new StorageService(c.env, supabase)`, alors que dans `apps/api/src/services/storage.ts`, le constructeur n'en attend qu'un seul :
  ```typescript
  export class StorageService {
    constructor(private supabase: SupabaseClient) {}
  ...
  ```
- **Impact** : Le premier paramètre (`c.env`) est assigné à `private supabase`, provoquant un crash dès le premier appel à `this.supabase.storage.from(...)`.
- **Correction recommandée** :
  ```typescript
  const storageService = new StorageService(supabase);
  ```

### 🔴 P0 — `apps/email-worker/src/index.ts` : Erreurs de syntaxe JavaScript bloquant la compilation
- **Localisation** : `apps/email-worker/src/index.ts:25` et `apps/email-worker/src/index.ts:45`
- **Description** : Le code source contient des lignes invalides issues d'une mauvaise manipulation d'échappement de template literals :
  ```typescript
  // Ligne 25
  const filePath = inbox/\-\;
  // Ligne 45
  console.log(Facture \ ingérée avec succès.);
  ```
- **Impact** : Le worker `docling-email-ingestion` échoue systématiquement à la compilation (`Syntax error "-"`) et ne peut pas être déployé.
- **Correction recommandée** :
  ```typescript
  const filePath = `inbox/${Date.now()}-${attachment.filename}`;
  console.log(`Facture ${attachment.filename} ingérée avec succès.`);
  ```

### 🔴 P0 — `apps/web/src/App.tsx` : Imports de hooks React manquants
- **Localisation** : `apps/web/src/App.tsx:8-14`
- **Description** : `useState` et `useEffect` sont intensivement utilisés dans le composant, mais seul `./lib/supabase` et les sous-composants sont importés.
- **Impact** : Échec immédiat de la compilation Vite/TypeScript (`Cannot find name 'useState'`, `Cannot find name 'useEffect'`).
- **Correction recommandée** :
  ```typescript
  import { useState, useEffect } from 'react';
  ```

### 🔴 P0 — `apps/web/src/main.tsx` : Corruption de fin de fichier par octets nuls (`\x00`)
- **Localisation** : `apps/web/src/main.tsx:16`
- **Description** : Le fichier se termine par une chaîne encodée avec des octets nuls alternés :
  `/\x00/\x00 \x00B\x00u\x00i\x00l\x00d\x00...`
- **Impact** : Vite / Rolldown échoue avec l'erreur `[builtin:vite-transform] Error: Invalid Character '\x00'` lors du build de production Cloudflare Pages.
- **Correction recommandée** : Nettoyer la dernière ligne en UTF-8 propre.

### 🔴 P0 — `apps/desktop-agent/src/index.ts` : Fichier tronqué et variables orphelines
- **Localisation** : `apps/desktop-agent/src/index.ts:1-5`
- **Description** : Le fichier commence au milieu d'un bloc sans initialisation :
  ```typescript
  import notifier from 'node-notifier';
  // ... (imports et init restants identiques)
  watcher.on('add', async (filePath) => {
  ```
  Les objets `watcher`, `path`, `fs`, `axios`, `API_URL`, `processedHashes`, `calculateHash` ne sont ni déclarés ni importés.
- **Impact** : Le daemon desktop ne peut pas démarrer ni compiler via `tsc`.

---

## 🔒 3. FAILLES DE SÉCURITÉ ET CONFORMITÉ (OWASP TOP 10)

### 🔴 1. Broken Access Control (OWASP A01) : Token de bypass de test hardcodé
- **Localisation** : `apps/api/src/index.ts:72-74`
- **Code incriminé** :
  ```typescript
  if (!session) {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== 'Bearer development-test-token') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  ```
- **Risque** : N'importe quel attaquant envoyant `Authorization: Bearer development-test-token` peut contourner l'authentification Better-Auth, déclencher des extractions OCR payantes sur Gemini et saturer le quota de l'artisan.

### 🔴 2. Broken Access Control (OWASP A01) : Absence de RLS sur `atlas_prices`
- **Localisation** : `atlas_setup.sql` & `_setup/atlas_schema.sql`
- **Risque** : Les tables `atlas_prices` créées dans Supabase n'exécutent pas `ALTER TABLE atlas_prices ENABLE ROW LEVEL SECURITY;`. Tout utilisateur disposant de la clé publique anonyme Supabase (`anon_key`) peut potentiellement lire, insérer ou corrompre les relevés de prix géolocalisés.
- **Correction recommandée** :
  ```sql
  ALTER TABLE atlas_prices ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Lecture ouverte aux membres" ON atlas_prices FOR SELECT USING (true);
  CREATE POLICY "Insertion via service role uniquement" ON atlas_prices FOR INSERT WITH CHECK (auth.role() = 'service_role');
  ```

### 🟠 3. Security Misconfiguration (OWASP A05) : Wildcard CORS permissif
- **Localisation** : `apps/api/src/index.ts:19`
- **Code incriminé** : `app.use('*', cors());`
- **Risque** : L'API accepte les requêtes depuis n'importe quel domaine tiers avec wildcard `*`. Bien que pratique en développement local, cela expose les endpoints aux attaques CSRF et au cross-origin abuse en production.
- **Correction recommandée** : Définir une liste stricte d'origines autorisées issues de `c.env.ALLOWED_ORIGINS`.

### 🟠 4. Vulnerable and Outdated Components (OWASP A06) : 71 Vulnérabilités NPM
- **Audit des dépendances** :
  - **7 vulnérabilités critiques**
  - **30 vulnérabilités hautes**
  - Notamment `zod < 4.6.6` (Déni de service par consommation mémoire CPU/RAM sur schémas imbriqués) et `@babel/core <= 7.29.0` (Lecture arbitraire de fichiers via `sourceMappingURL`).
- **Correction recommandée** : Exécuter `npm audit fix` et épingler les sous-dépendances critiques.

---

## ⚡ 4. PROBLÈMES DE PERFORMANCE ET SCALABILITÉ

### 1. Déduplication superficielle par simple nom de fichier
- **Localisation** : `apps/api/src/index.ts:108`
- **Analyse** : L'anti-doublon compare uniquement `file.name` dans Supabase :
  ```typescript
  .eq('filename', file.name)
  ```
- **Problème** : Si un artisan scanne deux fois la même facture avec deux noms de fichiers différents (ex: `IMG_001.jpg` puis `Scan_Facture.pdf`), l'anti-doublon échoue et l'inférence Gemini Flash est re-payée intégralement. Inversement, si deux factures distinctes de fournisseurs différents s'appellent `facture.pdf`, la deuxième sera ignorée à tort.
- **Recommandation** : Calculer une empreinte cryptographique SHA-256 du buffer du fichier :
  ```typescript
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  ```

### 2. Multiples appels RPC en boucle non-batchés dans `apps/api`
- **Localisation** : `apps/api/src/index.ts:228-265`
- **Analyse** : Pour chaque produit extrait de la facture, le code exécute un `upsert` individuel sur `products`, puis un `insert` sur `price_history`, puis un RPC `insert_atlas_price`.
- **Problème** : Sur une facture de gros œuvre de 40 lignes, cela déclenche 120 requêtes HTTP/SQL réseau séquentielles ou semi-parallèles vers Supabase, augmentant la latence à plus de 5 secondes.
- **Recommandation** : Implémenter une procédure SQL batch unique `batch_insert_invoice_products(invoice_id, json_products_array)`.

---

## 🏗️ 5. OPPORTUNITÉS DE REFACTORISATION & DETTE TECHNIQUE

### 1. Dualité et divergence entre `apps/pwa` et `apps/web`
- **Constat** :
  - `apps/pwa` contient 166 fichiers : il s'agit de l'application complète éprouvée (React 18, React Router v6, Sonner, Zustand, Tailwind v3, 14 pages métier, support offline IndexedDB, tests Vitest).
  - `apps/web` contient 34 fichiers : il s'agit d'un nouveau scaffolding initié en React 19 / Vite 6, avec un composant `App.tsx` monolithique de 196 lignes gérant la navigation par hash rudimentaire (`window.location.hash`).
- **Opportunité de refactorisation** :
  - Conserver `apps/pwa` comme socle de production immédiat.
  - Aligner `apps/web` sur une architecture modulaire en important le design-system et les composants partagés, ou fusionner les deux apps sous un nom unique.

### 2. Isolation du code legacy Python (`apps/api/_legacy`)
- **Constat** : `apps/api/_legacy/api_full_backup` compte 633 fichiers Python FastAPI, avec des suites complètes de tests unitaires et d'intégration qui ne sont plus reliées aux scripts d'intégration continue de l'API moderne Hono/Cloudflare.
- **Opportunité** : Déplacer les migrations Alembic utiles dans un dossier de référence `database/migrations` et archiver le code FastAPI orphelin hors de l'arborescence de travail principale.

### 3. Absence de validation Zod sur les variables d'environnement Worker
- **Opportunité** : Utiliser un schéma strict `envSchema.parse(c.env)` au démarrage du Worker Hono afin de garantir un échec explicite et immédiat (Fail-Fast) si une variable vitale (`GEMINI_API_KEY`, `SUPABASE_SERVICE_KEY`) est absente.

---

## 📋 6. PLAN D'ACTION PRIORISÉ (ROADMAP)

1. **Sprint 1 (Correctifs Bloquants — 24h)** :
   - [ ] Importer `Stripe` et corriger l'instanciation de `StorageService` dans `apps/api/src/index.ts`.
   - [ ] Réparer les templates literals de `apps/email-worker/src/index.ts`.
   - [ ] Importer `useState` et `useEffect` dans `apps/web/src/App.tsx`.
   - [ ] Nettoyer la terminaison binaire de `apps/web/src/main.tsx`.
2. **Sprint 2 (Sécurisation & Conformité — 48h)** :
   - [ ] Supprimer le token de bypass `Bearer development-test-token`.
   - [ ] Activer Row Level Security (RLS) sur `atlas_prices` et `invoices`.
   - [ ] Restreindre le middleware `cors()` aux origines de confiance.
   - [ ] Mettre à jour les dépendances vulnérables (`zod`, `@babel/core`).
3. **Sprint 3 (Scalabilité & Architecture — 1 semaine)** :
   - [ ] Migrer la déduplication vers un hash SHA-256 du contenu de fichier.
   - [ ] Batcher l'insertion des lignes produits en une seule transaction SQL.
   - [ ] Harmoniser le frontend entre `apps/web` et `apps/pwa`.
