import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import {
  promptRoutineExercisePicker,
  RrrRoutineExercisePicker,
  type RoutineExercisePickerSelectDetail,
  type PickerAddedExercise,
} from '../app/components/routines/routine-exercise-picker.ts'
import { createDefaultData } from '../domain/create-default-data.ts'
import { searchExercises } from '../domain/exercise-service.ts'
import { specIt, getDeepActiveElement, initTestLocale } from './helpers.ts'
import { patchCssStyleSheet, patchHTMLDialog, patchSvgSymbolElement } from './mocks.ts'

beforeAll(async () => {
  patchCssStyleSheet()
  patchHTMLDialog()
  patchSvgSymbolElement()

  const [
    { registerRrrIcon },
    { registerRrrInput },
    { registerRrrListRow },
    { registerRrrNumberStepper },
    { registerRrrSheet },
  ] = await Promise.all([
    import('../design-system/components/rrr-icon.ts'),
    import('../design-system/components/rrr-input.ts'),
    import('../design-system/components/rrr-list-row.ts'),
    import('../design-system/components/rrr-number-stepper.ts'),
    import('../design-system/components/rrr-sheet.ts'),
  ])

  registerRrrIcon()
  registerRrrInput()
  registerRrrListRow()
  registerRrrNumberStepper()
  registerRrrSheet()
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

  specIt('keeps the picker session alive while configuring repeated additions', [
    'PICKER-ADD-004',
    'PICKER-CONFIG-001',
    'PICKER-CONFIG-002',
    'PICKER-CONFIG-003',
    'PICKER-CONFIG-004',
    'PICKER-CONFIG-005',
    'PICKER-CONFIG-008',
    'PICKER-CONFIG-009',
  ], async () => {
    const exercise = createDefaultData().exercises[0]!
    const additions: PickerAddedExercise[] = []
    const pickerResult = promptRoutineExercisePicker([exercise], (added) => additions.push(added))
    await Promise.resolve()
    await Promise.resolve()

    const pickerSheet = document.querySelector<HTMLElement & { close(result: string): void }>(
      'rrr-sheet.routine-exercise-picker-sheet',
    )!
    const picker = pickerSheet.querySelector('rrr-routine-exercise-picker')!
    const search = picker.querySelector<HTMLElement & { value: string }>(
      '[data-routine-exercise-search]',
    )!
    search.value = exercise.name
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await Promise.resolve()

    const results = picker.querySelector<HTMLElement>('[data-picker-results]')!
    results.scrollTop = 48
    const addButton = picker.querySelector<HTMLButtonElement>('[data-exercise-id] > button')!
    addButton.focus()
    addButton.click()
    addButton.click()
    await Promise.resolve()

    let sheets = Array.from(document.querySelectorAll<HTMLElement>('rrr-sheet'))
    expect(sheets).toHaveLength(2)
    expect(pickerSheet.isConnected).toBe(true)
    expect(sheets.map((sheet) => sheet.dataset.sheetStackDepth)).toEqual(['1', '2'])

    let settingsSheet = sheets[1]!
    let setCount = settingsSheet.querySelector<HTMLElement & { value: string }>(
      'rrr-number-stepper[name="set-count"]',
    )!
    let restSeconds = settingsSheet.querySelector<HTMLElement & { value: string }>(
      'rrr-number-stepper[name="rest-seconds"]',
    )!
    expect(setCount.value).toBe('1')
    expect(restSeconds.value).toBe('60')

    setCount.value = '4'
    restSeconds.value = '90'
    settingsSheet.querySelector<HTMLElement>('[data-sheet-result="confirm"]')?.click()
    await waitForSheetClose()

    expect(additions).toEqual([{
      exerciseId: exercise.id,
      settings: { setCount: 4, restSeconds: 90 },
    }])
    expect(document.querySelectorAll('rrr-sheet')).toHaveLength(1)
    expect(
      pickerSheet.querySelector('rrr-toast')?.shadowRoot?.querySelector('.toast-text')?.textContent,
    )
      .toContain(`${exercise.name} added`)
    expect(search.value).toBe(exercise.name)
    expect(results.scrollTop).toBe(48)
    expect(getDeepActiveElement()).toBe(addButton)

    addButton.click()
    await Promise.resolve()
    settingsSheet = document.querySelectorAll<HTMLElement>('rrr-sheet')[1]!
    setCount = settingsSheet.querySelector<HTMLElement & { value: string }>(
      'rrr-number-stepper[name="set-count"]',
    )!
    restSeconds = settingsSheet.querySelector<HTMLElement & { value: string }>(
      'rrr-number-stepper[name="rest-seconds"]',
    )!
    expect(setCount.value).toBe('4')
    expect(restSeconds.value).toBe('90')

    setCount.value = '2'
    restSeconds.value = '30'
    settingsSheet.querySelector<HTMLDialogElement>('dialog')
      ?.dispatchEvent(new Event('cancel', { cancelable: true }))
    await waitForSheetClose()
    expect(additions).toHaveLength(1)

    addButton.click()
    await Promise.resolve()
    settingsSheet = document.querySelectorAll<HTMLElement>('rrr-sheet')[1]!
    setCount = settingsSheet.querySelector<HTMLElement & { value: string }>(
      'rrr-number-stepper[name="set-count"]',
    )!
    restSeconds = settingsSheet.querySelector<HTMLElement & { value: string }>(
      'rrr-number-stepper[name="rest-seconds"]',
    )!
    expect(setCount.value).toBe('4')
    expect(restSeconds.value).toBe('90')
    settingsSheet.querySelector<HTMLElement>('[data-sheet-result="confirm"]')?.click()
    await waitForSheetClose()

    expect(additions.map((addition) => addition.exerciseId)).toEqual([exercise.id, exercise.id])

    pickerSheet.close('')
    await waitForSheetClose()
    await pickerResult
  })
})

async function waitForSheetClose(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 230))
}
