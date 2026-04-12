---
name: refonte-docling-pwa
model: composer-1.5
readonly: true
---

# Instructions de refonte — Docling PWA

Document de référence pour l'agent **Visual Design Expert**. Contexte et instructions détaillées pour la refonte visuelle de l'app.

---

## Contexte Docling

- **Domaine** : Catalogue BTP (matériaux, fournisseurs, prix)
- **Usage** : Extraction factures (IA) → Validation → Catalogue → Devis
- **Utilisateurs** : Professionnels BTP (chantier, bureau)
- **PWA** : Mobile-first, usage terrain possible hors ligne

---

## Structure actuelle

| Page | Route | Rôle |
|------|-------|------|
| Scan | `/scan` | Upload PDF/images, pipeline extraction IA |
| Validation | `/validation` | Corriger/valider produits extraits avant sauvegarde |
| Catalogue | `/catalogue` | Liste produits, recherche, filtres, export CSV/Excel |
| Devis | `/devis` | Créer devis à partir du catalogue |
| Historique | `/history` | Liste des factures traitées |
| Réglages | `/settings` | Config, auth, préférences |

**Composants partagés** : Navbar, CommandPalette, OfflineBanner, CompareModal, PageLoader

---

## Design system actuel

- **Fond** : `bg-slate-950` (#0f172a)
- **Texte** : `text-slate-100` (#f1f5f9)
- **Accent** : `emerald-400` (#34d399)
- **Navbar** : `bg-slate-900/95 backdrop-blur-xl`, bottom fixed
- **Cartes** : `bg-slate-800`, `rounded-xl`, bordures `border-slate-700`
- **Toasts** : Sonner, fond `#1e293b`, bordure `#334155`

---

## Instructions de refonte par zone

### 1. Layout global (App.jsx)

- [ ] **Bento-ready** : Préparer le conteneur principal pour des layouts modulaires (grid avec gaps cohérents)
- [ ] **PageLoader** : Remplacer le spinner par un **skeleton** adapté au contenu (ex. cartes fantômes)
- [ ] **Toaster** : Harmoniser avec la palette (glassmorphism léger si cohérent)

### 2. Navbar

- [ ] **Glassmorphism** : Renforcer `backdrop-blur`, bordure subtile
- [ ] **Micro-interactions** : Feedback tactile sur les liens (scale, couleur)
- [ ] **Indicateur actif** : Barre ou point sous l'icône active (déjà partiel via `text-emerald-400`)
- [ ] **Accessibilité** : Labels aria, focus visible

### 3. ScanPage

- [ ] **Zone drop** : Carte bento-style, bordures en pointillés, hover feedback
- [ ] **Pipeline steps** : Affichage type bento (tuiles de tailles variées selon l'étape)
- [ ] **File cards** : Cartes produits avec skeleton pendant chargement
- [ ] **STATUS_CONFIG** : Badges cohérents (couleurs sémantiques, arrondis)

### 4. ValidationPage

- [ ] **Layout** : Bento grid pour les cartes produits (2 colonnes desktop, 1 mobile)
- [ ] **Lightbox** : Glassmorphism overlay, transition fluide
- [ ] **Boutons** : Feedback tactile (scale 0.98 au clic)

### 5. CataloguePage

- [ ] **PriceBar** : Intégrer dans une carte bento, typo hiérarchisée
- [ ] **Filtres** : Dropdown ou chips en cartes, micro-interactions
- [ ] **Tableau** : Skeleton rows pendant chargement, hover sur lignes
- [ ] **Cartes produits** (mobile) : Style bento, ombre légère, arrondis

### 6. DevisPage

- [ ] **Sections** : Layout bento (en-tête, lignes, totaux)
- [ ] **Lignes devis** : Cartes ou lignes avec hover

### 7. HistoryPage

- [ ] **Liste** : Cartes bento, skeleton pendant chargement

### 8. SettingsPage

- [ ] **Sections** : Cartes groupées, hiérarchie claire

### 9. OfflineBanner

- [ ] **Style** : Cohérent avec navbar (glassmorphism, non intrusif)

### 10. CompareModal

- [ ] **Overlay** : Glassmorphism
- [ ] **Contenu** : Layout bento pour la comparaison

---

## Ordre de refonte recommandé

1. **Layout global** (App, PageLoader) — fondation
2. **Navbar** — identité visuelle
3. **ScanPage** — page d'entrée, impact fort
4. **CataloguePage** — page centrale, données
5. **ValidationPage** — flux critique
6. **DevisPage**, **HistoryPage**, **SettingsPage**
7. **Composants** : OfflineBanner, CompareModal, CommandPalette

---

## Palette cible (2026)

| Usage | Couleur | Token Tailwind |
|-------|---------|----------------|
| Fond principal | #121212 | `bg-[#121212]` ou `slate-950` |
| Fond élevé | #1a1a1a | `bg-slate-900` |
| Texte principal | #e0e0e0 | `text-slate-200` |
| Texte secondaire | #94a3b8 | `text-slate-400` |
| Accent | #34d399 | `emerald-400` |
| Succès | #22c55e | `green-500` |
| Erreur | #ef4444 | `red-500` |
| Avertissement | #f59e0b | `amber-500` |

---

## Règles impératives

- **Ne pas casser** : LoginPage, RegisterPage, ProtectedRoute, routes — cf. `dev-access-free.mdc`
- **Une page à la fois** : valider (`make validate-all`) après chaque page
- **Tests** : Ne pas casser les tests existants (`CataloguePage.test.jsx`, etc.)
- **data-testid** : Conserver les `data-testid` pour les tests

---

## Checklist avant de dire "c'est fait"

- [ ] `make validate-all` passé
- [ ] Pas de régression visuelle sur les autres pages
- [ ] Contraste WCAG AA vérifié
- [ ] `prefers-reduced-motion` pris en compte si animations ajoutées
