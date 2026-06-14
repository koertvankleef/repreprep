import { beforeEach, describe, expect, test } from 'vitest'
import { initLocale, resolveLocale, t, tPlural } from '../i18n/index.ts'

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

  test('selects pluralized English message by count', () => {
    expect(tPlural('message.routine.exerciseCount', 1)).toBe('1 exercise')
    expect(tPlural('message.routine.exerciseCount', 2)).toBe('2 exercises')
  })

  test('selects pluralized Dutch message by count', () => {
    initLocale('nl-NL')
    expect(tPlural('message.routine.exerciseCount', 1)).toBe('1 oefening')
    expect(tPlural('message.routine.exerciseCount', 2)).toBe('2 oefeningen')
  })
})
