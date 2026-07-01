import { beforeEach, describe, expect, test } from 'vitest'
import {
  applyLanguagePreference,
  clearLanguagePreference,
  loadLanguagePreference,
  saveLanguagePreference,
} from '../app/language-preferences.ts'
import { getLocale } from '../i18n/index.ts'

describe('language preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('defaults to automatic browser locale selection', () => {
    expect(loadLanguagePreference()).toBe('auto')
  })

  test('persists a supplied locale', () => {
    saveLanguagePreference('nl-NL')

    expect(loadLanguagePreference()).toBe('nl-NL')

    clearLanguagePreference()
    expect(loadLanguagePreference()).toBe('auto')
  })

  test('applies a supplied locale and updates the document language', () => {
    applyLanguagePreference('nl-NL')

    expect(getLocale()).toBe('nl-NL')
    expect(document.documentElement.lang).toBe('nl-NL')
  })
})
