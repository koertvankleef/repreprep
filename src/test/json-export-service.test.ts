import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { createRoutine } from '../domain/routine-service.ts'
import { formatExportData } from '../import-export/json-export-service.ts'
import { isValidAppData } from '../import-export/json-import-service.ts'

describe('json-export-service', () => {
  test('formatExportData creates valid JSON that parses back to the same data', () => {
    const data = createDefaultData()
    const json = formatExportData(data)

    expect(() => JSON.parse(json)).not.toThrow()
    expect(JSON.parse(json)).toEqual(data)
  })

  test('export includes routines and routineVersions', () => {
    const data = createDefaultData()
    const json = formatExportData(data)
    const parsed: unknown = JSON.parse(json)

    expect(isValidAppData(parsed)).toBe(true)

    if (isValidAppData(parsed)) {
      expect(parsed.routines).toHaveLength(data.routines.length)
      expect(parsed.routineVersions).toHaveLength(data.routineVersions.length)
    }
  })

  test('export preserves routine data round-trip', () => {
    const base = createDefaultData()
    const exerciseId = base.exercises[0]?.id ?? ''
    const data = createRoutine(base, 'Upper Body', [
      { id: 're-1', exerciseId, plannedSets: [{ kind: 'reps', targetReps: 8, targetWeightKg: 40 }] },
    ])
    const json = formatExportData(data)
    const parsed: unknown = JSON.parse(json)

    expect(isValidAppData(parsed)).toBe(true)
    if (isValidAppData(parsed)) {
      const upperBody = parsed.routines.find((r) => r.name === 'Upper Body')
      expect(upperBody).toBeDefined()
    }
  })
})
