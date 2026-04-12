# Phase 3 Coordinator — Features Complètes (Sprint 4-5)

## Mission
Implémenter 3 features complexes nécessitant backend + frontend + tests.
Priorité : Robustesse, fallback mechanisms, engagement utilisateur.

## Timeline
- **Sprint 4** (S7-S8) : Bytez fallback + Offline queue
- **Sprint 5** (S9-S10) : Notifications push (migration + backend + frontend)

## Objectifs SMART
- ✅ Bytez fallback testé (mock Gemini down 100% success)
- ✅ Offline queue retry >90% success rate
- ✅ Push notifications opt-in >50% users
- ✅ 0 data loss (queue persistence localStorage + IndexedDB)

## Agents Subordonnés
1. **Bytez-Fallback-Agent** (3.1)
2. **Offline-Queue-Agent** (3.2)
3. **Push-Notifications-Agent** (3.3)

## Protocole de Synchronisation
```yaml
Séquence:
  S7: Bytez-Fallback-Agent (2j) → Code review → Merge
  S8: Offline-Queue-Agent (3j) → Testing manuel intensif
  S9: Push-Notifications-Agent backend (2j)
  S10: Push-Notifications-Agent frontend (2j) → Integration testing

Daily Standup (vidéo 15min):
  - Agent actif démo live (partage écran)
  - Coordinator valide architecture (pas de dette tech ajoutée)
  - Décisions techniques (IndexedDB vs localStorage, etc.)

Code Review Strict:
  - 2 reviewers minimum (Coordinator + Security Reviewer)
  - Checklist : Error handling, tests coverage, logs, docs
  - Rejet si <80% coverage nouveau code
```

## Métriques Succès
| Métrique | Target S10 |
|----------|-----------|
| Bytez fallback latency | <2x Gemini |
| Offline queue data loss | 0% |
| Push notif delivery rate | >98% |
| Push notif click rate | >15% |
| Service worker crash | 0 (Sentry) |

## Architecture Technique
```
Bytez Fallback:
  orchestrator.py
    ├─ try: GeminiService
    ├─ except GeminiError:
    │   └─ if BYTEZ_API_KEY: BytezService
    └─ except: raise (no silent fail)

Offline Queue:
  useScanUpload.js
    ├─ try: apiClient.post(upload)
    ├─ catch NetworkError:
    │   └─ enqueueUpload(file, model, source)
    └─ on('online'): processQueue()

  Storage:
    - <5MB: localStorage (JSON array)
    - >5MB: IndexedDB (Blob storage)
    - Max 50 items (FIFO si dépassement)

Push Notifications:
  Backend:
    - Table notifications (user_id, type, title, body, data)
    - POST /api/v1/notifications (admin/system trigger)
    - GET /api/v1/notifications (user fetch + mark read)

  Frontend:
    - Permission modal (SettingsPage)
    - Service worker listener 'push'
    - Notification click → navigate deep link
```

## Risques & Mitigation
- **Risque** : Bytez API lent (timeout 30s+)
  **Mitigation** : Timeout config 20s, fallback error message user-friendly

- **Risque** : Offline queue consomme trop RAM mobile
  **Mitigation** : Limit 50 items, compression images (imageService.js)

- **Risque** : Push notif spam (users désactivent)
  **Mitigation** : Max 3 notifs/jour, settings granulaires (job_done only, etc.)

## Tests Critiques
```bash
# Bytez Fallback
pytest tests/external_services/test_bytez_fallback.py::test_gemini_down_bytez_ok -v

# Offline Queue
# 1. Désactiver network Chrome DevTools
# 2. Upload 5 factures
# 3. Vérifier localStorage queue length = 5
# 4. Réactiver network
# 5. Attendre 10s
# 6. Vérifier queue length = 0, jobs created = 5

# Push Notifications
pytest tests/api/test_notifications.py::test_push_delivery -v
# Frontend: Test manuel Chrome Notifications API
```

## Commandes
- `/test-bytez-fallback` → Mock Gemini 429 → verify Bytez called
- `/test-offline-queue` → Simulate offline → upload → online → verify
- `/send-test-notif USER_ID` → Test push notif delivery

## Communication Orchestrator Master
- **Hebdo** : Architecture diagrams (draw.io), code metrics (SonarQube)
- **Risk review** : Si nouveau risque détecté → escalade immédiate
