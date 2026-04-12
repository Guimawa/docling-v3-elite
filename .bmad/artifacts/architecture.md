# ARCHITECTURE TECHNIQUE — DOCLING V3 (ELITE)

## 1. Vision Architecturale
Une architecture décentralisée (Edge) conçue pour la rapidité terrain et la puissance analytique.

## 2. Diagramme des Flux
- **Mobile Action** : [Expo App] -> Capture Photo -> Upload immédiat vers [Cloudflare R2].
- **Trigger OCR** : [Hono Worker] détecte l'upload -> Appel à [Gemini 3.1 Pro/Flash] -> Extraction JSON.
- **Persistence** : Stockage des métadonnées dans [Supabase].
- **Atlas Pipeline** : Agrégation anonymisée des prix basée sur la géolocalisation mobile stockée.
- **Web Insight** : [Dashboard Aurora] récupère les données via [Hono] pour affichage temps réel.

## 3. Composants Techniques
- **API Framework** : Hono (Type-safe, léger, tourne sur l'Edge Cloudflare).
- **Auth Layer** : Better Auth (Intégration native Hono, support Social Auth).
- **Data Store** : Supabase PostgreSQL. extension `postgis` pour les calculs de distance de l'Atlas.
- **File Store** : Cloudflare R2 pour les documents originaux et miniatures.
- **State Management** : Zustand (Mobile & Web) pour une interface réactive.

## 4. Stratégie Géo-Atlas
- Chaque scan capture la `latitude`, `longitude` et `accuracy` du mobile.
- Les prix sont moyennés par zone (ex: rayon de 5km, 20km, 50km).
- Anonymisation : Le Nom de l'artisan et du client sont purgés avant l'insertion dans la table publique de l'Atlas.

## 5. Intelligence Conversationnelle (Pilot RAG)
- **Mécanisme** : Function Calling (Sémantique -> SQL).
- **Workflow** : 
  1. Pilot reçoit la question.
  2. Gemini 1.5 identifie l'intention et extrait les filtres (fournisseur, dates, montants).
  3. Appel de l'outil `query_vault_structured` via Hono.
  4. Synthèse de la réponse avec suggestion d'actions (ex: "Voulez-vous exporter ce rapport en PDF ?").

## 6. Logic de Recherche Marchande (Atlas Browser)
- **Moteur** : Recherche hybride (Mots-clés + Géo-spatial PostGIS).
- **Filtres (Facettes)** : Prix Min/Max, Rayon (KM), Catégories, Unité de mesure.
- **Récupération** : Endpoint `/atlas/search` avec tri dynamique (Proximité vs Prix).

## 7. Gestion de la Résilience (Offline)
- File d'attente locale (Zustand persisté).
- Mécanisme de "Retry" exponentiel pour les uploads en zone blanche.

## 6. Sécurité & RGPD
- Chiffrement au repos sur R2 et Supabase.
- Isolation stricte des Vaults privés par `user_id`.
