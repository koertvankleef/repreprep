import {
  applyDisplayPreferences,
  clearDisplayPreferences,
  loadDisplayPreferences,
  saveDisplayPreferences,
  watchSystemThemePreference,
  type ContrastMode,
  type DisplayPreferences,
  type ThemeMode,
} from './theme-preferences.ts'
import {
  applyLanguagePreference,
  clearLanguagePreference,
  loadLanguagePreference,
  saveLanguagePreference,
  type LanguagePreference,
} from './language-preferences.ts'

export class AppPreferencesController {
  private displayPreferencesValue: DisplayPreferences = loadDisplayPreferences()
  private languagePreferenceValue: LanguagePreference = loadLanguagePreference()
  private stopWatchingSystemThemePreference: (() => void) | null = null

  get displayPreferences(): DisplayPreferences {
    return this.displayPreferencesValue
  }

  get languagePreference(): LanguagePreference {
    return this.languagePreferenceValue
  }

  start(): void {
    this.stop()
    applyDisplayPreferences(this.displayPreferencesValue)
    applyLanguagePreference(this.languagePreferenceValue)
    this.stopWatchingSystemThemePreference = watchSystemThemePreference(() => {
      if (this.displayPreferencesValue.theme !== 'auto') {
        return
      }

      applyDisplayPreferences(this.displayPreferencesValue)
    })
  }

  stop(): void {
    this.stopWatchingSystemThemePreference?.()
    this.stopWatchingSystemThemePreference = null
  }

  reset(): void {
    clearDisplayPreferences()
    clearLanguagePreference()
    this.displayPreferencesValue = loadDisplayPreferences()
    this.languagePreferenceValue = loadLanguagePreference()
    applyDisplayPreferences(this.displayPreferencesValue)
    applyLanguagePreference(this.languagePreferenceValue)
  }

  setThemeMode(theme: ThemeMode): boolean {
    if (this.displayPreferencesValue.theme === theme) {
      return false
    }

    this.displayPreferencesValue = {
      ...this.displayPreferencesValue,
      theme,
    }

    this.applyAndPersistDisplayPreferences()
    return true
  }

  setContrastMode(contrast: ContrastMode): boolean {
    if (this.displayPreferencesValue.contrast === contrast) {
      return false
    }

    this.displayPreferencesValue = {
      ...this.displayPreferencesValue,
      contrast,
    }

    this.applyAndPersistDisplayPreferences()
    return true
  }

  setLanguagePreference(language: LanguagePreference): boolean {
    if (this.languagePreferenceValue === language) {
      return false
    }

    this.languagePreferenceValue = language
    applyLanguagePreference(language)
    saveLanguagePreference(language)
    return true
  }

  private applyAndPersistDisplayPreferences(): void {
    applyDisplayPreferences(this.displayPreferencesValue)
    saveDisplayPreferences(this.displayPreferencesValue)
  }
}
