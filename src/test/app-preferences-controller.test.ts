import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AppPreferencesController } from '../app/app-preferences-controller.ts'

function installMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

describe('app preferences controller', () => {
  beforeEach(() => {
    localStorage.clear()
    installMatchMedia(false)
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-mode')
    document.documentElement.removeAttribute('data-contrast')
    document.documentElement.lang = ''
  })

  test('starts by applying stored display and language preferences', () => {
    localStorage.setItem('rrr-display-preferences-v1', JSON.stringify({ theme: 'dark', contrast: 'high' }))
    localStorage.setItem('rrr-language-preference-v1', 'nl-NL')

    const controller = new AppPreferencesController()
    controller.start()

    expect(document.documentElement.dataset.themeMode).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(document.documentElement.lang).toBe('nl-NL')
  })

  test('persists display and language changes', () => {
    const controller = new AppPreferencesController()

    expect(controller.setThemeMode('dark')).toBe(true)
    expect(controller.setContrastMode('high')).toBe(true)
    expect(controller.setLanguagePreference('nl-NL')).toBe(true)
    expect(controller.setLanguagePreference('nl-NL')).toBe(false)

    expect(JSON.parse(localStorage.getItem('rrr-display-preferences-v1') ?? '{}')).toEqual({
      theme: 'dark',
      contrast: 'high',
    })
    expect(localStorage.getItem('rrr-language-preference-v1')).toBe('nl-NL')
  })

  test('reset clears stored preferences and reapplies defaults', () => {
    localStorage.setItem('rrr-display-preferences-v1', JSON.stringify({ theme: 'dark', contrast: 'high' }))
    localStorage.setItem('rrr-language-preference-v1', 'nl-NL')
    const controller = new AppPreferencesController()

    controller.reset()

    expect(localStorage.getItem('rrr-display-preferences-v1')).toBeNull()
    expect(localStorage.getItem('rrr-language-preference-v1')).toBeNull()
    expect(controller.displayPreferences).toEqual({ theme: 'auto', contrast: 'normal' })
    expect(controller.languagePreference).toBe('auto')
  })
})
