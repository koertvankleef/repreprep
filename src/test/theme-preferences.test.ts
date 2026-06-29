import { afterEach, describe, expect, test } from 'vitest'
import { applyDisplayPreferences } from '../app/theme-preferences.ts'

afterEach(() => {
  const root = document.documentElement
  delete root.dataset.theme
  delete root.dataset.themeMode
  delete root.dataset.contrast
  root.style.removeProperty('color-scheme')
})

describe('display preference token composition', () => {
  test('keeps high-contrast light mode light', () => {
    applyDisplayPreferences({ theme: 'light', contrast: 'high' })

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  test('keeps high-contrast dark mode dark', () => {
    applyDisplayPreferences({ theme: 'dark', contrast: 'high' })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
