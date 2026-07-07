import { describe, expect, test } from 'vitest'
import { isValidAppData } from '../import-export/json-import-service.ts'
import { createDefaultData } from '../domain/create-default-data.ts'
import { specIt } from './helpers.ts'

describe('json-import-service', () => {
  specIt('isValidAppData returns false for null', ['DATA-VALID-002'], () => {
    expect(isValidAppData(null)).toBe(false)
  })

  specIt('isValidAppData returns false for missing schemaVersion', ['DATA-VALID-002'], () => {
    expect(isValidAppData({ exercises: [], workouts: [], routines: [], routineVersions: [] })).toBe(false)
  })

  specIt('isValidAppData returns false for missing exercises', ['DATA-VALID-002'], () => {
    expect(isValidAppData({ schemaVersion: 2, workouts: [], routines: [], routineVersions: [] })).toBe(false)
  })

  specIt('isValidAppData returns false for non-array exercises', ['DATA-VALID-003'], () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: {}, workouts: [], routines: [], routineVersions: [] })).toBe(false)
  })

  specIt('isValidAppData returns false for missing workouts', ['DATA-VALID-002'], () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: [], routines: [], routineVersions: [] })).toBe(false)
  })

  specIt('isValidAppData returns false for missing routines', ['DATA-VALID-002'], () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: [], workouts: [], routineVersions: [] })).toBe(false)
  })

  specIt('isValidAppData returns false for missing routineVersions', ['DATA-VALID-002'], () => {
    expect(isValidAppData({ schemaVersion: 2, exercises: [], workouts: [], routines: [] })).toBe(false)
  })

  specIt('isValidAppData returns true for valid minimal current AppData', ['DATA-VALID-001'], () => {
    expect(isValidAppData({ schemaVersion: 7, exercises: [], workouts: [], routines: [], routineVersions: [] })).toBe(true)
  })

  specIt('isValidAppData rejects a routine exercise with zero sets', ['DATA-VALID-004'], () => {
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

  specIt('isValidAppData rejects the complete import when one entry is invalid', ['DATA-VALID-006'], () => {
    const data = createDefaultData()
    const validVersion = data.routineVersions[0]!
    const invalidVersion = {
      ...validVersion,
      id: 'invalid-version',
      exercises: validVersion.exercises.map((exercise, index) =>
        index === 0 ? { ...exercise, setCount: 0 } : exercise),
    }

    expect(isValidAppData({
      ...data,
      routineVersions: [validVersion, invalidVersion],
    })).toBe(false)
  })

  specIt('isValidAppData requires persisted workout completion state', ['DATA-VALID-005'], () => {
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

  test('isValidAppData rejects duplicate top-level ids', () => {
    const data = createDefaultData()

    expect(isValidAppData({
      ...data,
      exercises: [data.exercises[0]!, data.exercises[0]!],
    })).toBe(false)
  })

  test('isValidAppData rejects routines without a matching active version', () => {
    const data = createDefaultData()

    expect(isValidAppData({
      ...data,
      routines: data.routines.map((routine) => ({
        ...routine,
        activeVersionId: 'missing-version',
      })),
    })).toBe(false)
  })

  test('isValidAppData rejects routine versions with missing exercise references', () => {
    const data = createDefaultData()
    const version = data.routineVersions[0]!

    expect(isValidAppData({
      ...data,
      routineVersions: [{
        ...version,
        exercises: version.exercises.map((exercise, index) =>
          index === 0 ? { ...exercise, exerciseId: 'missing-exercise' } : exercise),
      }],
    })).toBe(false)
  })

  test('isValidAppData rejects invalid routine prefill source pointers', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const workout = {
      id: 'workout-1',
      date: '2026-07-04',
      notes: '',
      exercises: [],
      completedAt: null,
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      routineId: routine.id,
      routineVersionId: routine.activeVersionId,
    }

    expect(isValidAppData({
      ...data,
      workouts: [workout],
      routines: [{ ...routine, prefillSourceWorkoutId: workout.id }],
    })).toBe(false)

    expect(isValidAppData({
      ...data,
      workouts: [{ ...workout, completedAt: '2026-07-04T10:30:00.000Z' }],
      routines: [{ ...routine, prefillSourceWorkoutId: workout.id }],
    })).toBe(true)
  })

  test('isValidAppData rejects workout routine-exercise links outside its routine version', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const version = data.routineVersions[0]!
    const routineExercise = version.exercises[0]!

    const workout = {
      id: 'workout-1',
      date: '2026-07-04',
      notes: '',
      exercises: [{
        id: 'entry-1',
        exerciseId: routineExercise.exerciseId,
        routineExerciseId: 'missing-routine-exercise',
        sets: [],
        notes: '',
      }],
      completedAt: null,
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      routineId: routine.id,
      routineVersionId: version.id,
    }

    expect(isValidAppData({
      ...data,
      workouts: [workout],
    })).toBe(false)
  })
})
