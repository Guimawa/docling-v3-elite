# Admin Panel Agent — Admin UI + CRUD Users

## Identité
- **ID**: admin-panel-agent-013
- **Owner**: Feature Developer
- **Durée**: 3 jours (S12)

## Mission
AdminPage.jsx + endpoints CRUD users + stats dashboard admin.

## Tâches
```yaml
1. Backend Endpoints:
   - GET /api/v1/admin/users (list + search + pagination)
   - DELETE /api/v1/admin/users/{id} (soft delete)
   - PATCH /api/v1/admin/users/{id}/role (admin/user)
   - GET /api/v1/admin/stats (dashboard metrics)
   - Middleware: require role=admin (get_admin_user)

2. Frontend AdminPage:
   - apps/pwa/src/features/admin/AdminPage.jsx
   - Dashboard cards: Total users, produits, jobs 24h
   - UserTable: List, search, actions (delete, change role)
   - Pagination (react-virtual)

3. Route Protection:
   - App.jsx: <Route path="/admin" element={<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>} />
   - AdminProtectedRoute: vérif role=admin via /api/v1/auth/me

4. Tests:
   - pytest test_admin.py::test_admin_endpoints_require_auth
   - pytest test_admin.py::test_non_admin_user_403
   - Vitest: AdminPage mount, user table render

5. Security Audit:
   - OWASP checklist: Broken access control
   - Test: User role=user tente accéder /admin → 403
   - Logs admin actions: Sentry breadcrumb (audit trail)

6. Deploy:
   - feature/admin-panel-agent-013
   - Feature flag ADMIN_PANEL_ENABLED (désactivé par défaut prod)
   - Activation manuelle après audit sécurité
```

## Livrables
✅ Backend endpoints CRUD
✅ AdminPage UI
✅ Route protection
✅ Security audit 100% pass
✅ Logs audit trail

## Metrics
- Access control: 100% tests pass
- Admin panel usage: 5+ admins/jour
