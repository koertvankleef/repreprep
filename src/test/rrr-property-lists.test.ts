import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrDialogHost } from '../design-system/components/rrr-dialog-host.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { storageService } from '../app/storage-instance.ts'
import { RrrExerciseDetail } from '../app/components/rrr-exercise-detail.ts'
import { RrrRoutineDetail } from '../app/components/rrr-routine-detail.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrDialogHost()
  registerRrrListRow()
  registerRrrSection()

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = false
    },
  })
})

beforeEach(() => {
  document.body.innerHTML = ''
  window.location.hash = ''
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

  test('uses properties for the Routine overview and identity rows for its exercises and action', async () => {
    const routine = storageService.getData().routines[0]!
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    const propertyList = detail.querySelector<HTMLDListElement>('dl.rrr-property-list')
    const exerciseList = detail.querySelector<HTMLDivElement>('.rrr-list-card')
    const actionRow = detail.querySelector<HTMLElement>('rrr-list-row[data-action="start-workout"]')
    const sections = detail.querySelectorAll('rrr-section')

    expect(propertyList).not.toBeNull()
    expectSemanticPropertyRows(propertyList!)
    expect(propertyList?.querySelector('rrr-list-row')).toBeNull()
    expect(exerciseList?.querySelector('rrr-list-row')).not.toBeNull()
    expect(actionRow?.getAttribute('activation')).toBe('button')
    expect(actionRow?.querySelector(':scope > button')).not.toBeNull()
    expect(actionRow?.querySelector('rrr-icon[slot="leading"][name="play"]')).not.toBeNull()
    expect(actionRow?.parentElement?.previousElementSibling).toBe(sections[1])
    expect(detail.querySelector('rrr-button[data-action="start-workout"]')).toBeNull()
  })

  test('starts an active workout from the bottom action row', async () => {
    const routine = storageService.getData().routines[0]!
    const initialWorkoutCount = storageService.getData().workouts.length
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="start-workout"] > button')
      ?.click()

    expect(storageService.getData().workouts).toHaveLength(initialWorkoutCount + 1)
    expect(window.location.hash).toMatch(/^#\/workouts\/.+\/log$/)
  })

  test('only deletes a routine after confirmation and returns to the routine list', async () => {
    const routine = storageService.getData().routines[0]!
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="delete-routine"] > button')
      ?.click()

    const dialogHost = document.querySelector('rrr-dialog-host')
    expect(dialogHost?.querySelector('.dialog-title')?.textContent).toBe('Delete routine?')
    expect(storageService.getData().routines.find(({ id }) => id === routine.id)?.archived).toBe(false)

    dialogHost?.querySelector<HTMLElement>('rrr-button[data-action="cancel"]')?.click()
    await Promise.resolve()

    expect(storageService.getData().routines.find(({ id }) => id === routine.id)?.archived).toBe(false)

    detail
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="delete-routine"] > button')
      ?.click()
    dialogHost?.querySelector<HTMLElement>('rrr-button[data-action="confirm"]')?.click()
    await Promise.resolve()

    expect(storageService.getData().routines.find(({ id }) => id === routine.id)?.archived).toBe(true)
    expect(window.location.hash).toBe('#/routines')
  })
})
