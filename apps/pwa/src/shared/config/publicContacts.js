/**
 * E-mails affichés côté public (mentions, tarifs, accessibilité).
 * Surcharge via .env : VITE_PUBLIC_CONTACT_EMAIL, VITE_PUBLIC_ACCESSIBILITY_EMAIL
 */
export function getPublicContactEmail() {
  const v = import.meta.env.VITE_PUBLIC_CONTACT_EMAIL
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : 'contact@docling.app'
}

export function getAccessibilityContactEmail() {
  const v = import.meta.env.VITE_PUBLIC_ACCESSIBILITY_EMAIL
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : getPublicContactEmail()
}

/**
 * Remplace les adresses génériques dans les textes légaux par les valeurs configurées.
 */
export function injectLegalContactPlaceholders(text) {
  if (typeof text !== 'string') return text
  let s = text
  s = s.replace(/accessibilite@docling\.app/g, getAccessibilityContactEmail())
  s = s.replace(/contact@docling\.app/g, getPublicContactEmail())
  return s
}
