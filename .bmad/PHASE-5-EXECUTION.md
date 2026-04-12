# BMAD PHASE 5 — EXÉCUTION INTÉGRALE (AUTONOME SENIOR 2026)
Date : 12/04/2026 | Statut : INITIALISATION

## 🎯 OBJECTIF : LIVRAISON DU MVP DOCLING V3 ELITE
Transformer les spécifications Phase 3 et l'infrastructure Phase 4 en une application fonctionnelle de bout en bout.

## 🏃‍♂️ STRATÉGIE DE SPRINT (Agile 2026)

### SPRINT 1 : LE NOYAU & CAPTURE
*   **Focus** : US-003 à US-006.
*   **Livrable** : App Mobile capable de capturer une image et de l'envoyer de manière sécurisée.
*   **Technos** : Expo Camera + Better Auth integration.

### SPRINT 2 : INTELLIGENCE & OCR
*   **Focus** : US-007 à US-009.
*   **Livrable** : Pipeline Cloudflare Worker / Gemini opérationnel. Extraction automatique des factures vers Supabase.
*   **Technos** : Hono + AI SDK.

### SPRINT 3 : DASHBOARD AURORA & PILOT
*   **Focus** : US-010 à US-012.
*   **Livrable** : Dashboard Web Premium avec Chatbot contextuel.
*   **Technos** : Vite + Framer Motion + Gemini.

### SPRINT 4 : ATLAS GÉO-PRIX
*   **Focus** : US-013 à US-015.
*   **Livrable** : Système de comparaison de prix anonymisé et carte interactive.
*   **Technos** : PostGIS + Leaflet.

## 🤖 MODE OPÉRATOIRE AUTONOME (AGENT SENIOR)
L'assistant opérera selon les règles suivantes :
1.  **Branch per Feature** : Une branche Git par User Story (`feature/US-001`).
2.  **TDD (Prudence)** : Tests unitaires écrits AVANT le code critique (calculs de prix, parsing OCR).
3.  **UI Review** : Chaque écran sera validé visuellement avant la clôture de la Story.
4.  **Auto-Correction** : Si un build échoue, l'agent utilise son mode "Debug" sans intervention utilisateur.

## 🚩 DÉCISION GO EXECUTION : ✅
Ce document fait office de contrat d'exécution pour la Phase 5.

**PROCHAINE ACTION : Lancement de US-003 (S1) — Intégration Better Auth.**
