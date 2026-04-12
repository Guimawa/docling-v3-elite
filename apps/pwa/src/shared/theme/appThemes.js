/** Identifiants persistés (localStorage) — alignés sur [data-theme] dans index.css */
export const APP_THEME_IDS = /** @type {const} */ (['ivory', 'aurora', 'studio'])

/** @param {unknown} id */
export function isAppThemeId(id) {
  return typeof id === 'string' && APP_THEME_IDS.includes(id)
}

export const DEFAULT_APP_THEME = 'aurora'
