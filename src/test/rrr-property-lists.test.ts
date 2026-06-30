import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { storageService } from '../app/storage-instance.ts'
import { RrrExerciseDetail } from '../app/components/rrr-exercise-detail.ts'
import { RrrRoutineDetail } from '../app/components/rrr-routine-detail.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrListRow()
  registerRrrSection()
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  storageService.resetAllData()
})

function expectSemanticPropertyRows(list: HTMLDListElement): void {
  const rows = Array.from(list.children)

  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) {
    expect(row.classList.contains('rrr-property-row')).toBe(true)
    expect(row.children[0]?.tagName).toBe('DT')
    expect(row.children[1]?.tagName).toBe('DD')
  }
}

describe('value-first property lists', () => {
  test('renders Exercise Details as semantic property groups', () => {
    const exercise = storageService.getData().exercises[0]!
    const detail = new RrrExerciseDetail()
    detail.exerciseId = exercise.id
    document.body.append(detail)

    const propertyLists = Array.from(detail.querySelectorAll<HTMLDListElement>('dl.rrr-property-list'))

    expect(propertyLists).toHaveLength(3)
    propertyLists.forEach(expectSemanticPropertyRows)
    expect(detail.querySelector('.rrr-detail-row')).toBeNull()
  })

  test('uses properties for the Routine overview and identity rows for its exercises', async () => {
    const routine = storageService.getData().routines[0]!
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    const propertyList = detail.querySelector<HTMLDListElement>('dl.rrr-property-list')
    const exerciseList = detail.querySelector<HTMLDivElement>('.rrr-list-card')

    expect(propertyList).not.toBeNull()
    expectSemanticPropertyRows(propertyList!)
    expect(propertyList?.querySelector('rrr-list-row')).toBeNull()
    expect(exerciseList?.querySelector('rrr-list-row')).not.toBeNull()
  })
})
