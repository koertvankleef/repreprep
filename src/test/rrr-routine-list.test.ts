import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { storageService } from '../app/storage-instance.ts'
import { t } from '../i18n/index.ts'
import { getRoutineSummary } from '../domain/routine-summary-service.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'
import '../app/components/routines/rrr-routine-list.ts'

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

describe('rrr-routine-list', () => {
  test('renders routines as button navigation rows without inline actions', async () => {
    const list = document.createElement('rrr-routine-list')
    document.body.append(list)
    await Promise.resolve()

    const routine = storageService.getData().routines[0]!
    const row = list.querySelector<HTMLElement>('rrr-list-row')

    expect(row?.getAttribute('activation')).toBe('button')
    expect(row?.dataset.action).toBe('navigate')
    expect(row?.dataset.href).toBe(`#/routines/${routine.id}`)
    expect(row?.querySelector(':scope > button')).toBeTruthy()
    expect(row?.querySelector(':scope > a')).toBeNull()
    expect(row?.getAttribute('accessory')).toBe('chevron')
    expect(row?.querySelector('rrr-icon[slot="leading"]')?.getAttribute('name')).toBe('clipboard-task-list-ltr')
    expect(list.querySelector('rrr-button')).toBeNull()
    expect(list.textContent).toContain('Featured')
  })

  test('shows a two-exercise preview and last-started body text for started routines', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const summary = getRoutineSummary(data, routine.id)!
    const workout = createWorkoutFromRoutine(data, routine.id, '2026-06-14')!
    storageService.saveWorkout(workout)

    const list = document.createElement('rrr-routine-list')
    document.body.append(list)
    await Promise.resolve()

    const row = list.querySelector<HTMLElement>(`rrr-list-row[data-href="#/routines/${routine.id}"]`)
    const names = summary.exerciseNames
      .slice(0, 2)
      .map((name) => name ?? t('routineList.exercises.unknown'))
      .join(', ')
    const expectedDescription = summary.exerciseNames.length > 2
      ? t('routineList.exercises.more', { names, count: summary.exerciseNames.length - 2 })
      : names

    expect(row?.getAttribute('description')).toBe(expectedDescription)
    expect(row?.querySelector('[slot="body"]')?.textContent).toContain('Last started')
  })
})
