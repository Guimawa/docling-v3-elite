# PRD Docling V3 — Module "Élite"

## 🎯 Vision du Produit
Un assistant intelligent pour artisans BTP, fonctionnant comme un module autonome de Pronto. Capture ultra-rapide, gestion intelligente des documents (matériaux, frais, garanties) et entraide communautaire anonyme.

---

## 📱 Module Mobile (Le Pulseur)
### 1. Capture & Traitement
- **Flux "Scan-and-Forget"** : Toujours connecté, pas de re-login.
- **Auto-Capture & Auto-Crop** : Détection intelligente des bords de la facture.
- **Aide à la Prise de Vue** : Notifications immédiates si l'image est floue ou sombre.
- **Apprentissage Prédictif** : L'IA suggère la catégorie (Frais, Matériel, Outillage) selon le fournisseur et l'historique.

### 2. Le Catalogue Visuel (Optionnel)
- **Photo d'Objet** : Option de prendre en photo le matériel réel pour illustrer la fiche produit.

---

## 💻 Module Web Dashboard (Le Cerveau)
### 1. Interface & Design (Aurore)
- **Style Glassmorphism** : Basé sur le thème Aurora (Ambre/Cyan/Dark).
- **Widgets Dynamiques** : Créés par l'IA sur demande de l'utilisateur (ex: "Montre-moi mes dépenses gazole").
- **Le Vault** : Section dédiée aux documents importants (Assurances, Kbis, Véhicules) avec rappels de péremption.

### 2. IA "Docling Pilot"
- **Interaction Multimodale** : Chat vocal ou écrit, sans bridage.
- **Analyse de Données** : Capacité à répondre à des questions complexes sur l'ensemble des scans.
- **Validation par Zoom de Ligne** : Zoom automatique sur la photo de la facture correspondant à la ligne de donnée en cours de vérification.

---

## 🌐 Intelligence Collective & Forum
### 1. Enrichissement des Fiches Produits
- **IA Détective** : Recherche automatique sur le web de photos et fiches techniques si l'artisan n'en fournit pas.
- **Validation Artisan** : Système de confirmation des informations trouvées par l'IA.

### 2. Forum & Entraide Anonyme
- **Forum Classique** : Catégories et sujets pro pour le partage d'expérience.
- **Entraide Contextuelle** : L'IA peut router une question spécifique sur un produit vers les autres acheteurs de ce même produit.
- **Confidentialité & Réglages** :
    - Anonymat total des échanges.
    - L'utilisateur choisit dans ses réglages s'il accepte d'aider la communauté (Notifs discrètes).

---

## 🛠️ Stack Technique 2026
- **Backend** : Cloudflare Workers (Hono) + Gemini 1.5/3.1.
- **Storage** : Cloudflare R2 (Images/PDFs).
- **Database** : Supabase (Auth + PostgreSQL).
- **Frontend** : React (Vite) + Expo (Mobile).
