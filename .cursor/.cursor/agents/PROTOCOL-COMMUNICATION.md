# PROTOCOLE DE COMMUNICATION INTER-AGENTS — Docling v3

## 🎯 OBJECTIF
Coordination fluide de 13+ agents travaillant simultanément sur 6 sprints (12 semaines).
Éviter : conflits merge, work duplication, blocages silencieux, régression code.

---

## 📋 NIVEAUX DE COMMUNICATION

### NIVEAU 1 : Daily Async Standup (Slack)

**Channel** : `#docling-dette-technique`

**Format** :
```
[AGENT-ID] — YYYY-MM-DD
✅ DONE: [Tâche complétée]
🔄 DOING: [Tâche en cours] (ETA: JJ/MM)
🚨 BLOCKED: [Blocker description] (@mention responsable)
📊 METRICS: [Metric clé si applicable]
```

**Exemple** :
```
[db-migration-agent-001] — 2026-03-15
✅ DONE: Migration a009 créée + tests unitaires pass
🔄 DOING: Staging deploy + monitoring 48h (ETA: 17/03)
🚨 BLOCKED: Aucun
📊 METRICS: Tests data_integrity 100% pass (12/12)
```

**Règles** :
- Post **avant 10h CET** chaque jour ouvré
- Coordinateur synthèse → thread recap 11h
- Blockers >24h → escalade automatique Orchestrator Master

---

### NIVEAU 2 : Weekly Sync (Vidéo 30min)

**Fréquence** : Chaque vendredi 14h CET

**Agenda** :
```
1. Tour de table agents (2min/agent max)
   - Démo visuelle (screenshot/GIF/Loom)
   - Highlight succès semaine
   - Blocker si pas résolu

2. Coordinator review (5min/phase)
   - Metrics delta (coverage, performance, etc.)
   - Quality gate status
   - Next week priorities

3. Orchestrator Master decisions (5min)
   - Ajustements planning si dérive
   - Allocation ressources (si agent overload)
   - Annonces (releases, incidents, etc.)

4. Q&A ouverte (5min)
```

**Enregistrement** : Loom auto-record → partage async pour absents

---

### NIVEAU 3 : Code Review (GitHub PR)

**Template PR** (auto-filled) :
```markdown
## Agent
- **ID**: [agent-id]
- **Phase**: [1-4]
- **Coordinator**: @username

## Description
[Résumé 2-3 phrases ce que fait cette PR]

## Checklist
- [ ] Tests pass local (pytest/vitest)
- [ ] Coverage nouveau code ≥80% (codecov report)
- [ ] Docs updated (README, CHANGELOG, guides si applicable)
- [ ] No Sentry errors staging 48h (si déjà merged staging)
- [ ] Security review si endpoints publics/auth/DB (checklist OWASP)
- [ ] Performance impact acceptable (Lighthouse/Locust si applicable)

## Screenshots/Demo
[Ajouter screenshot ou lien Loom si UI changes]

## Metrics Impact
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Coverage backend | 65% | 68% | +3% |
| ...

## Rollback Plan
[Si migration DB ou breaking change, décrire rollback <5min]

## Reviewers
- @coordinator (required)
- @backend-lead (si backend)
- @security-reviewer (si security)
```

**Règles Review** :
- **2 approvals minimum** : Coordinator + 1 expert domaine
- **24h max response time** : Reviewer assign → review ou delegate
- **CI pass obligatoire** : Tests + lint green avant merge
- **Squash merge** : 1 commit/PR pour historique propre

---

### NIVEAU 4 : Conflict Resolution (Merge Conflicts)

**Procédure** :
```yaml
1. Détection:
   - GitHub alerte PR conflits
   - Agent poste Slack: "[AGENT] Conflict detected with [OTHER-AGENT] on file X"

2. Coordination:
   - Coordinator @mention les 2 agents
   - Vidéo sync 15min (partage écran)
   - Décision : Qui merge en premier ? (priorité phase/criticité)

3. Résolution:
   - Agent prioritaire merge → push staging
   - Agent secondaire rebase → résout conflits → re-push
   - Re-review si changements significatifs

4. Prevention:
   - Coordinator maintient matrice "Agent → Files touchés"
   - Alert préventive si 2 agents touchent même fichier
```

**Matrice Exemple** :
| Agent | Files Touched | Risk Conflict With |
|-------|---------------|-------------------|
| db-migration-agent | apps/api/migrations/* | ❌ Aucun (séquentiel) |
| community-feature-agent | apps/api/main.py:474-498 | ⚠️ bytez-fallback-agent (même orchestrator.py) |

---

### NIVEAU 5 : Quality Gate Validation (Phase Transitions)

**Checklist Automatisée** (scripts/quality_gate.py) :
```yaml
Phase 1 → Phase 2:
  tests:
    - command: "cd apps/api && pytest tests/data_integrity -v"
      expected: "100% pass"
      blocker: true

  deployments:
    - check: "Migration a009 deployed prod"
      method: "SELECT version_num FROM alembic_version"
      expected: "a009"
      blocker: true

  metrics:
    - check: "Sentry errors critical = 0"
      api: "https://sentry.io/api/..."
      expected: 0
      blocker: true

Phase 2 → Phase 3:
  analytics:
    - check: "Community opt-in ≥30%"
      query: "SELECT COUNT(*) FROM users WHERE community_consent=true / COUNT(*)"
      expected: "≥0.30"
      blocker: false  # Nice-to-have, pas bloquant

  ux:
    - check: "PDF viewer abandon mobile <15%"
      analytics: "GA4 custom event 'pdf_viewer_close' < 15% sessions"
      expected: "<0.15"
      blocker: true
```

**Exécution** :
```bash
# Coordinator run avant handoff
python scripts/quality_gate.py --phase=1

# Output:
✅ tests.data_integrity: 100% pass (12/12)
✅ deployments.migration_a009: a009 (prod)
✅ metrics.sentry_errors: 0 critical
🎉 PHASE 1 QUALITY GATE PASSED — Ready for Phase 2
```

---

## 🛠️ OUTILS TECHNIQUES

### Slack Bots (Automation)

**StandupBot** :
```yaml
Function: Rappel daily standup
Trigger: Chaque jour 9h30 CET
Message: "@channel Time for daily standup! Format: [AGENT-ID] ✅ DONE 🔄 DOING 🚨 BLOCKED"
Monitoring: Si agent pas posté avant 10h30 → DM reminder
```

**MergeConflictBot** :
```yaml
Function: Alerte conflits merge
Trigger: GitHub webhook PR conflict detected
Message: "🚨 Merge conflict: [PR-123] @agent1 @agent2 — Files: main.py, orchestrator.py — @coordinator please coordinate"
```

**MetricsBot** :
```yaml
Function: Post metrics hebdo auto
Trigger: Vendredi 13h CET (avant weekly sync)
Message: |
  📊 Weekly Metrics (S<N>)

  Coverage: Backend 68% (+3%) | Frontend 65% (+5%)
  Deploy Success: 8/8 (100%)
  Sentry Errors: 2 low (↓3 from last week)
  Sprint Velocity: 42 pts (↑5 from last week)

  🎯 On track for Phase 2 completion!
```

### GitHub Actions (CI/CD)

**Workflow** : `.github/workflows/agent-ci.yml`
```yaml
name: Agent CI

on:
  pull_request:
    branches: [staging, main]

jobs:
  detect-agent:
    runs-on: ubuntu-latest
    steps:
      - name: Extract Agent ID from branch
        id: agent
        run: |
          # feature/db-migration-agent-001 → db-migration-agent-001
          echo "agent_id=${GITHUB_HEAD_REF##*/}" >> $GITHUB_OUTPUT

      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🔄 [${{ steps.agent.outputs.agent_id }}] PR opened: ${{ github.event.pull_request.title }}",
              "channel": "#docling-dette-technique"
            }'

  tests:
    # ... tests backend/frontend

  coverage:
    steps:
      - name: Codecov Report
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
          flags: ${{ steps.agent.outputs.agent_id }}

      - name: Comment PR Coverage
        # Auto-comment PR avec delta coverage
```

---

## 📊 DASHBOARD COORDINATION (Grafana)

**URL** : `https://grafana.docling.internal/d/agents-coordination`

**Panels** :

### Panel 1 : Agent Status Matrix
```
┌─────────────────────────────────────────────┐
│ Agent Status (Real-time)                    │
├─────────────────────────────────────────────┤
│ ✅ db-migration-agent       [DONE]  100%    │
│ ✅ security-hardening-agent [DONE]  100%    │
│ 🔄 community-feature-agent  [DOING]  80%    │
│ 🔄 pdf-viewer-agent         [DOING]  50%    │
│ ⏸️ spline-3d-agent          [BLOCKED] 0%    │
│ ... (13 agents total)                       │
└─────────────────────────────────────────────┘
```

### Panel 2 : Sprint Burndown
```
Story Points
  50 │
  40 │●●●●
  30 │    ●●●●
  20 │        ●●●
  10 │           ●●●
   0 │______________●●●__
     M  T  W  T  F  M  T  (Sprint 3)
     Actual ●  Ideal ─
```

### Panel 3 : Coverage Evolution
```
Coverage %
  80 │              ┌─Frontend
  70 │          ┌──┤
  60 │      ┌──┤  └─Backend
  50 │  ┌──┤
     │__│___________________
     S1 S2 S3 S4 S5 S6
     Target: 75% Backend, 70% Frontend
```

### Panel 4 : Blockers Timeline
```
Blocker Duration (hours)
  48 │ █ spline-3d-agent (designer OOO)
  24 │ ▓ pdf-viewer-agent (CORS issue)
   0 │_____________________________
     Current Blockers (auto-update)
```

---

## 🚨 ESCALATION MATRIX

| Niveau | Condition | Action | Responsable | Délai |
|--------|-----------|--------|-------------|-------|
| **L1 - Info** | Agent update status | Daily standup Slack | Agent | 10h CET |
| **L2 - Warning** | Blocker <24h | Tag Coordinator Slack | Coordinator | 2h |
| **L3 - Alert** | Blocker >24h | Escalade Orchestrator + vidéo sync | Orchestrator | 4h |
| **L4 - Critical** | Quality gate fail / Prod incident | Escalade CTO + emergency call | CTO | 1h |

**Exemple Escalation** :
```
L1: [pdf-viewer-agent] 🚨 BLOCKED: CORS issue presigned URL Safari
    ↓ 2h no resolution
L2: @phase2-coordinator FYI blocker pdf-viewer (CORS)
    ↓ Coordinator investigate, pas de solution rapide
    ↓ 24h elapsed
L3: @orchestrator-master ESCALATE: pdf-viewer blocked >24h (CORS Safari)
    ↓ Orchestrator convoque: Security Reviewer + DevOps + Agent
    ↓ Emergency sync 15min → Solution trouvée (CSP header)
    ✅ Résolu en 30min post-escalation
```

---

## 📝 DOCUMENTATION CONTINUE

### Agent Handoff Doc (Template)

**Fichier** : `docs/agents/AGENT-ID-handoff.md`

```markdown
# [AGENT-ID] Handoff Documentation

## Résumé
[2-3 phrases ce que fait cet agent]

## Livrables
- ✅ [PR #123] Migration a009 deployed
- ✅ [PR #124] Tests data_integrity 100% pass
- ✅ [Docs] Updated docs/guides/migrations.md

## Code Changes
- `apps/api/migrations/versions/a009_*.py` (nouveau fichier)
- `apps/api/tests/data_integrity/test_fournisseur_normalization.py` (nouveau)
- `docs/guides/migrations.md` (section ajoutée)

## Metrics Impact
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Data integrity tests | 11 | 13 | +2 |
| Migration count | a008 | a009 | +1 |

## Known Issues
- ⚠️ Performance migration lente si >100k produits (10min+)
  **Mitigation** : Run off-peak hours, monitor Neon

## Next Steps (Recommendations)
- Phase 5: Optimiser trigger normalization (batch UPDATE vs row-by-row)
- Consider: Index UPPER(fournisseur) si queries slow

## Contact
- Agent: @username
- Coordinator: @coordinator
- Review: @backend-lead, @security-reviewer
```

---

## ✅ CHECKLIST COMMUNICATION (Par Agent)

Avant de démarrer :
- [ ] Lire agent definition (mission, tâches, livrables)
- [ ] Rejoindre Slack #docling-dette-technique
- [ ] Accès GitHub repo (write permissions)
- [ ] Accès Grafana dashboard (view)

Pendant travail :
- [ ] Daily standup posted <10h CET
- [ ] Branch nommée `feature/[AGENT-ID]`
- [ ] Commits atomiques (1 commit = 1 tâche logique)
- [ ] Tests locaux pass avant push

Avant PR :
- [ ] Checklist PR template complétée 100%
- [ ] Coverage ≥80% nouveau code (codecov)
- [ ] Docs updated si applicable
- [ ] Screenshot/demo si UI changes

Après merge :
- [ ] Handoff doc créée (docs/agents/)
- [ ] Metrics reportées à Coordinator
- [ ] Célébration mini 🎉 (Slack GIF)

---

## 🎓 BEST PRACTICES

### Communication
✅ **DO** :
- Être transparent sur blockers (escalade rapide)
- Partager démos visuelles (Loom > texte)
- Documenter décisions techniques (ADR si architecture)

❌ **DON'T** :
- Rester bloqué >4h sans demander aide
- Modifier code autre agent sans coordination
- Merge main sans review 2 approvals

### Code
✅ **DO** :
- Tests avant code (TDD si applicable)
- Refactor incrémental (pas de big rewrite)
- Logs détaillés (debug facile)

❌ **DON'T** :
- Commenter code TODO sans ticket
- Copier-coller sans comprendre
- Ignorer warnings Sentry/SonarQube

### Collaboration
✅ **DO** :
- Pair programming si blocage complexe
- Code review bienveillant (suggestions > critiques)
- Partager learnings (Slack #tech-learnings)

❌ **DON'T** :
- Travailler en silo (communication 0)
- Blame autre agent si bug (focus solution)
- Skipper tests "pour aller vite"

---

**FIN PROTOCOLE COMMUNICATION**
