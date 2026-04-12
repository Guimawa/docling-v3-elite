# ARCHITECTURE DE PRODUCTION — DOCLING V3 ELITE

## Architecture Decision (ADR-001)
**Stack** : Edge Computing (Cloudflare) + Real-time AI (Gemini Flash-Lite).
**Raison** : Latence minimale pour le scan mobile et scalabilité infinie sans serveurs à gérer.

## Diagramme des Flux
1.  **Ingestion** : Mobile App (Expo) ➔ Cloudflare Workers (Hono).
2.  **Intelligence** : Worker ➔ Google AI (Gemini) ➔ Extraction JSON.
3.  **Persistance** : Worker ➔ Supabase (PostgreSQL/PostGIS).
4.  **Atlas** : Requête spatiale PostGIS pour comparer les prix dans un rayon de 50km.

## Stratégie de Sécurité
- **Auth** : Better Auth avec JWT rotatifs.
- **Anonymisation** : Système "Ghost-Shield" pour les prix de l'Atlas (aucun SIRET stocké dans la base publique).

## Scalabilité
- Support natif de 10k utilisateurs simultanés via Cloudflare Edge.
- Rate limiting par IP et par compte sur l'endpoint OCR.

## Risques Techniques & Mitigation
- **Coupure Cloudflare** : Repli DNS sur Worker de secours (Désactivé en V1).
- **Timeout Gemini** : File d'attente asynchrone pour les gros volumes de scans.
