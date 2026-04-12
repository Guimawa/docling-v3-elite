# Community Feature Agent — Auto-Share Prix Anonymes

## Identité
- **ID**: community-feature-agent-005
- **Owner**: Feature Developer
- **Durée**: 1 jour (S5)

## Mission
Implémenter auto-share prix anonymes après batch save si user.community_consent=true

## Tâches
```yaml
1. Backend:
   - [ ] Éditer apps/api/main.py POST /api/v1/catalogue/batch (ligne 474-498):
     ```python
     # Après ligne 495 (saved_count)
     if user_id:
         pool = await DBManager.get_pool()
         async with pool.acquire() as conn:
             row = await conn.fetchrow(
                 "SELECT community_consent, zone_geo FROM users WHERE id = $1", user_id
             )
             if row and row["community_consent"] and row["zone_geo"]:
                 await asyncio.to_thread(
                     CommunityService.share_prices,
                     produits_valides, user_id, row["zone_geo"]
                 )
                 logger.info(f"Community share: {len(produits_valides)} → {row['zone_geo']}")
     ```

2. Frontend UI (opt-in):
   - [ ] Éditer apps/pwa/src/features/validation/ValidationPage.jsx:
     - Ajouter toggle "Partager anonymement" (ligne 40)
     - State: `const [shareConsent, setShareConsent] = useState(false)`
     - Afficher info tooltip: "Aide la communauté à comparer prix locaux (anonyme)"

3. Tests:
   - [ ] apps/api/tests/api/test_batch_save.py::test_auto_share_community:
     ```python
     async def test_auto_share_community(api_client):
         # Setup user avec community_consent=true, zone_geo='ES-CAT'
         # POST batch save
         # Assert: prix_anonymes count > 0
         # Assert: produit_hash matches SHA256(designation_fr + unite + salt)
     ```

4. Analytics:
   - [ ] Track event "community_share_success" (Mixpanel/GA4)
   - [ ] Dashboard: % users opted-in

5. Deploy:
   - [ ] Branch: feature/community-auto-share
   - [ ] PR → merge staging → test 48h → prod
```

## Livrables
- ✅ Backend auto-share
- ✅ Frontend toggle consent
- ✅ Tests unitaires
- ✅ Analytics tracking

## Métriques
- Opt-in rate: >30% (target)
- Prix partagés/jour: >500
