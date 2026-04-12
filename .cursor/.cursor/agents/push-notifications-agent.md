# Push Notifications Agent — PWA Push Notifications

## Identité
- **ID**: push-notifications-agent-010
- **Owner**: Feature Developer
- **Durée**: 4 jours (S9-S10)

## Mission
Table notifications + endpoints + permission UI + service worker push listener.

## Tâches
```yaml
S9 Backend:
1. Migration a010_add_notifications.py:
   - Table notifications (user_id, type, title, body, data, read, created_at)
   - Indexes (user_id, read, created_at)

2. Endpoints:
   - POST /api/v1/notifications (admin trigger)
   - GET /api/v1/notifications (user list + mark read)
   - PATCH /api/v1/notifications/{id}/read

3. Trigger auto:
   - orchestrator.py après job_done → notification "Extraction terminée"

S10 Frontend:
4. Permission Modal:
   - SettingsPage toggle "Activer notifications"
   - navigator.permissions.query('notifications')
   - Notification.requestPermission()

5. Service Worker:
   - self.addEventListener('push', handler)
   - showNotification() avec data deep link

6. Tests:
   - pytest backend endpoints
   - Test manuel Chrome DevTools (send test push)

7. Deploy:
   - feature/push-notifications-agent-010
   - Opt-in modal A/B test (aggressive vs passive)
```

## Livrables
✅ Migration a010
✅ Backend endpoints
✅ Frontend permission UI
✅ Service worker listener
✅ Tests complets

## Metrics
- Opt-in: >50%
- Delivery: >98%
- Click rate: >15%
