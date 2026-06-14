import { beforeEach, describe, expect, test } from 'vitest'
import { initLocale, resolveLocale, t } from '../i18n/index.ts'

describe('i18n runtime', () => {
  beforeEach(() => {
    initLocale('en-US')
  })

  test('falls back to en-US for unsupported locale', () => {
    expect(resolveLocale('fr-FR')).toBe('en-US')
  })

  test('resolves Dutch locale when browser language is Dutch', () => {
    expect(resolveLocale('nl-NL')).toBe('nl-NL')
    expect(resolveLocale('nl')).toBe('nl-NL')
  })

  test('returns translated message for known key', () => {
    expect(t('exercise.title')).toBe('Exercises')
  })

  test('throws on missing key', () => {
    expect(() => t('exercise.missing.key')).toThrowError('Missing i18n message key')
  })

  test('throws when required placeholders are missing', () => {
    expect(() => t('exercise.status.created')).toThrowError('Missing i18n placeholder')
  })

  test('interpolates placeholder values', () => {
    expect(t('exercise.status.created', { name: 'Pull-up' })).toBe('Created exercise Pull-up.')
  })

  test('returns Dutch translation after Dutch locale init', () => {
    initLocale('nl-NL')
    expect(t('exercise.title')).toBe('Oefeningen')
  })
})
