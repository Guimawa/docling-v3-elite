---
name: launch-roadmap-2026
description: Lance l'execution du roadmap 2026 en vagues avec owners, gates et validations.
---

# Launch Roadmap 2026

Orchestration standard pour executer le plan en vagues avec responsabilites claires.

## Wave 0 - Orchestration

1. Activer `scan-performance-agent`
2. Activer `temporal-pricing-agent`
3. Activer `community-geo-agent`
4. Verifier les skills:
   - `adaptive-scan-estimator`
   - `temporal-pricing-dedup`
   - `community-geo-pricing`

## Waves de delivery

1. Wave 1: pre-scan ETA + priorisation batch
2. Wave 2: dedup temporelle + historisation prix
3. Wave 3: base communautaire geolocalisee
4. Wave 4: observabilite + hardening + runbooks

## Gate obligatoire

Apres chaque wave:

`make validate-all`
