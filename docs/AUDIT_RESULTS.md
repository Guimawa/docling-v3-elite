# 🔬 AUDIT INTÉGRAL — DOCLING V3 MONOREPO
**Date d'exécution** : 10 Novembre 2026
**Auditeur** : Jules — Expert Dev Senior / Lead Architect
**Périmètre** : Intégralité du monorepo (10 132 fichiers, 2 339 468 lignes scannées)
**Normes de référence** : Clean Architecture 2026, OWASP Top 10, Standards Stripe / Vercel / Linear / Notion

---

## 📌 RÉSUMÉ EXÉCUTIF & SCORECARD GLOBAL

| Domaine | Note /100 | Statut | Observations Majeures |
| :--- | :---: | :---: | :--- |
| **1. Architecture & Monorepo** | **68/100** | ⚠️ MITIGÉ | Monorepo npm workspace bien découpé mais scripts de build globaux absents et doublon architectural PWA/Web. |
| **2. Backend (Cloudflare/Hono & Python)** | **62/100** | ⚠️ MITIGÉ | Migration Cloudflare Workers moderne initiée mais plusieurs bugs bloquants (Stripe non importé, signatures discordantes). |
| **3. Frontend (Web & PWA)** | **65/100** | ⚠️ MITIGÉ | PWA riche et fonctionnelle mais en JavaScript/React 18; apps/web en Vite/TS avec des hooks React non importés. |
| **4. Mobile (Expo / React Native)** | **70/100** | ⚠️ CORRECT | Intégration NativeWind et Better-Auth bien pensée, synchronisation offline présente, mock components. |
| **5. Base de données & Migrations** | **64/100** | ⚠️ MITIGÉ | PostGIS et fonctions RPC Atlas bien définies, mais RLS désactivé sur les tables critiques et schémas divergents. |
| **6. Sécurité & OWASP** | **52/100** | 🔴 CRITIQUE | Wildcard CORS ouvert, bypass de test token hardcodé, 71 vulnérabilités npm (7 critiques, 30 hautes). |
| **7. Tests & Validation** | **40/100** | 🔴 CRITIQUE | Tests désynchronisés du monorepo moderne, absence de scripts de test CI à la racine. |
| **8. Performance & Bundle** | **70/100** | ⚠️ CORRECT | Stratégie Edge Workers performante, mais lazy loading et code-splitting à consolider. |
| **SCORE GLOBAL** | **61.4/100** | ⚠️ CONDITIONNEL | **NON PRÊT POUR LA PRODUCTION SANS LES CORRECTIFS CRITIQUES** |

---

## 📌 PHASE 0 — INVENTAIRE EXHAUSTIF DU CODEBASE

L'inventaire a été réalisé par notre moteur d'audit sur **10 132 fichiers** (totalisant **2 339 468 lignes**).

### Répartition par famille de fichiers

| Catégorie | Fichiers | Rôle & Utilité dans le projet |
| :--- | :---: | :--- |
| **agent_rules** | 5 946 | Règles, compétences et workflows pour agents d'ingénierie (`.cursor`, `.claude`, `.agent`, `.gemini`). |
| **documentation** | 2 914 | Spécifications, architectures, PRD, guides opérationnels et manuels. |
| **backend_legacy_python** | 633 | Implémentation historique FastAPI / Python, migrations Alembic et suite de tests Python. |
| **frontend_pwa** | 166 | Application PWA historique (React 18 / Tailwind / Zustand / Lucide). |
| **configuration** | 142 | Manifestes de configuration (package.json, tsconfig.json, wrangler.toml, etc.). |
| **bmad_methodology** | 65 | Framework d'analyse et architecture d'ingénierie logicielle BMAD. |
| **planning** | 59 | Artefacts de planification et roadmaps fonctionnelles Docling v3. |
| **frontend_web** | 34 | Nouvelle interface Web Dashboard Aurora (Vite 6 / React 19 / TypeScript). |
| **mobile_expo** | 21 | Application Mobile pour les artisans terrain (React Native 0.76 / Expo / NativeWind). |
| **backend_hono** | 5 | Nouveau backend Serverless Edge (Cloudflare Workers / Hono / Gemini 3.1 / Better-Auth). |
| **desktop_agent** | 3 | Agent de synchronisation de dossier local / watchdog de factures. |
| **email_worker** | 3 | Cloudflare Email Worker pour l'ingestion automatique de factures par email. |
| **database** | 2 | Schémas initiaux SQL Atlas (`atlas_setup.sql` et `_setup/atlas_schema.sql`). |
| **other** | 139 | Fichiers divers, templates HTML, assets statiques et scripts utilitaires. |

---

## 🔐 SECTION 1 — ENV : VARIABLES D'ENVIRONNEMENT

### 1. Variables Requises par Application
- **apps/api (Cloudflare Worker)** :
  - `SUPABASE_URL` : URL du projet Supabase.
  - `SUPABASE_SERVICE_KEY` : Clé de service Supabase (accès admin / bypass RLS).
  - `DATABASE_URL` : Chaîne de connexion PostgreSQL directe (utilisée par Better-Auth et le pool `pg`).
  - `GEMINI_API_KEY` : Clé d'API Google Generative AI (Gemini Flash-Lite / Pro).
  - `STRIPE_SECRET_KEY` : Clé secrète de l'API Stripe.
  - `STRIPE_WEBHOOK_SECRET` : Signature du webhook Stripe pour valider les événements.
  - `STRIPE_PRO_PRICE_ID` : ID de tarification du plan Pro.
  - `BETTER_AUTH_SECRET` : Secret cryptographique pour le hachage des sessions Better-Auth.
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : Identifiants OAuth Google.
  - `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` : Identifiants OAuth Apple.
  - `GEMINI_MODEL` (optionnel) : Surcharge du modèle LLM.

- **apps/web & apps/pwa** :
  - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` : Configuration Supabase client.
  - `VITE_API_URL` : Point d'accès de l'API Hono.

### 2. Risques et Défauts Identifiés
- ⚠️ **Absence de validation fail-fast au démarrage** : Dans `apps/api/src/index.ts`, les bindings `c.env` ne sont pas validés par un schéma Zod ou Pydantic au boot. Si `GEMINI_API_KEY` ou `SUPABASE_SERVICE_KEY` est manquant, l'erreur survient lors du premier scan utilisateur (HTTP 500).
- 🔴 **Bypass secret hardcodé** : Dans `apps/api/src/index.ts` (lignes 72-74) :
  ```typescript
  if (authHeader !== 'Bearer development-test-token') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  ```
  Ce token de test permet d'invoquer l'API sans authentification en production si l'en-tête est intercepté ou deviné.

---

## 📦 SECTION 2 — DEP : AUDIT DES DÉPENDANCES

### 1. Synthèse de l'audit npm
- **Audit global** : 71 vulnérabilités répertoriées au total :
  - 🔴 **7 Critiques**
  - 🟠 **30 Hautes**
  - 🟡 **31 Modérées**
  - 🔵 **3 Basses**
- **Vulnérabilités critiques majeures** :
  - `zod < 4.6.6` : Vulnérabilité de déni de service par exhaustion mémoire sur la validation de collections contraintes (GHSA-mrhx-c7xc-m3w5).
  - `@babel/core <= 7.29.0` : Lecture arbitraire de fichiers via commentaire `sourceMappingURL` (GHSA-4x5r-pxfx-6jf8).
  - Transitives Cloudflare Miniflare / Wrangler.

### 2. Conflits d'Architecture et Dépendances Fantômes
- **Dualité React 18 / React 19** : `apps/pwa` utilise `react@^18.3.1`, tandis que `apps/web` utilise `react@^19.0.0-rc`. Cela empêche le partage de composants UI purs entre le Web et la PWA dans le monorepo.
- **Absence de gestionnaire de paquets unifié** : Présence de `package-lock.json` à la racine et dans `apps/api`, mais des références à `pnpm` et `uv` dans la documentation technique 2026.

---

## 📄 SECTION 3 — FICHIER : REVUE DÉTAILLÉE PAR FICHIER SOURCE

### 1. `apps/api/src/index.ts`
- **C'est quoi ?** : Point d'entrée principal de l'API Cloudflare Worker (Hono).
- **À quoi ça sert ?** : Routage HTTP, authentification Better-Auth, webhooks Stripe, extraction IA Gemini et géolocalisation Atlas.
- **Note qualité : 5.5/10**
- **Qualité & Problèmes** :
  - 🔴 **Ligne 30** : `new Stripe(...)` est instancié sans que `import Stripe from 'stripe'` ne soit importé dans le fichier (provoquera un crash `ReferenceError: Stripe is not defined` à l'appel du webhook Stripe).
  - 🔴 **Ligne 187** : `new StorageService(c.env, supabase)` passe 2 arguments alors que le constructeur de `StorageService` (`apps/api/src/services/storage.ts`) n'attend qu'un seul argument (`private supabase: SupabaseClient`).
  - 🟠 **Ligne 19** : `app.use('*', cors())` active un CORS permissif total avec wildcard `*`, exposant l'API aux attaques cross-origin sur les cookies et en-têtes.
  - 🟠 **Ligne 72** : Bypass d'authentification hardcodé avec token statique `development-test-token`.

### 2. `apps/email-worker/src/index.ts`
- **C'est quoi ?** : Cloudflare Worker pour les emails entrants.
- **À quoi ça sert ?** : Analyse des emails avec pièces jointes PDF/images et stockage automatique.
- **Note qualité : 3/10**
- **Qualité & Problèmes** :
  - 🔴 **Ligne 25** : `const filePath = inbox/\-\;` : Syntaxe JavaScript invalide (erreur de template literal ou de build), empêchant la compilation.
  - 🔴 **Ligne 45** : `console.log(Facture \ ingérée avec succès.);` : Syntaxe JavaScript invalide.

### 3. `apps/desktop-agent/src/index.ts`
- **C'est quoi ?** : Agent d'arrière-plan pour le synchronisateur de fichiers local.
- **À quoi ça sert ?** : Détection des factures déposées dans un dossier local et téléversement vers l'API.
- **Note qualité : 4/10**
- **Qualité & Problèmes** :
  - 🔴 **Troncature du fichier** : Le fichier commence par `import notifier from 'node-notifier'; // ... (imports et init restants identiques) watcher.on(...)`. Les variables `watcher`, `path`, `log`, `calculateHash`, `processedHashes`, `fs`, `FormData`, `axios`, `API_URL`, `API_TOKEN`, `processedDir`, `errorDir` ne sont ni importées ni déclarées.

### 4. `apps/web/src/App.tsx`
- **C'est quoi ?** : Composant racine de l'application Web Dashboard.
- **À quoi ça sert ?** : Affichage du Dashboard Aurora, gestion des vues (Landing, Auth, Dashboard, Atlas) et interaction Pilot.
- **Note qualité : 6/10**
- **Qualité & Problèmes** :
  - 🔴 **Lignes 8-14** : Utilisation de `useState` et `useEffect` sans import React. Doit commencer par `import { useState, useEffect } from 'react'`.
  - 🟡 Lien de facturation Stripe hardcodé : `https://billing.stripe.com/p/login/test_YOUR_LINK`.

### 5. `apps/pwa/src/App.jsx`
- **C'est quoi ?** : Application PWA principale complète.
- **À quoi ça sert ?** : Navigation complète avec React Router v6, Sonner, Zustand, gestion offline et thèmes visuels.
- **Note qualité : 8.5/10**
- **Qualité & Problèmes** :
  - ✅ Excellente architecture de composants, lazy-loading systématique, accessibilité (skip link, aria labels).
  - 🟡 Écrit en JavaScript standard (`.jsx`) plutôt qu'en TypeScript strict (`.tsx`).

### 6. `apps/mobile/App.tsx`
- **C'est quoi ?** : Application Mobile terrain Expo / React Native.
- **À quoi ça sert ?** : Interface de scan rapide, vérification par glissement ("QuickSwipe") et synchronisation asynchrone offline.
- **Note qualité : 8/10**
- **Qualité & Problèmes** :
  - ✅ Intégration NativeWind propre, store de synchronisation d'arrière-plan par intervalles de 30 secondes.
  - 🟡 Dépendance au schéma Supabase `profiles.specialization` qui doit être aligné avec les migrations.

---

## 💻 SECTION 4 — CODE : CODE MORT, DUPLICATIONS ET ANOMALIES

1. **Duplication Frontend Web / PWA** :
   - `apps/pwa` et `apps/web` implémentent deux dashboards distincts avec des dépendances divergentes.
   - Recommandation : Faire de `apps/web` le conteneur officiel TypeScript 2026 et migrer les fonctionnalités de `apps/pwa` en modules partagés.
2. **Backend Legacy non branché** :
   - `apps/api/_legacy/api_full_backup` contient 633 fichiers Python FastAPI, avec des suites de tests exhaustives non exécutées par les pipelines de build actuels de `apps/api` (qui tourne sous Node/Cloudflare Workers).
   - Recommandation : Conserver les migrations SQL Alembic sous `_setup/migrations` et archiver proprement le dossier legacy pour alléger le dépôt.

---

## ❌ SECTION 5 — ERREUR : BUGS ET CORRECTIONS EXACTES

### Erreur 1 : Import manquant `Stripe` dans `apps/api/src/index.ts`
- **Ligne** : 30
- **Impact** : Crash HTTP 400/500 à chaque webhook Stripe en production.
- **Correction exacte** :
  ```typescript
  import Stripe from 'stripe';
  ```

### Erreur 2 : Discordance constructeur `StorageService` dans `apps/api/src/index.ts`
- **Ligne** : 187
- **Impact** : Instanciation avec des paramètres invalides.
- **Correction exacte** :
  ```typescript
  const storageService = new StorageService(supabase);
  ```

### Erreur 3 : Syntaxe invalide dans `apps/email-worker/src/index.ts`
- **Lignes** : 25 et 45
- **Impact** : Échec total du build de l'email-worker.
- **Correction exacte** :
  ```typescript
  const filePath = `inbox/${Date.now()}-${attachment.filename}`;
  // ...
  console.log(`Facture ${attachment.filename} ingérée avec succès.`);
  ```

### Erreur 4 : Imports React manquants dans `apps/web/src/App.tsx`
- **Ligne** : 1
- **Impact** : Échec de compilation Vite/TypeScript `ReferenceError: useState is not defined`.
- **Correction exacte** :
  ```typescript
  import React, { useState, useEffect } from 'react';
  ```

---

## ⚠️ SECTION 6 — PROBLÈME : VULNÉRABILITÉS ET RISQUES (OWASP TOP 10)

| Sévérité | Règle OWASP | Localisation | Description du Risque | Impact |
| :---: | :---: | :--- | :--- | :--- |
| 🔴 **P0** | **A01: Broken Access Control** | `apps/api/src/index.ts:72` | Bypass d'authentification avec `development-test-token`. | Permet à un tiers d'exécuter des scans et de consommer des tokens Gemini sans être authentifié. |
| 🔴 **P0** | **A01: Broken Access Control** | `atlas_setup.sql` | RLS non activé sur la table `atlas_prices`. | N'importe quel client Supabase avec la clé anonyme peut potentiellement lire ou modifier la table des prix. |
| 🟠 **P1** | **A05: Security Misconfiguration** | `apps/api/src/index.ts:19` | `cors()` appliqué sans whitelist d'origines. | Vulnérabilité de requête inter-origines (CSRF / data exfiltration). |
| 🟠 **P1** | **A06: Vulnerable Components** | `package.json` | 71 vulnérabilités de dépendances (Zod DoS, Babel file read). | Risque de déni de service sur le parseur d'entrées API. |
| 🟡 **P2** | **A02: Cryptographic Failures** | `_setup/CHECKLIST_SECRETS.md` | Secrets d'environnement documentés dans les templates d'outils. | Risque de fuite lors de partages d'historique Git. |

---

## 💡 SECTION 7 — AMÉLIORATION : RECOMMANDATIONS ARCHITECTURALES

### 1. Pratiques d'ingénierie inspirées des références Tech (Stripe / Linear / Vercel)
- **Validation stricte au démarrage (Pattern Stripe)** : Utiliser `t3-env` ou `zod` pour valider l'intégralité des variables d'environnement (`Bindings`) dès le premier tick d'exécution du Worker.
- **Idempotence et Déduplication par Empreinte Numérique (Pattern Stripe)** : Remplacer la vérification de doublon par simple nom de fichier (`file.name`) par un hash SHA-256 du buffer de la facture (`crypto.subtle.digest('SHA-256', fileBuffer)`). Deux factures identiques renommées ne doivent pas consommer de tokens d'inférence.
- **Isolation RLS Multi-Tenant (Pattern Supabase)** : Activer immédiatement RLS sur `atlas_prices` et `invoices` :
  ```sql
  ALTER TABLE atlas_prices ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Lecture publique anonyme" ON atlas_prices FOR SELECT USING (true);
  CREATE POLICY "Écriture restreinte RPC" ON atlas_prices FOR INSERT WITH CHECK (auth.role() = 'service_role');
  ```
- **Unification du Monorepo (Pattern Vercel Turborepo / pnpm)** :
  - Migrer le workspace vers `pnpm 9+`.
  - Configurer des scripts racine standardisés : `build`, `lint`, `test`, `type-check`.

---

## ⚖️ VERDICT FINAL

- **Statut de conformité** : **CONDITIONNEL / CORRECTIONS REQUISES**
- **Bloquants avant mise en production (P0)** :
  1. Corriger les erreurs de syntaxe et d'import dans `apps/api/src/index.ts`, `apps/email-worker/src/index.ts`, `apps/desktop-agent/src/index.ts` et `apps/web/src/App.tsx`.
  2. Supprimer immédiatement le bypass token `development-test-token` dans `apps/api/src/index.ts`.
  3. Activer le Row Level Security (RLS) sur les tables `atlas_prices` et `invoices`.
  4. Configurer une liste blanche d'origines stricte pour le middleware CORS.
  5. Mettre à niveau les dépendances vulnérables (`npm audit fix`).
