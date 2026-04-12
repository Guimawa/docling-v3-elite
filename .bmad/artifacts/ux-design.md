# UX DESIGN — DOCLING V3 (ELITE)

## 1. User Journey Map
| Étape | Action | Émotion | Friction |
| :--- | :--- | :--- | :--- |
| **Capture (Terrain)** | Pose la facture devant l'app | Focalisation | Reflets/Ombres |
| **Silent Feedback** | Vibration (Haptic Pulse) | Confirmation | Doute (Est-ce parti ?) |
| **Deep Analysis** | L'IA Gemini traite sur le Cloud | Tranquillité | Attente asynchrone |
| **Insight (Bureau)** | Reçoit l'alerte Atlas : "Tu as payé 10% trop cher" | Surprise/Intérêt | Négociation future |

## 2. Architecture de l'Information
- **Mobile: The Lens**
  - Caméra (Viseur auto).
  - Quick Vault (Historique des 3 derniers scans).
- **Web: Aurora Dashboard**
  - **The Pilot** (Barre de recherche sémantique Voix/Texte).
  - **The Atlas View** (Grille de comparaison de prix).
  - **The Vault** (Explorateur de fichiers intelligent).

## 3. Patterns UX & Thèmes
- **Mode Crystal (Mobile)** : Blanc pur, typographie Outfit (Google Fonts), icônes minimalistes (Iconsax).
- **Mode Aurora (Web)** : Gradiants bleus/ambres, flous d'arrière-plan, widgets flottants.

## 4. Micro-interactions Clès
1. **The Ghost Capture** : Lors de l'auto-capture, l'image semble "aspirée" vers le haut.
2. **Haptic Validation** : Vibration courte (70ms) pour "Bords trouvés", Longue (200ms) pour "Téléchargé".
3. **Atlas Shimmer** : Les prix les plus bas scintillent légèrement dans la liste.

## 5. Accessibilité
- Commande vocale "Scan" pour les situations où les mains sont occupées.
- Contrastes élevés (4.5:1 min) pour lecture en extérieur.

## 6. Métriques UX
- **Time to Value** : Temps entre l'ouverture de l'app et la fin de l'upload.
- **Error Rate** : Nombre de fois où l'utilisateur doit corriger manuellement une donnée Gemini.
