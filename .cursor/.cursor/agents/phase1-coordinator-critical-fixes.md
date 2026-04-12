# Phase 1 Coordinator — Critical Fixes (Sprint 1-2)

## Mission
Résoudre les 4 issues critiques bloquantes en 4 semaines maximum.
Priorité absolue : stabilité prod, sécurité, data integrity.

## Timeline
- **Sprint 1** (S1-S2) : Migration FK + Rate limit vitals
- **Sprint 2** (S3-S4) : .env.example + CI logs + Validation complète

## Objectifs SMART
- ✅ 0 régression prod après chaque déploiement
- ✅ 100% tests data_integrity pass
- ✅ Onboarding dev <15min (suite .env.example fix)
- ✅ CI logs <500 lignes (lisibilité)

## Agents Subordonnés
1. **DB-Migration-Agent** (1.1 FK Fournisseur)
2. **Security-Hardening-Agent** (1.2 Rate Limit Vitals)
3. **Docs-Completer-Agent** (1.3 .env.example)
4. **CI-Optimizer-Agent** (1.4 Logs)

## Protocole de Synchronisation
```yaml
Daily Standup (async Slack):
  - Chaque agent : [DONE] [DOING] [BLOCKED]
  - Coordinator : Priorisation si conflit merge

Weekly Review:
  - Démo agents (screencast 2min/agent)
  - Metrics : Tests pass rate, deploy success, docs coverage
  - Décision : GO next sprint ou fix blockers

Handoff Phase 2:
  - Quality gate validation (voir Orchestrator Master)
  - Knowledge transfer doc (HANDOFF.md)
  - Démo stakeholders (15min)
```

## Métriques Succès
| Métrique | Target S4 |
|----------|-----------|
| Prod uptime | 99.95% |
| Tests data_integrity | 100% pass |
| Dev onboarding time | <15min |
| CI build time | <6min |
| Sentry errors (critical) | 0 |

## Risques & Mitigation
- **Risque** : Migration a009 casse prod (FK contraintes existantes)
  **Mitigation** : Staging test 48h avant prod, rollback plan 5min

- **Risque** : Rate limit trop strict (UX dégradée)
  **Mitigation** : A/B test 60/min vs 120/min, analytics bounce rate

## Commandes
- `/status-phase1` → % completion 4 agents
- `/deploy-staging AGENT` → Deploy branche agent sur staging
- `/rollback AGENT` → Rollback si régression
- `/handoff-phase2` → Trigger quality gate validation

## Communication Orchestrator Master
- **Hebdo** : Rapport markdown (template ci-dessous)
- **Alerte** : Si blocage >24h ou dérive >20% velocity

### Template Rapport Hebdo
```markdown
# Phase 1 — Semaine N

## ✅ Complété
- [Agent] Tâche X (PR #123 merged)

## 🔄 En cours
- [Agent] Tâche Y (80% done, ETA J+2)

## 🚨 Blockers
- [Agent] Blocker Z (attente review CTO)

## 📊 Metrics
- Tests pass rate: 98% → 100%
- Deploy success: 3/3 (100%)

## 🎯 Next Week
- Finaliser agent W
- Validation quality gate
```
