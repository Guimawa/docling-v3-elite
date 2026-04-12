# Phase 4 Coordinator — Qualité & Scalabilité (Sprint 6)

## Mission
Finaliser la qualité code, augmenter coverage tests, implémenter auth avancé + admin panel.
Priorité : Production-ready, scalabilité 10k users, excellence technique.

## Timeline
- **Sprint 6** (S11-S12) : 3 workstreams parallèles + validation finale

## Objectifs SMART
- ✅ Coverage backend ≥75%, frontend ≥70%
- ✅ Refresh tokens migration 0 downtime
- ✅ Admin panel access control audit 100% pass
- ✅ Load test 100 users concurrent P95 <300ms
- ✅ SonarQube Quality Gate PASSED (A rating)

## Agents Subordonnés
1. **Test-Coverage-Agent** (4.1)
2. **Auth-Advanced-Agent** (4.2 Refresh tokens + sessions)
3. **Admin-Panel-Agent** (4.3)

## Protocole de Synchronisation
```yaml
Parallélisation Workstreams:
  Stream 1 (Test-Coverage-Agent):
    - Indépendant, pas de merge conflicts
    - Daily: Coverage report (codecov.io)

  Stream 2 (Auth-Advanced-Agent):
    - Backend focus (migration DB sensible)
    - Staging deploy S11 → prod S12 (après validation)

  Stream 3 (Admin-Panel-Agent):
    - Frontend focus
    - Peut merger en continu (feature flag ADMIN_PANEL_ENABLED)

Integration Testing (S12 Jeudi):
  - Merge 3 streams → staging
  - Load test Locust (100 users, 10min)
  - Security audit (OWASP Top 10 checklist)
  - Accessibility audit (WCAG 2.1 AA)

Go/No-Go Meeting (S12 Vendredi 10h):
  - Orchestrator Master présent
  - Review checklist production (voir ci-dessous)
  - Décision deploy prod Samedi 0h (low traffic)
```

## Métriques Succès
| Métrique | Avant | Target S12 |
|----------|-------|------------|
| Backend coverage | 65% | ≥75% |
| Frontend coverage | 60% | ≥70% |
| SonarQube rating | B | A |
| Security hotspots | 12 | 0 |
| P95 response time | 450ms | <300ms |
| Lighthouse Performance | 82 | ≥90 |
| Lighthouse PWA | 88 | 100 |

## Checklist Production (Go/No-Go)
```markdown
## Tests
- [ ] Backend pytest 75% coverage (fail si <75%)
- [ ] Frontend vitest 70% coverage (fail si <70%)
- [ ] E2E Playwright 100% pass (20 scénarios critiques)
- [ ] Load test 100 users P95 <300ms
- [ ] Security audit 0 critical/high vulns

## Database
- [ ] Migration a011 (sessions) testée staging 48h
- [ ] Backup prod avant migration (snapshot Neon)
- [ ] Rollback plan <5min testé

## Infrastructure
- [ ] Monitoring Grafana dashboards à jour
- [ ] Sentry alertes configurées (Slack #tech-alerts)
- [ ] Rate limits prod validés (pas trop stricts)
- [ ] CDN cache invalidation plan (si assets modifiés)

## Documentation
- [ ] CHANGELOG.md à jour (toutes features S1-S12)
- [ ] docs/guides/ mis à jour (screenshots nouvelles features)
- [ ] API docs Swagger à jour (nouveaux endpoints)
- [ ] Vidéo démo 5min (avant/après) prête

## Communication
- [ ] Email users beta features (opt-in notifications, etc.)
- [ ] Blog post annonce (marketing review)
- [ ] Support team formé (nouvelles features)
- [ ] Rollback communication plan (si critique)

## Legal/Compliance
- [ ] RGPD : table sessions + export user data OK
- [ ] CGU mises à jour (si nouveaux traitements données)
- [ ] Logs anonymisés (pas d'IP/emails en clair Sentry)
```

## Architecture Scalabilité
```yaml
Database Optimizations:
  - Index sessions(user_id, expires_at) BRIN (time-series)
  - VACUUM ANALYZE hebdo (Neon auto, vérifier config)
  - Connection pooling: min 2 → 5, max 10 → 20 (si load ↑)

Caching Strategy:
  - Redis (optionnel Phase 5): Cache catalogue queries hot (top 100 produits)
  - CDN: Vite build assets (immutable cache 1 an)
  - Service Worker: Cache API responses 5min (stale-while-revalidate)

Rate Limiting Production:
  - /api/v1/invoices/process: 20/min → 50/min (si users ↑)
  - /api/v1/catalogue: 100/min (ajustable Cloudflare)
  - /api/vitals: 60/min (spam protection)
```

## Risques & Mitigation
- **Risque** : Migration sessions casse auth prod (downtime)
  **Mitigation** : Blue-green deploy, feature flag SESSION_V2_ENABLED, rollback <5min

- **Risque** : Load test révèle bottleneck DB (P95 >500ms)
  **Mitigation** : Index optimizations (EXPLAIN ANALYZE queries lentes), connection pool ↑

- **Risque** : Admin panel fuite données (accès non autorisé)
  **Mitigation** : Audit security (test bypass auth), logs admin actions (audit trail)

## Load Testing Scenarios
```python
# apps/api/tests/performance/locustfile.py

class DoclingUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def browse_catalogue(self):
        self.client.get("/api/v1/catalogue?limit=50",
                        headers={"Authorization": f"Bearer {self.token}"})

    @task(1)
    def upload_invoice(self):
        with open("tests/data/facture_test.pdf", "rb") as f:
            self.client.post("/api/v1/invoices/process",
                           files={"file": f},
                           data={"model": "gemini-3-flash-preview"})

    @task(2)
    def search_products(self):
        self.client.get("/api/v1/catalogue?q=beton&famille=Maçonnerie")

# Run:
# locust --headless -u 100 -r 10 -t 10m --host https://api.docling.example.com
```

## Commandes
- `/coverage-report` → Afficher coverage delta (avant/après)
- `/load-test START` → Lancer Locust 100 users
- `/security-audit` → OWASP ZAP scan automated
- `/go-prod-checklist` → Markdown checklist interactive

## Communication Orchestrator Master
- **Daily** : Coverage % évolution (graph trending)
- **S12 Jeudi** : Go/No-Go recommendation (avec preuves metrics)
- **S12 Samedi** : Post-deploy validation report (30min après prod)
