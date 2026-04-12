# Docling Project Context (Clean Arch 2026)
Updated: 2026-04-11

## 🎯 Vision
"Le Bloomberg du Chantier" - Plateforme d'intelligence prix BTP et automatisation administrative pour artisans et comptables.

## 🏗️ Technical Stack (Validated)
- **Frontend PWA/Web**: React + Vite (Sophie's Dashboard)
- **Mobile**: React Native / Expo v54 (Marc's Scanner)
- **API (Edge)**: Cloudflare Workers (Hono.js)
- **AI Core**: Gemini 2.5 Flash (Extraction Multimodale Stable 2026)
- **Database**: Supabase (Postgres with RLS)
- **Storage**: Multi-Cloud Storage Provider (Supabase / GDrive / OneDrive)

## 📁 Repository Structure
- `/apps/api` : Le cœur logique (Extraction & Stockage)
- `/apps/mobile` : Application terrain Expo
- `/apps/web` : Dashboard gestionnaire
- `/supabase` : Migrations et sécurité de la base
- `/_legacy` : Archives des versions Python et prototypes obsolètes

## 🔐 Key Principles
1. **BYOC (Bring Your Own Cloud)**: L'utilisateur choisit où stocker ses archives PDF.
2. **Crystal Light Design**: Interface haute visibilité optimisée pour le terrain.
3. **Edge-First**: Traitement ultra-rapide près de l'utilisateur.
