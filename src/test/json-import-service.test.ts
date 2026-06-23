import { describe, expect, test } from 'vitest'
import { isValidAppData } from '../import-export/json-import-service.ts'

describe('json-import-service', () => {
  test('isValidAppData returns false for null', () => {
    expect(isValidAppData(null)).toBe(false)
  })

  test('isValidAppData returns false for missing schemaVersion', () => {
    expect(isValidAppData({ exercises: [], workouts: [], routines: [], routineVersions: [] })).toBe(false)
  })

  test('isValidAppData returns false for missing exercises', () => {
    expect(isValidAppData({ schemaVersion: 2, workouts: [], routines: [], routineVersions: [] })).toBe(false)
  })

  test('isValidAppData returns false for non-array exercises', () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: {}, workouts: [], routines: [], routineVersions: [] })).toBe(false)
  })

  test('isValidAppData returns false for missing workouts', () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: [], routines: [], routineVersions: [] })).toBe(false)
  })

  test('isValidAppData returns false for missing routines', () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: [], workouts: [], routineVersions: [] })).toBe(false)
  })

  test('isValidAppData returns false for missing routineVersions', () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: [], workouts: [], routines: [] })).toBe(false)
  })

  test('isValidAppData returns true for valid minimal current AppData', () => {
    expect(isValidAppData({ schemaVersion: 4, exercises: [], workouts: [], routines: [], routineVersions: [] })).toBe(true)
  })
})
