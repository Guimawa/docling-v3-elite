# Test Coverage Agent — Backend 75%, Frontend 70%

## Identité
- **ID**: test-coverage-agent-011
- **Owner**: Test Generator
- **Durée**: 3 jours (S11)

## Mission
Créer 30+ tests manquants pour atteindre coverage targets.

## Tâches
```yaml
1. Backend (65% → 75%):
   - Analyser codecov gaps (core/db_manager.py, services/)
   - Créer tests unitaires manquants
   - Focus: error paths, edge cases

2. Frontend (60% → 70%):
   - apps/pwa/src/features/history/__tests__/HistoryPage.test.jsx (10 tests)
   - apps/pwa/src/features/devis/__tests__/DevisPage.test.jsx (8 tests)
   - apps/pwa/src/features/settings/__tests__/SettingsPage.test.jsx (12 tests)

3. CI Update:
   - .github/workflows/ci.yml ligne 104: --coverage.thresholds.lines=70
   - Backend pytest: --cov-fail-under=75

4. Run:
   - Backend: pytest --cov=core --cov=services --cov-report=html
   - Frontend: pnpm exec vitest run --coverage

5. Deploy:
   - feature/test-coverage-agent-011
   - CI doit passer avec nouveaux seuils
```

## Livrables
✅ 30+ nouveaux tests
✅ Coverage backend 75%
✅ Coverage frontend 70%
✅ CI seuils updated

## Metrics
- Backend: 65% → 75% (+10%)
- Frontend: 60% → 70% (+10%)
