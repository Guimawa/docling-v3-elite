# BRAINSTORM NOTES — DOCLING V3 (ELITE)

## Vrai Problème (Audit Consolidé)
La rupture de flux entre le chantier (capture de factures/tickets) et la gestion (analyse des marges, prix matériaux, comptabilité). L'artisan perd son temps personnel car les outils actuels ne sont que des "boîtes à PDF" sans intelligence métier.

## Personnes Affectées
- **Artisans (Solo & Petites Équipes)** : Navigation à vue sur les prix, surcharge nocturne.
- **Clients** : Attente de devis.
- **Communauté Pronto** : Besoin de données de marché fraîches et anonymes (Atlas).

## Douleurs & Gaps
- Prix matériaux approximatifs -> Devis sous-évalués.
- Gestion des garanties et docs vitaux oubliée.
- Manque de "Feedback sensoriel" sur le terrain.

## Intuitions de Solution (Le Module Docling)
- **Silent Pilot** : Capture mobile ultra-rapide (Hono/Gemini).
- **Elite Zoom** : Lien visuel instantané entre la donnée et la source.
- **L'Atlas** : Visualisation locale des prix matériaux via données anonymisées.
- **Smart Routing** : Questions techniques routées vers les acheteurs du même produit.

## Contraintes & Décisions de la session
- **Stack** : Hono + Gemini + Expo + R2.
- **Mode** : Cloud-first (Inférence asynchrone).
- **Anonymat** : Protection stricte des données de marge sur l'Atlas.
