import { describe, expect, test } from 'vitest'
import { migrateRawToAppData } from '../storage/local-storage-adapter.ts'
import { isValidAppData } from '../import-export/json-import-service.ts'
import { createDefaultData } from '../domain/create-default-data.ts'

describe('migration', () => {
  test('migrateRawToAppData returns null for null', () => {
    expect(migrateRawToAppData(null)).toBeNull()
  })

  test('migrateRawToAppData returns null for missing schemaVersion', () => {
    expect(migrateRawToAppData({ exercises: [], workouts: [] })).toBeNull()
  })

  test('migrateRawToAppData migrates v1 data to current schema with empty routines and routineVersions', () => {
    const v1Data = {
      schemaVersion: 1,
      exercises: [],
      workouts: [],
    }
    const result = migrateRawToAppData(v1Data)

    expect(result).not.toBeNull()
    expect(result?.schemaVersion).toBe(5)
    expect(result?.routines).toEqual([])
    expect(result?.routineVersions).toEqual([])
    expect(result?.exercises).toEqual([])
    expect(result?.workouts).toEqual([])
  })

  test('migrateRawToAppData preserves existing workouts and exercises from v1', () => {
    const exercise = {
      id: 'ex-1',
      name: 'Push-ups',
      kind: 'reps',
      defaultUnit: 'kg',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const workout = {
      id: 'wo-1',
      date: '2026-06-14',
      notes: '',
      exercises: [],
      createdAt: '2026-06-14T00:00:00.000Z',
      updatedAt: '2026-06-14T00:00:00.000Z',
    }
    const v1Data = {
      schemaVersion: 1,
      exercises: [exercise],
      workouts: [workout],
    }
    const result = migrateRawToAppData(v1Data)

    expect(result?.exercises).toHaveLength(1)
    expect(result?.exercises[0]?.measurementProfiles).toEqual([['reps', 'weight']])
    expect(result?.exercises[0]?.createdByUser).toBe(true)
    expect(result?.workouts).toHaveLength(1)
    expect(result?.routines).toEqual([])
  })

  test('migrateRawToAppData accepts current data unchanged', () => {
    const data = createDefaultData()
    const result = migrateRawToAppData(data)

    expect(result).not.toBeNull()
    expect(result?.schemaVersion).toBe(5)
    expect(result?.routines).toHaveLength(data.routines.length)
  })

  test('migrateRawToAppData marks v3 catalog exercises as predefined', () => {
    const data = createDefaultData()
    const exercise = data.exercises.find((item) => item.id === 'pushups')

    expect(exercise).toBeDefined()

    const v3Data = {
      ...data,
      schemaVersion: 3,
      exercises: data.exercises.map(({ createdByUser: _createdByUser, ...item }) => item),
    }
    const result = migrateRawToAppData(v3Data)

    expect(result?.schemaVersion).toBe(5)
    expect(result?.exercises.find((item) => item.id === 'pushups')?.createdByUser).toBe(false)
  })

  test('migrates v4 routine timing, planned-set IDs, and workout timing snapshots', () => {
    const current = createDefaultData()
    const routineVersion = current.routineVersions[0]

    expect(routineVersion).toBeDefined()
    if (!routineVersion) {
      return
    }

    const v4Data = {
      ...current,
      schemaVersion: 4,
      routineVersions: [{
        ...routineVersion,
        transitionSeconds: undefined,
        exercises: routineVersion.exercises.map((exercise) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          plannedSets: exercise.plannedSets.map(({ id: _id, ...set }) => set),
        })),
      }],
      workouts: [{
        id: 'workout-1',
        date: '2026-07-01',
        notes: '',
        exercises: [
          { id: 'entry-1', exerciseId: 'pushups', sets: [], notes: '' },
          { id: 'entry-2', exerciseId: 'plank', sets: [], notes: '' },
        ],
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
      }],
    }

    const result = migrateRawToAppData(v4Data)
    const migratedVersion = result?.routineVersions[0]

    expect(result?.schemaVersion).toBe(5)
    expect(migratedVersion?.transitionSeconds).toBe(10)
    expect(migratedVersion?.exercises[0]?.transitionBeforeOverrideSeconds).toBeNull()
    expect(migratedVersion?.exercises[0]?.restSeconds).toBe(20)
    expect(migratedVersion?.exercises[0]?.plannedSets.every((set) => set.id.length > 0)).toBe(true)
    expect(result?.workouts[0]?.transitionSeconds).toBe(10)
    expect(result?.workouts[0]?.exercises[0]?.transitionBeforeSeconds).toBe(0)
    expect(result?.workouts[0]?.exercises[1]?.transitionBeforeSeconds).toBe(10)
  })

  test('isValidAppData returns false for v1 data without routines', () => {
    const v1Data = {
      schemaVersion: 1,
      exercises: [],
      workouts: [],
    }
    expect(isValidAppData(v1Data)).toBe(false)
  })

  test('isValidAppData returns true for current data', () => {
    const data = createDefaultData()
    expect(isValidAppData(data)).toBe(true)
  })
})
