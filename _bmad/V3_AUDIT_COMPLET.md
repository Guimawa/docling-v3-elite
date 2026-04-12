# 🧠 AUDIT DE VALIDATION BMAD — DOCLING V3 (ÉLITE)

Ce document acte l'intégralité des décisions validées en session le 12/04/2026 par les agents Saga, Sally et Murat.

---

## 🏗️ ARCHITECTURE & INFRASTRUCTURE (Audit Murat)
### 1. Stack Technique "Elite Edge"
- **Backend** : Cloudflare Workers (Hono) pour une latence minimale.
- **IA OCR** : Gemini 1.5 Flash (Vitesse) & 3.1 Pro (Analyse).
- **Inférence** : Doit être < 3s, avec support total du mode Offline-First.
- **Stockage Hybride** : Configurable entre l'infrastructure Docling (R2) ou le Cloud privé de l'utilisateur (Dropbox, Google Drive). Envoi PDF/Image compressée.
- **Idempotence** : Détection stricte des doublons par hashage de fichier pour éviter les doubles saisies.

### 2. Base de Données (Supabase)
- **Normalisation** : Table "Produits" avec Bounding Boxes (x, y, w, h) pour chaque ligne extraite.
- **Sécurité** : RLS (Row Level Security) activé. Anonymat total des données envoyées vers l'Atlas communautaire.

---

## 🎨 DESIGN & INTERFACE (Audit Sally)
### 1. Thèmes Visuels
- **Aurora (Bureau/Admin)** : Glassmorphism premium, halos ambre/cyan, halos radiaux sur le body.
- **Crystal Light (Terrain)** : Mode "Mains Sales". Haute lisibilité, boutons cibles > 60px.
- **Feedback Sensoriel** : Utilisation des API Haptique (vibrations) et Audio (Bips de confirmation) pour le travail au jugé sur chantier.

### 2. Expérience Utilisateur (UX)
- **Scanner Furtif** : Ouverture immédiate sur la caméra. Auto-crop et Auto-capture sans intervention manuelle.
- **Elite Zoom Validation** : Au survol d'une donnée sur le web, l'image de la facture se déplace et zoome automatiquement sur la zone source.
- **Agentic UI** : Fenêtre IA omniprésente capable de générer des widgets à la volée sur commande vocale ou écrite.

---

## 📈 MÉTIER & FONCTIONNALITÉS (Audit Saga)
### 1. Ingestion Intelligent
- **Apprentissage Automatique** : Classification auto par type de dépense (Ciment, Outillage, Gazole, Assurance) basée sur l'historique du fournisseur.
- **Scanner Multi-Doc** : Gestion des factures matériaux, frais généraux, assurances, documents véhicules.
- **Coffre-fort (Vault)** : Archivage intelligent des documents vitaux avec rappels de péremption "Soft" (Notifs discrètes).

### 2. Communauté & Atlas (Waze-BTP)
- **Atlas des Prix** : Carte territoriale des prix payés réellement par les confrères.
- **Réseau d'Entraide Anonyme** : L'IA peut router une question technique vers les acheteurs du même produit. Activation via réglage "Participation Communautaire".
- **Bouton Évolution** : Canal direct vers les développeurs pour les demandes impossibles (Suggestions métier).

---

## 🚦 CONFORMITÉ & EXPORT
- **Factur-X** : Conformité obligatoire pour la réforme 2026.
- **Bundles Comptables** : Export structuré pour Sage, Pennylane, QuickBooks.
- **Réglages** : Contrôle granulaire de l'utilisateur sur le caractère "invasif" des notifications.

---

## 📑 DOCUMENTS DE RÉFÉRENCE ANALYSÉS
- `PRD_V3_ELITE.md`
- `DOCLING_V3_MASTER_SPEC.md`
- `theme-aurora.html`
- Archive Heritage `planning/prd.md` (GPS, Sensory Feedback, Crystal Light).
