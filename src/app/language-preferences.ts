import { initLocale, type LocaleCode } from '../i18n/index.ts'

export type LanguagePreference = 'auto' | LocaleCode

const storageKey = 'rrr-language-preference-v1'
const defaultPreference: LanguagePreference = 'auto'

function isLanguagePreference(value: string): value is LanguagePreference {
  return value === 'auto' || value === 'en-US' || value === 'nl-NL'
}

export function loadLanguagePreference(): LanguagePreference {
  if (typeof localStorage === 'undefined') {
    return defaultPreference
  }

  const value = localStorage.getItem(storageKey)
  return value && isLanguagePreference(value) ? value : defaultPreference
}

export function saveLanguagePreference(preference: LanguagePreference): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(storageKey, preference)
}

export function clearLanguagePreference(): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(storageKey)
}

export function applyLanguagePreference(preference: LanguagePreference): LocaleCode {
  const locale = initLocale(preference === 'auto' ? navigator.language : preference)
  document.documentElement.lang = locale
  return locale
}
