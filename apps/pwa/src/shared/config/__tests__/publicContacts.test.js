import { describe, expect, it } from 'vitest'
import { getAccessibilityContactEmail, getPublicContactEmail, injectLegalContactPlaceholders } from '../publicContacts'

describe('publicContacts', () => {
  it('retourne le défaut si aucune variable', () => {
    expect(getPublicContactEmail()).toMatch(/@/)
    expect(getAccessibilityContactEmail()).toBe(getPublicContactEmail())
  })

  it('injectLegalContactPlaceholders aligne les adresses sur getPublicContactEmail', () => {
    const pub = getPublicContactEmail()
    const acc = getAccessibilityContactEmail()
    expect(injectLegalContactPlaceholders('A: contact@docling.app')).toBe(`A: ${pub}`)
    expect(injectLegalContactPlaceholders('B: accessibilite@docling.app')).toBe(`B: ${acc}`)
  })
})
