# 🔑 Guide de récupération des Secrets Docling V3

Suivez ce guide pour récupérer les valeurs avant de lancer `./inject_secrets.ps1`.

### 1. Gemini (IA)
- **Où** : [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Nom** : `GEMINI_API_KEY`
- **Rôle** : Extraction de données haute fidélité (OCR Elite).

### 2. Stripe (Paiements)
- **Où** : [Dashboard Stripe](https://dashboard.stripe.com/test/apikeys) (Mode Test d'abord !)
- **Nom** : `STRIPE_SECRET_KEY`
- **Rôle** : Gestion des abonnements Pro et Atlas Premium.

### 3. Supabase (Database)
- **Où** : Settings > API dans ton projet Supabase.
- **Noms** : `SUPABASE_URL` et `SUPABASE_ANON_KEY`.
- **Rôle** : Stockage des scans et intelligence Géo-Prix.

### 4. Better Auth (Sécurité)
- **Où** : À générer (une chaîne aléatoire longue).
- **Nom** : `BETTER_AUTH_SECRET`.
- **Rôle** : Chiffrement des jetons de session utilisateurs.

---
**Une fois prêt, lance :**
`.\_setup\inject_secrets.ps1`
