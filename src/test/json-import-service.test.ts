import { describe, expect, test } from 'vitest'
import { isValidAppData } from '../import-export/json-import-service.ts'
import { createDefaultData } from '../domain/create-default-data.ts'

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
    expect(isValidAppData({ schemaVersion: 7, exercises: [], workouts: [], routines: [], routineVersions: [] })).toBe(true)
  })

  test('isValidAppData rejects a routine exercise with zero sets', () => {
    const data = createDefaultData()
    const version = data.routineVersions[0]!
    const invalid = {
      ...data,
      routineVersions: [{
        ...version,
        exercises: version.exercises.map((exercise, index) =>
          index === 0 ? { ...exercise, setCount: 0 } : exercise),
      }],
    }

    expect(isValidAppData(invalid)).toBe(false)
  })

  test('isValidAppData requires persisted workout completion state', () => {
    const data = createDefaultData()
    const invalidWorkout = {
      id: 'workout-1',
      date: '2026-07-04',
      notes: '',
      exercises: [],
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
    }

    expect(isValidAppData({ ...data, workouts: [invalidWorkout] })).toBe(false)
    expect(isValidAppData({
      ...data,
      workouts: [{ ...invalidWorkout, completedAt: null }],
    })).toBe(true)
  })
})
