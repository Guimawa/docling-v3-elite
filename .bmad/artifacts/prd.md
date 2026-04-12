# PRD — DOCLING V3 (OCR & INTELLIGENCE MODULE)

## 1. Résumé Exécutif
Docling V3 est le module d'ingestion et d'analyse de Pronto. Il automatise la capture de documents sur le terrain (Mobile) et centralise l'intelligence métier (Atlas, Vault) sur le web (Aurora).

## 2. Objectifs Business & KPIs
- **Objectif** : Zéro saisie manuelle pour l'artisan.
- **KPI-1** : Temps de capture "Zero-Click" (Auto-capture) < 2s.
- **KPI-2** : Précision d'extraction Gemini > 98% sur les montants TTC.
- **KPI-3** : Engagement communautaire (Contribution anonyme auto à l'Atlas).

## 3. Personas
- **Marc (L'Homme de Terrain)** : Veut scanner sans regarder l'écran.
- **Le Patron (Au Bureau)** : Analyse ses marges et compare ses prix d'achat sur l'Aurora Dashboard.

## 4. Features MoSCoW

### MUST HAVE (MVP)
- **F-001 : Silent Pilot (Mobile Repo)**
  - Auto-capture intelligente (détection de bords).
  - Feedback haptique (vibration) pour confirmer la capture sans regarder.
- **F-002 : Pipeline Gemini Elite (Cloud)**
  - Extraction Date, Fournisseur, Siren, Lignes d'articles (Items), HT, TVA, TTC.
  - Traitement asynchrone via Hono / Cloudflare.
- **F-003 : The Vault (Archivage)**
  - Dossiers dynamiques : Factures Fournisseurs, Tickets de Frais, Assurance, Kbis.
  - Système d'alertes "Rappels Intelligents" (dates d'expiration).
- **F-004 : L'Atlas Sémantique**
  - Moteur de recherche multimode (Voix/Texte).
  - Comparatif des prix matériaux basés sur les scans réels anonymisés.

### SHOULD HAVE
- **F-005 : Elite Zoom (Web)**
  - Mise en évidence de la zone source sur la photo lors du survol d'une donnée.
- **F-006 : Detective Web**
  - Gemini va chercher l'image et la fiche technique d'un produit scanné pour enrichir Pronto.

### WON'T HAVE (V1)
- Paiement des factures directement dans Docling.
- Gestion de stock multi-entrepôts.

## 5. NFR (Exigences Non Fonctionnelles)
- **Performance** : Inférence Gemini < 5s en 4G.
- **Design** : Thème "Crystal" (Mobile) vs "Aurora" (Web).
- **Sécurité** : Anonymisation des données critiques pour l'Atlas Communautaire.

## 6. Contraintes Techniques
- Mobile : Expo Framework.
- Backend : Hono / Cloudflare Workers.
- AI : Gemini 1.5 Flash (Rapide) & Pro (Analyse).
- Database : Supabase (PostgreSQL).

## 7. Hypothèses et Risques
- **Risque** : Qualité des photos dans l'obscurité ou sur chantier sale (Mitigation: Auto-flash et ISO auto).
- **Hypothèse** : L'anonymisation suffira à rassurer les artisans partageant leurs prix sur l'Atlas.
