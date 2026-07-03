import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { isValidAppData } from '../import-export/json-import-service.ts'
import { migrateRawToAppData } from '../storage/local-storage-adapter.ts'

describe('pre-release schema reset', () => {
  test('rejects absent and malformed schema data', () => {
    expect(migrateRawToAppData(null)).toBeNull()
    expect(migrateRawToAppData({ exercises: [], workouts: [] })).toBeNull()
  })

  test('rejects an obsolete development schema instead of migrating it', () => {
    const current = createDefaultData()
    const obsolete = { ...current, schemaVersion: 5 }

    expect(migrateRawToAppData(obsolete)).toBeNull()
    expect(isValidAppData(obsolete)).toBe(false)
  })

  test('accepts current data unchanged', () => {
    const data = createDefaultData()

    expect(migrateRawToAppData(data)).toEqual(data)
    expect(isValidAppData(data)).toBe(true)
  })

  test('rejects target-shaped routine exercises in the current schema', () => {
    const data = createDefaultData()
    const version = data.routineVersions[0]!
    const targetShaped = {
      ...data,
      routineVersions: [{
        ...version,
        exercises: version.exercises.map(({ setCount: _setCount, ...exercise }) => ({
          ...exercise,
          plannedSets: [],
        })),
      }],
    }

    expect(migrateRawToAppData(targetShaped)).toBeNull()
  })
})
