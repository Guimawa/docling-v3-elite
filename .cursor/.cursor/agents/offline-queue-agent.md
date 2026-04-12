# Offline Queue Agent — PWA Offline Upload Queue

## Identité
- **ID**: offline-queue-agent-009
- **Owner**: Frontend Lead
- **Durée**: 3 jours (S8)

## Mission
Compléter offlineQueue.js + intégration service worker pour retry upload auto quand connexion revient.

## Tâches
```yaml
1. Compléter offlineQueue.js:
   - IndexedDB storage (>5MB files)
   - enqueueUpload(), processQueue()
   - Max 50 items FIFO

2. Service Worker:
   - Listener 'online' → postMessage PROCESS_QUEUE
   - Background sync API (si supported)

3. UI Badge:
   - OfflineBanner: "X uploads en attente"
   - Bouton "Réessayer maintenant"

4. Tests:
   - Playwright offline mode
   - Upload 5 files → désactiver network → vérifier queue → activer → vérifier success

5. Deploy:
   - feature/offline-queue-agent-009
   - Validation 48h staging
```

## Livrables
✅ offlineQueue.js complet
✅ Service worker intégration
✅ UI badge pending uploads
✅ Tests offline mode

## Metrics
- Retry success: >90%
- Data loss: 0%
