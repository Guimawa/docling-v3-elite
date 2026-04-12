import { useEffect, useState } from 'react'
import { CHANGE_EVENT, getPublicLanguage } from './publicI18n'
import { fr } from './locales/fr'
import { es } from './locales/es'
import { ca } from './locales/ca'

const INTERPOLATE_RE = /\{(\w+)\}/g

const APP_TRANSLATIONS = {
  fr,
  es,
  ca,
}

function pickLanguage() {
  const lang = getPublicLanguage()
  return APP_TRANSLATIONS[lang] ? lang : 'fr'
}

/**
 * Hook d'internationalisation pour l'application PWA.
 * Synchronisé avec le langage public sélectionné dans la landing/footer.
 */
export function useAppI18n() {
  const [lang, setLang] = useState(pickLanguage)

  useEffect(() => {
    const onLocalEvent = (event) => {
      const next = event.detail
      setLang(APP_TRANSLATIONS[next] ? next : 'fr')
    }
    const onStorage = () => {
      setLang(pickLanguage())
    }
    window.addEventListener(CHANGE_EVENT, onLocalEvent)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onLocalEvent)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return APP_TRANSLATIONS[lang] || APP_TRANSLATIONS.fr
}

/**
 * Ututilitaire d'interpolation de chaînes (ex: "Salut {name}")
 */
export function interpolate(template, vars = {}) {
  if (!template) return ''
  return template.replace(INTERPOLATE_RE, (_, key) => String(vars[key] ?? ''))
}
