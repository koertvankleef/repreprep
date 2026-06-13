import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { formatExportData } from '../import-export/json-export-service.ts'

describe('json-export-service', () => {
  test('formatExportData creates valid JSON that parses back to the same data', () => {
    const data = createDefaultData()
    const json = formatExportData(data)

    expect(() => JSON.parse(json)).not.toThrow()
    expect(JSON.parse(json)).toEqual(data)
  })
})
