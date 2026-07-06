import { describe, expect, test } from 'vitest'
import specText from '../../docs/spec.md?raw'

const testSources = import.meta.glob('./*.test.ts', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const specIdPattern = /\[([A-Z][A-Z0-9-]*-\d{3})\]/g
const testIdPattern = /'([A-Z][A-Z0-9-]*-\d{3})'/g
const uiPendingMarker = '[UI-req_test-pending]'

describe('functional specification traceability', () => {
  test('maps every requirement ID to an automated test or explicit UI test marker', () => {
    const automatedIds = collectMatches(Object.values(testSources).join('\n'), testIdPattern)
    const missing = specText.split(/\r?\n/).flatMap((line) => {
      const ids = collectMatches(line, specIdPattern)
      return line.includes(uiPendingMarker)
        ? []
        : [...ids].filter((id) => !automatedIds.has(id))
    })

    expect(missing).toEqual([])
  })

  test('does not reference unknown requirement IDs from tests', () => {
    const specIds = collectMatches(specText, specIdPattern)
    const automatedIds = collectMatches(Object.values(testSources).join('\n'), testIdPattern)

    expect([...automatedIds].filter((id) => !specIds.has(id))).toEqual([])
  })
})

function collectMatches(text: string, pattern: RegExp): Set<string> {
  return new Set(
    [...text.matchAll(pattern)]
      .map((match) => match[1])
      .filter((id): id is string => Boolean(id)),
  )
}
