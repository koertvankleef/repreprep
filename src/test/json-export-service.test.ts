import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { createRoutine } from '../domain/routine-service.ts'
import { formatExportData } from '../import-export/json-export-service.ts'
import { isValidAppData } from '../import-export/json-import-service.ts'

describe('json-export-service', () => {
  test('formatExportData creates valid JSON that parses back to the same data', () => {
    const data = createDefaultData()
    const json = formatExportData(data)
    const parsed: unknown = JSON.parse(json)

    expect(() => {
      JSON.parse(json)
    }).not.toThrow()
    expect(parsed).toEqual(data)
  })

  test('export includes routines and routineVersions', () => {
    const data = createDefaultData()
    const json = formatExportData(data)
    const parsed: unknown = JSON.parse(json)

    if (!isValidAppData(parsed)) {
      throw new Error('Expected exported JSON to validate as AppData')
    }

    expect(parsed.routines).toHaveLength(data.routines.length)
    expect(parsed.routineVersions).toHaveLength(data.routineVersions.length)
  })

  test('export preserves routine data round-trip', () => {
    const base = createDefaultData()
    const exerciseId = base.exercises[0]?.id ?? ''
    const data = createRoutine(base, 'Upper Body', [
      {
        id: 're-1',
        exerciseId,
        transitionBeforeOverrideSeconds: null,
        restSeconds: 20,
        setCount: 2,
      },
    ])
    const json = formatExportData(data)
    const parsed: unknown = JSON.parse(json)

    if (!isValidAppData(parsed)) {
      throw new Error('Expected exported JSON to validate as AppData')
    }

    const upperBody = parsed.routines.find((r) => r.name === 'Upper Body')
    expect(upperBody).toBeDefined()
  })
})
