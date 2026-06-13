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

  test('migrateRawToAppData migrates v1 data by adding empty routines and routineVersions', () => {
    const v1Data = {
      schemaVersion: 1,
      exercises: [],
      workouts: [],
    }
    const result = migrateRawToAppData(v1Data)

    expect(result).not.toBeNull()
    expect(result?.schemaVersion).toBe(2)
    expect(result?.routines).toEqual([])
    expect(result?.routineVersions).toEqual([])
    expect(result?.exercises).toEqual([])
    expect(result?.workouts).toEqual([])
  })

  test('migrateRawToAppData preserves existing workouts and exercises from v1', () => {
    const exercise = {
      id: 'ex-1',
      name: 'Push-ups',
      kind: 'reps-weight',
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
    expect(result?.workouts).toHaveLength(1)
    expect(result?.routines).toEqual([])
  })

  test('migrateRawToAppData accepts valid v2 data unchanged', () => {
    const data = createDefaultData()
    const result = migrateRawToAppData(data)

    expect(result).not.toBeNull()
    expect(result?.schemaVersion).toBe(2)
    expect(result?.routines).toHaveLength(data.routines.length)
  })

  test('isValidAppData returns false for v1 data without routines', () => {
    const v1Data = {
      schemaVersion: 1,
      exercises: [],
      workouts: [],
    }
    expect(isValidAppData(v1Data)).toBe(false)
  })

  test('isValidAppData returns true for valid v2 data', () => {
    const data = createDefaultData()
    expect(isValidAppData(data)).toBe(true)
  })
})
