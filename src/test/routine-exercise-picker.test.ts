import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import {
  RrrRoutineExercisePicker,
  type RoutineExercisePickerSelectDetail,
} from '../app/components/routines/routine-exercise-picker.ts'
import { createDefaultData } from '../domain/create-default-data.ts'
import { searchExercises } from '../domain/exercise-service.ts'
import { specIt, getDeepActiveElement, initTestLocale } from './helpers.ts'
import { patchCssStyleSheet, patchSvgSymbolElement } from './mocks.ts'

beforeAll(async () => {
  patchCssStyleSheet()
  patchSvgSymbolElement()

  const [
    { registerRrrIcon },
    { registerRrrInput },
    { registerRrrListRow },
  ] = await Promise.all([
    import('../design-system/components/rrr-icon.ts'),
    import('../design-system/components/rrr-input.ts'),
    import('../design-system/components/rrr-list-row.ts'),
  ])

  registerRrrIcon()
  registerRrrInput()
  registerRrrListRow()
})

beforeEach(() => {
  document.body.innerHTML = ''
  initTestLocale()
})

describe('routine exercise picker', () => {
  specIt('renders exercises alphabetically and narrows the list without replacing search focus', ['PICKER-SRCH-001', 'PICKER-SRCH-002', 'PICKER-SRCH-003'], async () => {
    const exercises = createDefaultData().exercises.slice(0, 8).reverse()
    const picker = new RrrRoutineExercisePicker()
    picker.exercises = exercises
    document.body.append(picker)
    await Promise.resolve()

    const initialRows = Array.from(
      picker.querySelectorAll<HTMLElement>('[data-exercise-id]'),
    )
    const expectedIds = [...exercises]
      .sort((left, right) => left.name.localeCompare(right.name, 'en-US', {
        numeric: true,
        sensitivity: 'base',
      }))
      .map((exercise) => exercise.id)

    expect(initialRows.map((row) => row.dataset.exerciseId)).toEqual(expectedIds)

    const search = picker.querySelector<HTMLElement & { value: string }>(
      '[data-routine-exercise-search]',
    )!
    const internalInput = search.shadowRoot?.querySelector<HTMLInputElement>('input')
    const target = exercises[3]!
    search.focus()
    search.value = target.name
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await Promise.resolve()

    const filteredRows = Array.from(
      picker.querySelectorAll<HTMLElement>('[data-exercise-id]'),
    )
    const expectedMatches = searchExercises(exercises, target.name)
      .sort((left, right) => left.name.localeCompare(right.name, 'en-US', {
        numeric: true,
        sensitivity: 'base',
      }))
    expect(filteredRows.map((row) => row.dataset.exerciseId))
      .toEqual(expectedMatches.map((exercise) => exercise.id))
    expect(getDeepActiveElement()).toBe(internalInput)
    expect(picker.querySelector('[data-picker-status]')?.textContent)
      .toBe(`${expectedMatches.length} exercises found`)
  })

  specIt('uses the complete row as an accessible Add action and reports selection', ['PICKER-ADD-001', 'PICKER-ADD-002', 'PICKER-ADD-003'], async () => {
    const exercise = createDefaultData().exercises[0]!
    const picker = new RrrRoutineExercisePicker()
    picker.exercises = [exercise]
    document.body.append(picker)
    await Promise.resolve()

    let selectedExerciseId: string | undefined
    picker.addEventListener('rrr-routine-exercise-picker-select', (event) => {
      selectedExerciseId = (event as CustomEvent<RoutineExercisePickerSelectDetail>)
        .detail.exerciseId
    })

    const row = picker.querySelector<HTMLElement>('[data-exercise-id]')
    const button = row?.querySelector<HTMLButtonElement>(':scope > button')

    expect(button).toBeInstanceOf(HTMLButtonElement)
    expect(button?.type).toBe('button')
    expect(row?.querySelector('.sr-only')?.textContent).toBe(`Add ${exercise.name}`)
    expect(row?.querySelector('rrr-icon[name="add"]')).not.toBeNull()

    button?.click()
    expect(selectedExerciseId).toBe(exercise.id)
  })

  specIt('shows a clear empty state for a search with no matches', ['PICKER-SRCH-004'], async () => {
    const picker = new RrrRoutineExercisePicker()
    picker.exercises = createDefaultData().exercises.slice(0, 4)
    document.body.append(picker)

    const search = picker.querySelector<HTMLElement & { value: string }>(
      '[data-routine-exercise-search]',
    )!
    search.value = 'definitely-not-an-exercise'
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(picker.querySelector('[data-exercise-id]')).toBeNull()
    expect(picker.querySelector('.routine-exercise-picker-empty')?.textContent)
      .toBe('No exercises in this selection.')
    expect(picker.querySelector('[data-picker-results]')?.getAttribute('data-result-count'))
      .toBe('0')
  })
})


