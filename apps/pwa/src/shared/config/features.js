export const FEATURES = {
  AUTH_REQUIRED: import.meta.env.VITE_AUTH_REQUIRED !== 'false',
  /** Bouton Google OAuth (désactiver avec VITE_AUTH_GOOGLE_ENABLED=false) */
  AUTH_GOOGLE_ENABLED: import.meta.env.VITE_AUTH_GOOGLE_ENABLED !== 'false',
  /** Redirection /onboarding si `/me` renvoie onboarding_completed: false — actif en build prod par défaut ; désactiver avec VITE_AUTH_ONBOARDING_V2=false */
  AUTH_ONBOARDING_V2:
    import.meta.env.VITE_AUTH_ONBOARDING_V2 === 'true' ||
    (import.meta.env.PROD && import.meta.env.VITE_AUTH_ONBOARDING_V2 !== 'false'),
  /** Statut job scan via SSE (GET .../status/{id}/stream) ; repli : polling */
  JOB_SSE: import.meta.env.VITE_JOB_SSE === 'true',
  /**
   * Aligné sur l’API `SCAN_JOB_EXECUTION` (affichage uniquement).
   * Définir `VITE_SCAN_JOB_EXECUTION=queue` si le backend traite en file d’attente.
   */
  SCAN_JOB_EXECUTION: (import.meta.env.VITE_SCAN_JOB_EXECUTION || 'inline').toLowerCase(),
}
