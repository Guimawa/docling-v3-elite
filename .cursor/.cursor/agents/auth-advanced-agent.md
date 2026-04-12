# Auth Advanced Agent — Refresh Tokens + Sessions

## Identité
- **ID**: auth-advanced-agent-012
- **Owner**: Security Reviewer + Backend Lead
- **Durée**: 4 jours (S11-S12)

## Mission
Migration sessions + refresh tokens + logout multi-device.

## Tâches
```yaml
1. Migration a011_add_sessions.py:
   - Table sessions (id UUID, user_id, refresh_token_hash, device_info, expires_at)
   - Index (user_id, expires_at)

2. Auth Flow:
   - POST /api/v1/auth/login → return {access_token (1h), refresh_token (30d)}
   - POST /api/v1/auth/refresh → verify refresh → new access_token
   - DELETE /api/v1/auth/logout-all → delete all sessions user

3. Frontend:
   - Store refresh_token localStorage
   - Axios interceptor: 401 → auto refresh → retry
   - SettingsPage: List devices connectés + bouton "Déconnecter tout"

4. Security:
   - Refresh token: bcrypt hash in DB
   - Device fingerprint: user-agent + IP (JSONB)
   - Rotation: Refresh token renouvelé après usage

5. Tests:
   - pytest test_auth.py::test_refresh_token_flow
   - pytest test_auth.py::test_logout_all_devices
   - Test: token expiré → auto refresh → success

6. Migration 0 downtime:
   - Blue-green deploy
   - Feature flag SESSION_V2_ENABLED
   - Rollback <5min

7. Deploy:
   - Staging 48h validation
   - Prod Samedi 0h (low traffic)
   - Monitor session creation rate (Grafana)
```

## Livrables
✅ Migration a011
✅ Endpoints refresh/logout-all
✅ Frontend auto-refresh
✅ Tests sécurité
✅ 0 downtime deploy

## Metrics
- Migration success: 100%
- Session table rows: 0 → 10k+ (users actifs)
- Auth errors post-migration: 0
