# ⚛️ 04 — AUDIT FRONTEND COMPLET
# React 19 · Vite · Tailwind · Zustand · PWA · Offline
# Analyse ligne par ligne — Sévérité maximale — Zéro tolérance

---

## MÉTHODE D'ANALYSE

```
Pour CHAQUE fichier frontend, produire une fiche structurée :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 [chemin/fichier.jsx]
📊 [N] lignes lues | Score : X/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRILLE D'ANALYSE PAR COMPOSANT :

  □ HOOKS — Règles respectées (pas dans conditions/boucles/callbacks) ?
  □ useEffect — Dépendances exhaustives ? Cleanup retourné ?
  □ STATE — Minimal (aucune donnée dérivée stockée) ? Jamais muté ?
  □ KEYS — Listes avec clé stable (jamais index si liste réordonnée) ?
  □ MEMOIZATION — useMemo/useCallback là où c'est justifié, pas partout ?
  □ PROPS DRILLING — > 3 niveaux → Context ou store Zustand ?
  □ ERROR BOUNDARY — Erreurs catchées par un boundary proche ?
  □ ACCESSIBILITÉ — aria-*, rôles ARIA, focus, keyboard nav, contraste ?
  □ MOBILE — Touch targets >= 44px, pas de scroll horizontal, safe areas ?
  □ CODE MORT — Variables/fonctions définies mais jamais utilisées ?
  □ TAILLE — Fichier > 250 lignes → identifier ce qu'on peut extraire
  □ SIDE EFFECTS — Tous les side effects dans useEffect (pas au render) ?
  □ DONNÉES SENSIBLES — Token ou données user jamais dans les logs console ?

CLASSIFICATION DES PROBLÈMES :
  🔴 FATAL    : Crash app / bug silencieux de données / RGPD / XSS
  🟠 CRITIQUE : Bug UX majeur / memory leak / re-render infini
  🟡 MAJEUR   : Performance dégradée / accessibilité cassée / DX pauvre
  🔵 MINEUR   : Code smell / convention / lisibilité
```

---

## F1 — docling-pwa/src/App.jsx

```
Questions spécifiques — POINT D'ENTRÉE :

□ Lazy loading sur TOUTES les pages sans exception ?
  → React.lazy() + Suspense avec fallback skeleton (pas null, pas spinner vide)
  → ScanPage, ValidationPage, CataloguePage, DevisPage, HistoryPage, SettingsPage

□ ProtectedRoute implémenté correctement ?
  → Vérifie le token/session AVANT de rendre la page
  → Redirige vers /login avec state={from: location} pour redirect post-login
  → Affiche un spinner pendant la vérification (pas de flash de contenu)

□ Providers dans le bon ordre ?
  → ErrorBoundary (le plus haut) → QueryClientProvider (si React Query)
  → AuthProvider → BrowserRouter → Toaster → Routes
  → Un provider mal positionné = crash silencieux ou context null

□ ErrorBoundary global ?
  → Classe Component avec componentDidCatch
  → Affiche une page d'erreur propre (pas un écran blanc)
  → Reporte l'erreur à Sentry

□ Toaster correctement configuré ?
  → position: "top-right" (ou bottom pour mobile) ?
  → richColors: true ?
  → duration: 4000ms (assez long pour être lu) ?
  → Pas plus de 3 toasts simultanés ?

□ App.jsx n'a AUCUNE logique métier ?
  → Routing uniquement
  → Zéro useState dans App.jsx sauf pour l'ErrorBoundary

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement — citer chaque ligne problématique]
```

### Fiche App.jsx

| Élément | Lignes | Implémenté | Correctement | Problème | Sévérité |
|---------|--------|-----------|--------------|---------|---------|
| React.lazy sur chaque page | N-N | Oui/Non | Oui/Non | | |
| Suspense fallback skeleton | N-N | | | | |
| ProtectedRoute with redirect | N-N | | | | |
| ErrorBoundary global | N-N | | | | |
| Ordre des providers | N-N | | | | |
| Toaster configuration | N-N | | | | |
| Zéro logique métier | N-N | | | | |

---

## F2 — docling-pwa/src/store/useStore.js

```
Questions spécifiques — STATE MANAGEMENT :

□ ARCHITECTURE DU STATE :
  → Lister TOUS les slices : nom, type TypeScript/JSDoc, valeur initiale
  → Données dérivées dans le store ? (calculate à la volée plutôt)
  → Données dupliquées entre store et state local ?

□ PERSIST MIDDLEWARE :
  → partialize : exclut-il les données non nécessaires en localStorage ?
    (ex: état de chargement, erreurs transitoires → ne pas persister)
  → Clé de storage unique ('docling-store') ? Risque de collision avec
    une ancienne version ? → version + migrate() configurés ?
  → Que se passe-t-il si le schema change ? (migration ou reset) ?

□ _idCounter :
  → Déclaré au niveau module (let _idCounter = 0) ?
    Si dans le state Zustand → persiste en localStorage → IDs
    potentiellement dupliqués au rechargement !
  → Utiliser crypto.randomUUID() ou nanoid() plutôt qu'un compteur ?

□ ACTIONS ASYNCHRONES :
  → Les actions qui appellent l'API gèrent-elles les erreurs ?
  → set({ isLoading: true }) avant l'appel ?
  → set({ isLoading: false }) dans un finally (même si erreur) ?

□ SÉLECTEURS :
  → Les sélecteurs sont-ils mémoïsés (shallow compare de Zustand) ?
  → Sélecteurs complexes : utiliser createSelectors() pattern ?

□ DEVTOOLS :
  → middleware devtools activé UNIQUEMENT en développement ?
    devtools(store, { enabled: import.meta.env.DEV })

□ SUBSCRIPTIONS / CLEANUP :
  → Si subscriptions à des events externes (websocket, storage) → cleanup

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement — cartographier chaque slice et action]
```

### Carte complète du state Zustand

| Slice | Type | Valeur initiale | Persisté | Actions qui le modifient | Utilisé par | Problème |
|-------|------|----------------|----------|------------------------|-------------|---------|
| extractedProducts | Product[] | [] | Non | addProducts, clearProducts | ValidationPage | |
| queue | QueueItem[] | [] | Partiel | addToQueue, updateStatus, clearQueue | ScanPage | |
| currentModel | string | — | Oui | setModel | SettingsPage | |
| [AGENT: TOUS les slices] | | | | | | |

### Questions sur le persist

| Donnée | Dans store | Persistée | Devrait l'être | Risque si persistée |
|--------|-----------|----------|----------------|-------------------|
| isLoading | | | Non | Toujours true au reload |
| error | | | Non | Erreur périmée affichée |
| extractedProducts | | | ? | Données sensibles |
| queue | | | Partiel | Fichiers File object non sérialisables |
| [AGENT: toutes les données] | | | | |

---

## F3 — docling-pwa/src/services/apiClient.js

```
Questions spécifiques — COUCHE RÉSEAU CRITIQUE :

□ BASE URL :
  → VITE_API_URL avec fallback window.location.origin (même domaine en prod) ?
  → Pas de URL hardcodée comme "http://localhost:8000" qui reste en prod ?

□ CREDENTIALS :
  → withCredentials: true si cookies httpOnly utilisés ?
  → Si Bearer token : headers Authorization ajouté sur CHAQUE requête
    via interceptor (pas copié-collé dans chaque appel) ?

□ TOKEN STORAGE — CRITIQUE SÉCURITÉ :
  → Token en cookie httpOnly (idéal) ou localStorage ?
  → Si localStorage : XSS peut voler le token → 🔴
  → Si cookie httpOnly : SameSite=Strict ou Lax configuré ?
  → Aucune trace du token dans console.log() ou Sentry breadcrumbs ?

□ TIMEOUT :
  → Timeout global défini (axios timeout: 30000 pour les uploads) ?
  → Timeout spécifique pour les endpoints lents (process = 120s) ?
  → Pas de requête qui attend infiniment ?

□ INTERCEPTORS :
  → Request interceptor : attache le token ? Log la requête en dev ?
  → Response interceptor :
    - 401 → clear token → redirect /login (sans boucle infinie!)
    - 503 → message "service temporairement indisponible"
    - Network error → distinguer offline vs server error
  → La boucle infinie sur 401 est-elle évitée ?
    (en excluant /login et /refresh du 401 interceptor)

□ RETRY :
  → Retry sur quels status codes ? (429, 503 oui — pas sur 401, 403, 422)
  → Backoff exponentiel (pas de retry flood) ?
  → Maximum 3 tentatives ?

□ ABORT CONTROLLER :
  → Les requêtes peuvent-elles être annulées (navigation pendant upload) ?
  → AbortController passé à axios comme signal: controller.signal ?

□ OFFLINE DETECTION :
  → window.addEventListener('online'/'offline') ?
  → État réseau exposé dans le store ou un hook useNetworkStatus ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement — chaque fonction, chaque interceptor]
```

### Grille apiClient.js

| Fonctionnalité | Implémentée | Correcte | Code à la ligne | Problème | Sévérité |
|---------------|------------|---------|----------------|---------|---------|
| Base URL + fallback | | | | | |
| Token storage sécurisé | | | | | |
| Timeout configuré | | | | | |
| 401 interceptor + redirect | | | | | |
| Pas de boucle infinie 401 | | | | | |
| Retry avec backoff | | | | | |
| AbortController | | | | | |
| Offline detection | | | | | |

---

## F4 — docling-pwa/src/pages/ScanPage.jsx

```
FICHIER LE PLUS CRITIQUE — SÉVÉRITÉ MAXIMALE
C'est le flux principal qui génère de la valeur.
Un bug ici = l'app est inutilisable.

Questions — FLUX UPLOAD :

□ DROPZONE :
  → accept : PDF + images uniquement (application/pdf, image/*) ?
  → maxSize en bytes défini et communiqué à l'utilisateur ?
  → multiple: true pour le batch ?
  → noClick: false (zone cliquable pour l'accessibilité) ?
  → Drag active : feedback visuel (border change, couleur fond) ?

□ VALIDATION AVANT UPLOAD :
  → Vérifier la taille avant d'envoyer (pas juste au 413 du serveur) ?
  → Vérifier l'extension (double-vérification client) ?
  → Feedback immédiat si fichier rejeté (toast + message dans la zone) ?

□ MACHINE À ÉTATS — EXHAUSTIVITÉ :
  Les états suivants DOIVENT TOUS être couverts visuellement :
  → idle        : zone de drop invitante
  → uploading   : progress bar par fichier (pas global "en cours")
  → processing  : spinner + message "L'IA analyse votre facture..."
  → partial     : N produits extraits, M erreurs
  → done        : résumé + CTA vers /validation
  → error       : message précis + bouton "Réessayer"
  → offline     : badge "Hors ligne" + info "Sera traité à la reconnexion"
  → cancelled   : confirmation que l'annulation a fonctionné

□ ANNULATION EN COURS :
  → AbortController créé au début de chaque traitement ?
  → Bouton "Annuler" visible pendant processing ?
  → cleanup dans useEffect return pour annuler si on quitte la page ?

□ MODE OFFLINE / QUEUE :
  → Si offline : fichier ajouté à la queue IndexedDB automatiquement ?
  → Au retour en ligne : synchronisation automatique ou bouton "Synchroniser" ?
  → Badge visible du nombre d'éléments en attente ?

□ GESTION DES ERREURS PARTIELLES :
  → Si 3/5 fichiers réussissent, 2 échouent : qu'est-ce qui est affiché ?
  → Les produits réussis sont-ils quand même sauvés ?
  → Message d'erreur spécifique par fichier (pas un message global) ?

□ CAMÉRA (si implémentée) :
  → getUserMedia avec contraintes (environment camera sur mobile) ?
  → Cleanup stream à l'unmount (éviter la LED caméra qui reste allumée) ?
  → Fallback si caméra refusée par l'utilisateur ?

□ CTA POST-TRAITEMENT :
  → Bouton "Voir les produits extraits" → /validation ?
  → Bouton "Aller au catalogue" si pas de validation nécessaire ?
  → Ces CTAs sont-ils le FOCUS par défaut après le traitement ?

□ USEEFFECT CLEANUP :
  → Si l'utilisateur navigue pendant un upload : abort + cleanup ?
  → useEffect retourne une fonction de cleanup ?

ANALYSE LIGNE PAR LIGNE :
  [AGENT: lire intégralement — c'est LE fichier le plus important]
  Citer CHAQUE ligne où un état n'est pas géré
```

### Grille états ScanPage — exhaustivité OBLIGATOIRE

| État | Couvert | Affiché comment | Message utilisateur clair | Action disponible | Sévérité si absent |
|------|---------|----------------|--------------------------|------------------|--------------------|
| idle | | | | Glisser-déposer ou cliquer | 🟡 |
| uploading (per file) | | | "Upload en cours 2/5" | Annuler | 🟠 |
| processing | | | "L'IA analyse..." | Annuler | 🟠 |
| partial_success | | | "3 extraits, 2 échoués" | Voir extraits / Réessayer | 🟠 |
| done | | | "N produits trouvés" | Valider / Aller au catalogue | 🔴 |
| error (réseau) | | | Message humain, pas "500" | Réessayer | 🔴 |
| error (format) | | | "Ce format n'est pas supporté" | — | 🟠 |
| offline | | | Badge "Hors ligne" | Queue automatique | 🟡 |
| cancelled | | | "Traitement annulé" | — | 🔵 |

---

## F5 — docling-pwa/src/pages/ValidationPage.jsx

```
Questions spécifiques — ÉDITION DES PRODUITS EXTRAITS :

□ DONNÉES SOURCE :
  → Données lues depuis le store (extractedProducts) ?
  → Que se passe-t-il si la page est rechargée ? (store persisté ou non ?)
  → Redirection vers /scan si le store est vide ?

□ ÉDITION INLINE :
  → Les champs éditables sont clairement identifiables (border, fond) ?
  → Diff visuel : champs modifiés vs originaux (fond jaune, badge "modifié") ?
  → useRef pour stocker les valeurs originales (pas dans le state) ?
  → Annuler une modification remet la valeur originale ?

□ BADGE CONFIANCE IA :
  → high (vert), medium (orange), low (rouge) visible sur chaque champ ?
  → Tooltip explicatif sur hover/focus du badge ?
  → Les champs "low" sont-ils mis en évidence pour révision prioritaire ?

□ VALIDATION DES CHAMPS :
  → Prix : nombre positif, pas de texte ?
  → Quantité : entier positif ?
  → Désignation : non vide ?
  → Validation onBlur (pas uniquement au submit) ?
  → Message d'erreur par champ, pas global ?

□ ACTIONS BULK :
  → "Tout enregistrer" : confirmation si des champs invalides ?
  → "Tout supprimer" : confirmation modale obligatoire ?
  → Compteur "N produits, N modifiés" visible en permanence ?
  → Total HT dynamique mis à jour à chaque modification ?

□ NAVIGATION CLAVIER :
  → Enter dans un champ → champ suivant (tab order logique) ?
  → Escape → annule l'édition du champ courant ?
  → Tab : navigue dans l'ordre logique (pas de piège au focus) ?

□ IMAGES (si preview) :
  → Lightbox accessible (focus trapped, Escape pour fermer) ?
  → aria-label sur le bouton d'ouverture ?
  → Image en lazy loading ?

□ SUPPRESSION D'UN PRODUIT :
  → Confirmation avant suppression (pas de suppression sur simple clic) ?
  → Possibilité d'annuler (undo toast 5 secondes) ?

□ SAVE → BACKEND :
  → Appel batch (un seul POST) ou un appel par produit (N+1) ?
  → Loading state pendant la sauvegarde ?
  → Si erreur partielle : quels produits ont été sauvés ? Lesquels non ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement]
```

---

## F6 — docling-pwa/src/pages/CataloguePage.jsx

```
Questions spécifiques — LISTE DE PRODUITS :

□ EMPTY STATES (DEUX CAS DISTINCTS) :
  → Catalogue vide (aucun produit) :
    Message : "Aucun produit dans votre catalogue"
    CTA : "Scanner une facture" → /scan
  → Filtres actifs + 0 résultats :
    Message : "Aucun résultat pour ces filtres"
    CTA : "Réinitialiser les filtres" (action directe, pas /catalogue)
  → Ces deux cas ont-ils des designs différents ?

□ FILTRES :
  → Persistance : sessionStorage (survit à la navigation, pas au close) ?
  → Chips visuels des filtres actifs avec × individuel pour retirer ?
  → "Réinitialiser tout" si au moins 1 filtre actif ?
  → Filtres combinés : famille ET fournisseur ET recherche ?
  → Debounce sur la recherche (300ms, pas de requête à chaque caractère) ?
  → Highlight du terme recherché dans les résultats (bold ou couleur) ?

□ VUE TABLEAU vs VUE CARTES :
  → Vue cartes : défaut sur mobile (< 640px) ?
  → Vue tableau : min-width forcé sur les colonnes → scroll horizontal ?
  → Préférence persistée (localStorage) ?
  → Transition fluide entre les deux vues ?

□ VIRTUALISATION :
  → @tanstack/react-virtual ou react-window utilisé ?
  → Si catalogue > 500 produits : scroll fluide sans lag ?
  → Container height fixe pour la virtualisation ?

□ PAGINATION / INFINITE SCROLL :
  → Cursor-based pagination (offset ne marche pas bien sur grands datasets) ?
  → "Charger plus" ou infinite scroll automatique ?
  → Indicateur "N produits sur N total" ?

□ TRI DES COLONNES :
  → Indicateur visuel asc/desc/none (icône, couleur) ?
  → Tri côté serveur ou client ? (serveur si > 1000 produits) ?
  → Colonne de tri sauvegardée entre les navigations ?

□ ACTIONS PAR PRODUIT :
  → Sur hover/focus : actions disponibles (Comparer, Ajouter au devis, Modifier, Supprimer) ?
  → Supprimer : confirmation avant action ?
  → "Ajouter au devis" : navigation vers DevisPage avec le produit pré-rempli (location.state) ?

□ SÉLECTION MULTIPLE (bulk actions) :
  → Checkbox par ligne ?
  → "Tout sélectionner" / "Désélectionner tout" ?
  → Actions bulk : Supprimer sélection, Exporter sélection ?

□ EXPORT :
  → CSV : headers en FR, encoding UTF-8 avec BOM (Excel FR) ?
  → Excel (xlsx) : colonnes formatées, pas juste du texte brut ?
  → Export de la sélection ou tout le catalogue ?

□ PERFORMANCE :
  → Pas de re-render de toute la liste quand 1 produit change ?
  → useCallback sur les handlers de ligne ?
  → Mémoïsation des filtres appliqués (useMemo) ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement — ce fichier est probablement > 300 lignes]
```

---

## F7 — docling-pwa/src/pages/DevisPage.jsx

```
Questions spécifiques — GÉNÉRATION PDF :

□ INITIALISATION :
  → TVA chargée depuis localStorage (clé 'settings') avec fallback 20% ?
  → Nom entreprise pré-rempli depuis settings ?
  → Produit pré-ajouté si location.state.product (depuis catalogue) ?

□ BROUILLON (AUTOSAVE) :
  → Sauvegarde automatique dans localStorage à chaque modification ?
  → Délai de sauvegarde : debounce 1s (pas à chaque keystroke) ?
  → Au chargement : banner "Brouillon restauré du DD/MM/YYYY" avec
    boutons "Continuer" et "Recommencer" ?
  → Suppression du brouillon après téléchargement du PDF ?

□ CALCULS — PRÉCISION CRITIQUE :
  Tester mentalement avec : 3 produits (100€, 250€, 75€), TVA 20%, remise 10%
    Total HT brut    = 425.00€
    Remise (10%)     = 42.50€
    Net HT           = 382.50€
    TVA (20%)        = 76.50€
    TTC              = 459.00€

  → Les calculs utilisent-ils toFixed(2) à la fin uniquement (pas intermédiaire) ?
  → Arrondi bancaire (0.5 arrondi vers le haut) ou arrondi standard ?
  → Erreur d'accumulation float ? (0.1 + 0.2 = 0.30000000000000004)
    → Solution : multiplier par 100, arrondir, diviser par 100

□ ÉDITION DES LIGNES :
  → Quantité : entier ou décimal (BTP peut avoir 1.5 jours) ?
  → Prix unitaire : 2 décimales minimum ?
  → Numéro de devis : incrémenté automatiquement ?
  → Suppression d'une ligne : pas de confirmation (undo toast) ?

□ PDF GÉNÉRÉ :
  → Logo entreprise inclus (si uploadé dans settings) ?
  → Mentions légales en pied de page ?
  → Numéro de devis, date, validité ?
  → SIRET, TVA intracommunautaire si renseignés ?
  → Tableau produits : colonnes lisibles, totaux en gras ?
  → Conditions de paiement si définies dans settings ?
  → Mise en page A4 correcte (marges respectées) ?

□ UX PDF :
  → Prévisualisation avant téléchargement ?
  → "Télécharger" ET "Ouvrir dans un onglet" ?
  → Nom du fichier : Devis_XXXX_Entreprise_YYYYMMDD.pdf ?

□ MULTI-TVA :
  → Taux unique (select) ou par ligne (complexe) ?
  → Si unique : 5.5%, 10%, 20% disponibles ?

ANALYSE COMPLÈTE :
  [AGENT: lire DevisPage.jsx ET devisGenerator.js/utils intégralement]
```

### Grille calculs DevisPage — vérification arithmétique

```
TESTER EN LISANT LE CODE — pas de supposition :

Scénario A : 1 produit, 100€, TVA 20%, pas de remise
  HT     = 100.00 → [code ligne N produit le ?]
  TVA    = 20.00  → [code ligne N calcule le ?]
  TTC    = 120.00 → [code ligne N calcule le ?]
  ✅ ou ❌

Scénario B : Remise + TVA
  Produits : 100€ + 250€ = 350€ HT
  Remise 15% = 52.50€
  Net HT = 297.50€
  TVA 20% = 59.50€
  TTC = 357.00€
  ✅ ou ❌

Scénario C : Précision float
  Produit : 99.99€ × 3 = 299.97€
  Résultat dans le code : [lire la ligne exacte]
  Erreur d'arrondi possible ? ✅ ou ❌
```

---

## F8 — docling-pwa/src/pages/HistoryPage.jsx

```
Questions spécifiques :

□ DONNÉES :
  → API appelée au montage (useEffect) ?
  → Loading state pendant le fetch ?
  → Pagination ou infinite scroll (historique peut être long) ?

□ AFFICHAGE :
  → Tri : plus récent en premier ?
  → Date dans le fuseau horaire local (pas UTC affiché brut) ?
  → Status : succès (vert), erreur (rouge), partiel (orange) visuellement distincts ?
  → Nombre de produits extraits par scan ?
  → Nom du fichier original ?

□ ACTIONS :
  → Supprimer un scan : confirmation + ce qui arrive aux produits du catalogue ?
  → Lien "Voir les produits" → catalogue filtré sur ce scan (si implémenté) ?
  → Télécharger le fichier original (si stocké) ?

□ EMPTY STATE :
  → Message clair + CTA "Scanner votre première facture" → /scan ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement]
```

---

## F9 — docling-pwa/src/pages/SettingsPage.jsx

```
Questions spécifiques :

□ INFORMATIONS ENTREPRISE :
  → Nom, SIRET, adresse, téléphone, email → utilisés dans le PDF ?
  → TVA : select (5.5% / 10% / 20%) sauvegardé en localStorage ?
  → Mentions légales : textarea libre, utilisé dans le PDF ?
  → Numérotation devis : préfixe (ex: "DEV-") + numéro suivant ?

□ LOGO :
  → Upload → converti en base64 → localStorage ?
  → Preview avant sauvegarde ?
  → Suppression du logo possible ?
  → Taille max du logo (éviter de crasher le localStorage avec une image 5Mo) ?
    localStorage max ≈ 5Mo → limiter le logo à 500Ko après redimensionnement ?

□ SAUVEGARDE :
  → À chaque changement (onChange/onBlur) ou bouton "Enregistrer" ?
  → Toast confirmation de sauvegarde ?
  → Feedback clair si localStorage plein (QuotaExceededError catchée) ?

□ MODÈLE IA :
  → Sélecteur de modèle Gemini ?
  → Sauvegarde côté backend (pas seulement localStorage) ?
  → Description de chaque modèle (vitesse vs précision) ?

□ DONNÉES RGPD :
  → "Exporter mes données" → JSON téléchargeable (produits + jobs + profil) ?
  → "Supprimer mon compte" → confirmation modal → DELETE /api/v1/me ?
  → Message clair sur ce qui est supprimé ?

□ IMPORT CATALOGUE :
  → CSV/Excel → validation du format avant import ?
  → Preview des N premières lignes avant confirmation ?
  → Gestion des doublons (skip, remplacer, créer doublon) ?

□ RESET :
  → "Vider le catalogue" → confirmation modale avec typing "CONFIRMER" ?
  → Distinguer "catalogue" (produits) et "historique" (jobs) ?

□ TEST DE CONNEXION API :
  → Bouton "Tester la connexion" → GET /health → résultat affiché ?
  → Affiche le ping en ms ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement]
```

### Checklist settings — exhaustivité

| Paramètre | Présent | Sauvegardé où | Utilisé par | Problème |
|-----------|---------|--------------|-------------|---------|
| Nom entreprise | | localStorage | PDF devis | |
| SIRET | | localStorage | PDF devis | |
| Logo | | localStorage (base64) | PDF devis | |
| TVA par défaut | | localStorage | DevisPage | |
| Mentions légales | | localStorage | PDF devis | |
| Préfixe devis | | localStorage | DevisPage | |
| Prochain n° devis | | localStorage | DevisPage | |
| Modèle IA | | backend | Orchestrateur | |
| Export RGPD | | — | — | |
| Import catalogue | | — | — | |
| Reset catalogue | | — | — | |
| Supprimer compte | | backend | — | |
| Test connexion | | — | — | |
| [AGENT: compléter] | | | | |

---

## F10 — LoginPage.jsx & RegisterPage.jsx

```
Questions spécifiques — FORMULAIRES AUTH :

□ VALIDATION :
  → onBlur (pas seulement onSubmit) sur chaque champ ?
  → Feedback visuel par champ : ✓ vert si valide, ✗ rouge si invalide ?
  → Messages d'erreur en dessous du champ concerné (pas dans un toast global) ?
  → Email : format valide (regex simple) ?
  → Password : longueur min 8 ? Indicateur de force ? (optionnel)
  → Confirm password : correspond au premier ? (Register)

□ UX :
  → Show/hide password toggle accessible (bouton avec aria-label) ?
  → Submit avec Enter sur n'importe quel champ (pas juste le bouton) ?
  → Loading state sur le bouton submit (disabled + spinner) ?
  → Pas de double-soumission possible ?

□ GESTION DES ERREURS :
  → 401 (login) : "Email ou mot de passe incorrect" (pas de distinction) ?
  → 409 (register) : "Cet email est déjà utilisé" ?
  → 422 (validation) : erreur par champ, pas un JSON brut ?
  → 503 (serveur down) : "Service temporairement indisponible" ?
  → Erreur réseau (offline) : "Vérifiez votre connexion" ?

□ REDIRECTION :
  → Login réussi → vers la page d'origine (from: location.state) ou /scan ?
  → Register réussi → auto-login + /scan ? Ou /login avec message ?

□ SÉCURITÉ :
  → Pas de token/password dans console.log ou Sentry ?
  → Rate limiting front : désactiver le bouton après 5 tentatives échouées ?
  → CSRF : X-Requested-With header ajouté par apiClient ?

ANALYSE COMPLÈTE :
  [AGENT: lire les deux fichiers intégralement]
```

---

## F11 — Navbar.jsx & Navigation

```
Questions spécifiques :

□ LIEN ACTIF :
  → Page courante mise en évidence visuellement (couleur, font-weight) ?
  → aria-current="page" sur le lien actif (accessibilité screen reader) ?
  → useLocation() de react-router (pas window.location) ?

□ BADGE DE VALIDATION :
  → Point animé (pulse) visible quand extractedProducts.length > 0 ?
  → Nombre de produits en attente affiché (badge count) ?
  → Disparaît quand la queue est vide ?

□ LOGO / TITRE :
  → Cliquable → /scan ?
  → aria-label="Accueil" sur le lien du logo ?

□ LOGOUT :
  → Clear du token/cookie ?
  → Clear du store Zustand (données utilisateur) ?
  → Redirection vers /login ?
  → Pas de données de l'utilisateur précédent si quelqu'un se reconnecte ?

□ RESPONSIVE :
  → Mobile (< 768px) : bottom navigation (plus ergonomique que top nav) ?
  → Desktop : sidebar ou top nav ? Cohérent sur toutes les pages ?
  → Safe area insets respectées sur iPhone (padding-bottom: env(safe-area-inset-bottom)) ?

□ ACCESSIBILITÉ :
  → <nav> avec aria-label="Navigation principale" ?
  → Icônes sans texte : aria-label sur chaque icône ?
  → Keyboard : Tab navigue dans tous les liens ?
  → Focus visible (outline pas supprimé) ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement]
```

---

## F12 — Composants réutilisables (src/components/)

```
Pour CHAQUE composant dans ce dossier :

[AGENT: lister tous les fichiers depuis la cartographie C5.2]

Format d'analyse par composant :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 [ComponentName.jsx] — N lignes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÔLE : [1 phrase]
PROPS : [liste des props avec types attendus]
UTILISÉ PAR : [pages/composants parents]

PROBLÈMES DÉTECTÉS :
  □ Props non documentées (PropTypes ou JSDoc absent) ?
  □ Props non utilisées (prop drilling inutile) ?
  □ Logique métier dans le composant (devrait être dans le parent ou un hook) ?
  □ Hard-coded strings (i18n futur impossible) ?
  □ Accessibilité : aria-*, rôles, keyboard ?
  □ Testé ? [Oui/Non]

SCORE : /10
PROBLÈME PRIORITAIRE : [ou "Aucun"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## F13 — Hooks personnalisés (src/hooks/)

```
Pour CHAQUE hook custom :

[AGENT: lister tous les hooks depuis la cartographie C5.8]

Pour chaque hook :
  → Respect des règles des hooks (nom commence par "use") ?
  → Retourne des valeurs stables (useCallback sur les fonctions retournées) ?
  → useEffect dépendances correctes (pas de eslint-disable-line) ?
  → Cleanup implémenté (event listeners, timers, subscriptions) ?
  → Testé en isolation (renderHook de @testing-library/react) ?

HOOKS MANQUANTS IDENTIFIÉS :
  □ useNetworkStatus() → isOnline, wasOffline
  □ useDebounce(value, delay) → pour la recherche catalogue
  □ useLocalStorage(key, defaultValue) → abstraction localStorage
  □ useAbortController() → AbortController avec cleanup automatique
  □ usePagination(fetchFn) → cursor-based pagination
  [AGENT: identifier quels hooks seraient utiles vs ceux déjà présents]
```

---

## F14 — vite.config.js

```
Questions spécifiques — CONFIGURATION BUILD :

□ PWA (vite-plugin-pwa) :
  → registerType: 'autoUpdate' ou 'prompt' ? (prompt = meilleure UX)
  → workbox.globPatterns couvre bien les assets JS/CSS/HTML ?
  → workbox.runtimeCaching : stratégies correctes ?
    - API calls → NetworkFirst (jamais CacheFirst pour les données)
    - Fonts/CDN → CacheFirst avec expiration longue
    - Assets statiques hashés → CacheFirst (immutable)
  → offlineFallback : /offline.html existe et est configuré ?
  → manifest.json : name, short_name, icons 192+512, display:standalone ?

□ BUILD OPTIMISATION :
  → manualChunks : les vendors lourds sont séparés ?
    ex: { 'pdf-vendor': ['jspdf', 'jspdf-autotable'], 'react-vendor': ['react', 'react-dom'] }
  → Pourquoi manualChunks ? Pour que le cache reste valide quand
    seul le code app change (pas les vendors)
  → target: 'esnext' ou 'es2020' (pas 'es5' inutile avec les browsers ciblés) ?
  → cssCodeSplit: true (CSS par chunk, pas un gros bundle) ?

□ SOURCE MAPS :
  → build.sourcemap: false en production (ne pas exposer le source) ?
  → build.sourcemap: true en développement (debugging) ?

□ PROXY DEV :
  → server.proxy : /api → http://localhost:8000 ?
  → Évite les problèmes CORS en développement ?

□ ALIAS :
  → resolve.alias: { '@': '/src' } pour les imports absolus ?

□ DEFINE :
  → Variables d'env correctement injectées ?

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement]
```

### Analyse des chunks du build

```bash
# Exécuter et documenter les résultats :
cd docling-pwa
npm run build 2>&1 | grep -E "dist/assets|\.js|\.css" | head -20

# Taille de chaque chunk (non gzippé)
ls -la dist/assets/*.js | awk '{printf "%s KB : %s\n", int($5/1024), $9}' | sort -rn

# Taille gzippée simulée (approximation)
for f in dist/assets/*.js; do
  orig=$(wc -c < "$f")
  echo "$(basename $f) : ${orig} bytes non-gzip"
done | sort -t: -k2 -rn | head -10
```

| Chunk | Taille (KB) | Taille gzip estimée (KB) | OK (< 500KB gz) | Action |
|-------|-------------|--------------------------|-----------------|--------|
| main/index | | | | |
| pdf-vendor | | | | |
| react-vendor | | | | |
| [AGENT: tous les chunks] | | | | |

---

## F15 — tailwind.config.js & postcss.config.js

```
□ CONTENT PATHS :
  → './src/**/*.{js,jsx,ts,tsx}' + './index.html' présents ?
  → Manquer un chemin = classes purgées qui cassent le build prod !
  → Vérifier que toutes les sources sont couvertes.

□ PURGE EN PRODUCTION :
  → Tailwind purge les classes non utilisées en prod automatiquement.
  → Classes dynamiques (ex: `text-${color}-500`) ne sont PAS purgées
    si elles sont construites dynamiquement → les safelist manuellement.
  → safelist configurée pour les classes dynamiques ?

□ THÈME CUSTOM :
  → Colors définies via CSS variables pour le support dark mode ?
    (ex: '--color-primary': 'rgb(var(--primary) / <alpha-value>)')
  → Ou via extend.colors avec des valeurs hardcodées ?

□ PLUGINS :
  → @tailwindcss/forms, @tailwindcss/typography, @tailwindcss/aspect-ratio :
    quels plugins sont utilisés vs installés ?
  → Plugins non utilisés = bundle légèrement plus lourd.

□ POSTCSS :
  → tailwindcss + autoprefixer : ordre correct (tailwind d'abord) ?
  → cssnano en production ? (minification CSS supplémentaire)

ANALYSE COMPLÈTE :
  [AGENT: lire les deux fichiers]
```

---

## F16 — src/index.css

```
□ VARIABLES CSS :
  → Design tokens définis : --color-*, --space-*, --radius-*, --font-* ?
  → Permet de changer le thème sans toucher Tailwind ?

□ LAYERS TAILWIND :
  → @layer base : resets et styles HTML élémentaires ?
  → @layer components : composants réutilisables (.btn, .card) ?
  → @layer utilities : utilities spécifiques au projet ?

□ SAFE AREAS PWA :
  → padding-bottom: env(safe-area-inset-bottom) sur les éléments fixes ?
  → padding-top: env(safe-area-inset-top) sur la top bar ?
  → Essentiel pour les iPhones avec encoche/Dynamic Island.

□ DUPLICATION :
  → Classes CSS custom qui dupliquent des utilities Tailwind ?
    (ex: .flex-center { display: flex; align-items: center } → 'flex items-center')
  → Ces doublons doivent être supprimés au profit du HTML Tailwind.

□ ANIMATIONS :
  → @keyframes définis dans index.css ou dans tailwind.config.js ?
  → Préférer tailwind.config.js pour les animations réutilisables.
  → Animations respectent prefers-reduced-motion ?
    @media (prefers-reduced-motion: reduce) { animation: none !important }

ANALYSE COMPLÈTE :
  [AGENT: lire intégralement]
```

---

## F17 — AUDIT ACCESSIBILITÉ GLOBAL

```
L'accessibilité n'est pas optionnelle. WCAG 2.1 AA minimum.
Un produit inaccessible est un produit qui exclut des utilisateurs.

CHECKLIST CRITIQUE PAR PAGE :
```

```bash
# Vérifications automatisées (si Playwright disponible)
# Exécuter sur l'app buildée (npm run preview)

# 1. Boutons sans texte ni aria-label (kritisch)
document.querySelectorAll('button, a').forEach(el => {
  const hasText = el.textContent.trim().length > 0
  const hasAriaLabel = el.getAttribute('aria-label')
  const hasAriaLabelledBy = el.getAttribute('aria-labelledby')
  if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
    console.error('ÉLÉMENT NON ACCESSIBLE:', el.outerHTML)
  }
})
# → Résultat attendu : aucun log

# 2. Images sans alt
document.querySelectorAll('img').forEach(img => {
  if (!img.hasAttribute('alt')) console.error('IMG SANS ALT:', img.src)
})

# 3. Inputs sans label associé
document.querySelectorAll('input, select, textarea').forEach(el => {
  const id = el.id
  const hasLabel = id && document.querySelector(`label[for="${id}"]`)
  const hasAriaLabel = el.getAttribute('aria-label')
  if (!hasLabel && !hasAriaLabel) console.error('INPUT SANS LABEL:', el.outerHTML)
})
```

### Checklist accessibilité par page

| Page | Boutons aria-label | Inputs avec label | Focus visible | Keyboard nav | Contraste WCAG AA | Score |
|------|--------------------|------------------|--------------|-------------|-------------------|-------|
| /scan | | | | | | /10 |
| /validation | | | | | | /10 |
| /catalogue | | | | | | /10 |
| /devis | | | | | | /10 |
| /historique | | | | | | /10 |
| /settings | | | | | | /10 |
| /login | | | | | | /10 |
| /register | | | | | | /10 |

### Vérification contraste manuel

| Combinaison couleurs | Ratio calculé | WCAG AA (4.5:1) | OK |
|---------------------|--------------|-----------------|-----|
| Texte principal sur fond fond | N:1 | 4.5:1 min | |
| Texte secondaire (slate-400) sur fond sombre | N:1 | 4.5:1 min | |
| Bouton primaire : texte sur fond accent | N:1 | 4.5:1 min | |
| Badge confidence low (rouge) | N:1 | 3:1 min (UI) | |
| [AGENT: vérifier chaque combinaison] | | | |

---

## F18 — SERVICE WORKER & PWA OFFLINE

```
Questions spécifiques — COMPORTEMENT OFFLINE :

□ STRATÉGIES DE CACHE :
  → API /api/v1/* : NetworkFirst (essaie le réseau, fallback cache) ?
  → Assets JS/CSS/HTML : CacheFirst avec versioning (hash dans le nom) ?
  → Fonts externes : CacheFirst avec expiration 1 an ?

□ OFFLINE FALLBACK :
  → Page /offline.html avec message clair ?
  → Ou fallback inline dans le SW (plus propre) ?
  → L'utilisateur sait-il qu'il est offline ? (badge dans la navbar) ?

□ MISE À JOUR :
  → Quand une nouvelle version est déployée :
    → Le SW se met à jour en background ?
    → L'utilisateur est notifié ("Une mise à jour est disponible. Recharger ?") ?
    → Pas de mise à jour silencieuse qui casse une session active ?

□ INSTALLABILITÉ :
  → beforeinstallprompt intercepté et stocké ?
  → Bouton "Installer l'app" affiché dans les settings ou après utilisation ?
  → Critères d'installabilité respectés (HTTPS, SW, manifest) ?

□ INDEXEDDB (queue offline) :
  → Schéma de la BDD documenté ?
  → Upgrade function correcte si version change ?
  → Erreurs d'accès à IDB catchées proprement ?
  → Nettoyage automatique des entrées traitées ?
```

---

## F19 — ANALYSE .eslintrc / eslint.config.js

```bash
cat docling-pwa/.eslintrc.* 2>/dev/null || \
cat docling-pwa/eslint.config.js 2>/dev/null || \
cat docling-pwa/eslint.config.mjs 2>/dev/null
```

```
Règles minimales attendues pour React moderne :

□ plugin:react/recommended (ou react/jsx-runtime pour React 17+) ?
□ plugin:react-hooks/recommended — CRITIQUE pour détecter les deps manquantes ?
□ no-unused-vars : error ?
□ no-console : warn (autoriser en dev, bloquer en prod via CI) ?
□ jsx-a11y : pour l'accessibilité ?
□ eslint:recommended : règles JS de base ?
□ react/prop-types : warn ou off (si TypeScript) ?

RÈGLES MANQUANTES CRITIQUES :
  [AGENT: lister les règles absentes de la config actuelle]
```

---

## SCORECARD FRONTEND

| Fichier/Domaine | Score /10 | Problèmes 🔴 | Problèmes 🟠 | Problèmes 🟡 | Notes |
|-----------------|-----------|-------------|-------------|-------------|-------|
| App.jsx | | | | | |
| useStore.js | | | | | |
| apiClient.js | | | | | |
| ScanPage.jsx | | | | | |
| ValidationPage.jsx | | | | | |
| CataloguePage.jsx | | | | | |
| DevisPage.jsx | | | | | |
| HistoryPage.jsx | | | | | |
| SettingsPage.jsx | | | | | |
| LoginPage.jsx | | | | | |
| RegisterPage.jsx | | | | | |
| Navbar.jsx | | | | | |
| Composants réutilisables | | | | | |
| Hooks customs | | | | | |
| vite.config.js | | | | | |
| tailwind.config.js | | | | | |
| index.css | | | | | |
| Accessibilité global | | | | | |
| PWA / Service Worker | | | | | |
| ESLint config | | | | | |
| **MOYENNE** | **X/10** | **TOTAL** | **TOTAL** | **TOTAL** | |

---

## LISTE EXHAUSTIVE DES PROBLÈMES FRONTEND

```
Format obligatoire pour chaque problème :

[F-001] 🔴 FATAL
  Fichier   : [chemin/fichier.jsx]:[ligne]
  Problème  : [description précise de ce qui est cassé]
  Impact    : [crash / XSS / data loss / RGPD / inaccessible]
  Repro     : [comment reproduire le problème]
  Fix       : [code corrigé COMPLET du composant ou de la section]
  Vérifié   : [commande ou étape pour confirmer que c'est corrigé]

[F-002] 🟠 CRITIQUE
  ...

[F-XXX] 🔵 MINEUR
  ...
```

---

## ✅ GATE F — FRONTEND

```bash
cd docling-pwa

# 1. ESLint — zéro erreur bloquante
npm run lint 2>&1 | tee /tmp/eslint_gate.txt
eslint_errors=$(grep " error " /tmp/eslint_gate.txt | wc -l)
echo "ESLint erreurs : $eslint_errors"
# → Objectif : 0

# 2. Build propre — zéro erreur
npm run build 2>&1 | tee /tmp/build_gate.txt
build_errors=$(grep -ci "error\|failed" /tmp/build_gate.txt || echo 0)
echo "Build erreurs : $build_errors"
ls -la dist/assets/*.js 2>/dev/null | wc -l
# → Objectif : 0 erreur, chunks générés

# 3. Bundle size — vérifier les chunks lourds
ls -la dist/assets/*.js | awk '{print int($5/1024)"KB", $9}' | sort -rn | head -5
# → Objectif : aucun chunk > 500KB non-gzip

# 4. Tests
npm run test -- --run 2>&1 | tee /tmp/vitest_gate.txt
test_fails=$(grep -c "FAIL\b" /tmp/vitest_gate.txt || echo 0)
echo "Tests failed : $test_fails"
# → Objectif : 0 FAIL

# 5. Accessibilité — boutons sans label
# (avec app running sur :5173)
# npx playwright test --project=chromium e2e/a11y.spec.js
# → 0 violation critique

# 6. Zero problèmes 🔴 et 🟠
echo "Problèmes FATAL : [à remplir depuis la liste ci-dessus]"
echo "Problèmes CRITIQUE : [à remplir depuis la liste ci-dessus]"

PASS si :
  → ESLint : 0 erreur bloquante (warnings acceptés)
  → Build : 0 erreur, tous les chunks générés
  → Tests : 0 fail
  → Aucun chunk > 500KB non-gzip (ou justifié)
  → 0 problème 🔴
  → 0 problème 🟠

FAIL si l'un des critères n'est pas atteint.

STATUS : [ ] PASS  [ ] FAIL

→ Si PASS : continuer vers 05_BASE_DE_DONNEES.md
→ Si FAIL : corriger les problèmes 🔴 et 🟠, relancer le gate
```