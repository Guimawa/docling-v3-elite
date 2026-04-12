# 🤖 AGENTS MULTI-NIVEAUX — DOCLING V3 DETTE TECHNIQUE

## 📚 INDEX DOCUMENTATION

### 🎯 Documents Stratégiques
1. **[AGENTS-SUMMARY.md](./AGENTS-SUMMARY.md)** — Vue d'ensemble architecture 13+ agents
2. **[PROTOCOL-COMMUNICATION.md](./PROTOCOL-COMMUNICATION.md)** — Protocoles coordination inter-agents
3. **[orchestrator-master.md](./orchestrator-master.md)** — Coordinateur suprême 6 sprints

### 🔥 Coordinateurs de Phase
4. **[phase1-coordinator-critical-fixes.md](./phase1-coordinator-critical-fixes.md)** — Sprint 1-2 (S1-S4)
5. **[phase2-coordinator-quick-wins.md](./phase2-coordinator-quick-wins.md)** — Sprint 3 (S5-S6)
6. **[phase3-coordinator-features.md](./phase3-coordinator-features.md)** — Sprint 4-5 (S7-S10)
7. **[phase4-coordinator-quality.md](./phase4-coordinator-quality.md)** — Sprint 6 (S11-S12)

### 🤖 Agents Exécutants

#### Phase 1 — Critical Fixes
8. **[db-migration-agent.md](./db-migration-agent.md)** — Migration a009 FK fournisseur
9. **[security-hardening-agent.md](./security-hardening-agent.md)** — Rate limit vitals
10. **[docs-completer-agent.md](./docs-completer-agent.md)** — .env.example complet
11. **[ci-optimizer-agent.md](./ci-optimizer-agent.md)** — Logs CI <500 lignes

#### Phase 2 — Quick Wins UX
12. **[community-feature-agent.md](./community-feature-agent.md)** — Auto-share prix anonymes
13. **pdf-viewer-agent.md** — Viewer inline PWA (à créer)
14. **spline-3d-agent.md** — Scene 3D fix (à créer)

#### Phase 3 — Features Complètes
15. **bytez-fallback-agent.md** — API fallback Gemini (à créer)
16. **offline-queue-agent.md** — PWA offline queue (à créer)
17. **push-notifications-agent.md** — Backend + Frontend (à créer)

#### Phase 4 — Qualité & Scalabilité
18. **test-coverage-agent.md** — Backend 75%, Frontend 70% (à créer)
19. **auth-advanced-agent.md** — Refresh tokens + sessions (à créer)
20. **admin-panel-agent.md** — Admin UI + endpoints (à créer)

---

## 🚀 QUICK START

### Pour Orchestrator Master
```bash
# 1. Lire vue d'ensemble
cat .cursor/agents/AGENTS-SUMMARY.md

# 2. Lire protocole communication
cat .cursor/agents/PROTOCOL-COMMUNICATION.md

# 3. Setup dashboard Grafana
# Import: docs/grafana/agents-dashboard.json

# 4. Weekly report command
python scripts/agents/weekly_report.py
```

### Pour Coordinateur Phase
```bash
# 1. Lire votre phase
cat .cursor/agents/phase1-coordinator-critical-fixes.md  # ou 2, 3, 4

# 2. Lister vos agents
ls .cursor/agents/*-agent.md | grep phase1  # adapter phase

# 3. Daily standup summary
python scripts/agents/daily_standup_summary.py --phase=1
```

### Pour Agent Exécutant
```bash
# 1. Lire votre definition
cat .cursor/agents/db-migration-agent.md  # votre agent

# 2. Créer branche
git checkout -b feature/db-migration-agent-001

# 3. Daily standup post (Slack format)
[db-migration-agent-001] — 2026-03-15
✅ DONE: Migration a009 créée
🔄 DOING: Tests unitaires (ETA: 16/03)
🚨 BLOCKED: Aucun

# 4. Avant PR
python scripts/agents/pre_pr_check.py --agent=db-migration-agent-001
```

---

## 📊 HIÉRARCHIE VISUELLE

```
                    ORCHESTRATOR MASTER
                    (orchestrator-master.md)
                            │
        ┌───────────────────┼───────────────────┬───────────────┐
        │                   │                   │               │
   PHASE 1              PHASE 2             PHASE 3         PHASE 4
(Critical Fixes)     (Quick Wins UX)     (Features)      (Qualité)
        │                   │                   │               │
    ┌───┴───┐           ┌───┴───┐           ┌───┴───┐       ┌───┴───┐
    │ 4     │           │ 3     │           │ 3     │       │ 3     │
    │agents │           │agents │           │agents │       │agents │
    └───────┘           └───────┘           └───────┘       └───────┘
```

**Total : 1 Orchestrator + 4 Coordinators + 13 Agents = 18 entités**

---

## 🎯 MÉTRIQUES GLOBALES (Objectifs S13)

| Métrique | Avant | Target S13 | Status |
|----------|-------|------------|--------|
| **Dette technique items** | 10 | 0 | 🎯 |
| **Coverage backend** | 65% | ≥75% | 🎯 |
| **Coverage frontend** | 60% | ≥70% | 🎯 |
| **Sentry errors critical** | 3 | 0 | 🎯 |
| **NPS score** | 35 | ≥50 | 🎯 |
| **P95 response time** | 450ms | <300ms | 🎯 |
| **Deploy success rate** | 85% | >95% | 🎯 |

---

## 📅 TIMELINE GLOBALE

| Sprint | Semaines | Phase | Agents Actifs | Livrables Clés |
|--------|----------|-------|---------------|----------------|
| **1-2** | S1-S4 | Phase 1 | 4 agents | Migration a009, Rate limit, Docs |
| **3** | S5-S6 | Phase 2 | 3 agents | Community, PDF viewer, Spline |
| **4-5** | S7-S10 | Phase 3 | 3 agents | Bytez, Offline, Push notifs |
| **6** | S11-S12 | Phase 4 | 3 agents | Coverage, Auth, Admin |
| **Final** | S13 | Review | Orchestrator | Rapport, Démo, Celebration |

---

## 🛠️ SCRIPTS UTILITAIRES

### scripts/agents/create_agent.py
```bash
# Créer nouvel agent depuis template
python scripts/agents/create_agent.py \
  --id=new-agent-001 \
  --phase=2 \
  --mission="Courte description" \
  --duration="2 jours"

# Output: .cursor/agents/new-agent-001.md (pré-rempli)
```

### scripts/agents/status_all.py
```bash
# Status tous agents (JSON)
python scripts/agents/status_all.py --format=json

# Output:
{
  "phase1": {
    "completion": "100%",
    "agents": [
      {"id": "db-migration-agent-001", "status": "DONE", "progress": 100},
      ...
    ]
  },
  ...
}
```

### scripts/agents/quality_gate.py
```bash
# Valider quality gate avant handoff phase
python scripts/agents/quality_gate.py --phase=1

# Output:
✅ tests.data_integrity: 100% pass
✅ deployments.migration_a009: deployed prod
✅ metrics.sentry_errors: 0 critical
🎉 PHASE 1 QUALITY GATE PASSED
```

---

## 📞 CONTACTS

| Rôle | Responsable | Slack | Email |
|------|-------------|-------|-------|
| **Orchestrator Master** | CTO | @cto | cto@docling.com |
| **Phase 1 Coordinator** | Backend Lead | @backend-lead | backend@docling.com |
| **Phase 2 Coordinator** | Frontend Lead | @frontend-lead | frontend@docling.com |
| **Phase 3 Coordinator** | Backend Lead | @backend-lead | backend@docling.com |
| **Phase 4 Coordinator** | DevOps Senior | @devops | devops@docling.com |

**Slack Channels** :
- `#docling-dette-technique` — Communication globale agents
- `#tech-backend` — Backend agents
- `#tech-frontend` — Frontend agents
- `#tech-alerts` — Incidents, blockers critiques

---

## 🎓 RESSOURCES

### Documentation Projet
- [Plan Stratégique Complet](../../docs/plan-strategique-dette-technique.md)
- [Architecture Technique](../../docs/architecture.md)
- [CHANGELOG](../../CHANGELOG.md)

### Outils
- **Jira/Linear** : https://linear.app/docling/project/dette-technique
- **Grafana Dashboard** : https://grafana.docling.internal/d/agents
- **Codecov** : https://codecov.io/gh/docling/docling-agent
- **Sentry** : https://sentry.io/organizations/docling/

### Références
- [Multi-Agent Workflow Skill](./.agents/skills/multi-agent-workflow/)
- [Development Workflow Rule](../.cursor/rules/development-workflow.mdc)
- [Senior DevOps Workflow Rule](../.cursor/rules/senior-devops-workflow.mdc)

---

## 🎉 CÉLÉBRATION

À la fin de chaque phase :
1. 🎥 **Démo vidéo** 5min (avant/après)
2. 🍕 **Team lunch** virtuel (budget appro)
3. 🏆 **Agent of the Phase** (vote équipe)
4. 📝 **Retro** (what went well, improve next)

Fin projet (S13) :
1. 🎊 **Launch party** (virtuel + présentiel si possible)
2. 📰 **Blog post** public (marketing)
3. 💰 **Bonus** performance (selon KPIs atteints)
4. 🚀 **Next roadmap** Phase 5+ (features innovantes)

---

**Dernière mise à jour** : 2026-03-05
**Version** : 1.0
**Auteur** : Orchestrator Master (AI Assistant)
