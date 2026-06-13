import { describe, expect, test } from 'vitest'
import { isValidAppData } from '../import-export/json-import-service.ts'

describe('json-import-service', () => {
  test('isValidAppData returns false for null', () => {
    expect(isValidAppData(null)).toBe(false)
  })

  test('isValidAppData returns false for missing schemaVersion', () => {
    expect(isValidAppData({ exercises: [], workouts: [] })).toBe(false)
  })

  test('isValidAppData returns false for missing exercises', () => {
    expect(isValidAppData({ schemaVersion: 1, workouts: [] })).toBe(false)
  })

  test('isValidAppData returns false for non-array exercises', () => {
    expect(isValidAppData({ schemaVersion: 1, exercises: {}, workouts: [] })).toBe(false)
  })

  test('isValidAppData returns false for missing workouts', () => {
    expect(isValidAppData({ schemaVersion: 1, exercises: [] })).toBe(false)
  })

  test('isValidAppData returns true for valid minimal AppData', () => {
    expect(isValidAppData({ schemaVersion: 1, exercises: [], workouts: [] })).toBe(true)
  })
})
