import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { storageService } from '../app/storage-instance.ts'
import { RrrRoutineExerciseEditor } from '../app/components/routines/rrr-routine-exercise-editor.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { registerRrrSequence } from '../design-system/components/rrr-sequence.ts'
import { registerRrrSequenceGutter } from '../design-system/components/rrr-sequence-gutter.ts'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import { initLocale } from '../i18n/index.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrListRow()
  registerRrrSection()
  registerRrrSequence()
  registerRrrSequenceGutter()
  registerRrrSheet()

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
  localStorage.clear()
  storageService.resetAllData()
})

describe('routine exercise editor', () => {
  test('renders planned sets with derived shared rest gutters', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    const routineExercise = version.exercises.find(({ plannedSets }) => plannedSets.length > 1)!
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = routine.id
    editor.routineExerciseId = routineExercise.id
    document.body.append(editor)
    await Promise.resolve()

    const sequence = editor.querySelector('rrr-sequence')
    const rows = sequence?.querySelectorAll('rrr-list-row')
    const gutters = sequence?.querySelectorAll('rrr-sequence-gutter')
    const flowSection = Array.from(editor.querySelectorAll('rrr-section')).find(
      (section) => section.querySelector('[slot="heading"]')?.textContent === 'Flow',
    )

    expect(rows).toHaveLength(routineExercise.plannedSets.length)
    expect(gutters).toHaveLength(routineExercise.plannedSets.length - 1)
    expect(flowSection?.querySelector('rrr-list-row[data-action="edit-rest"]')).not.toBeNull()
    expect(flowSection?.querySelector('rrr-sequence')).toBe(sequence)
    expect(gutters?.[0]?.getAttribute('value')).toBe(String(routineExercise.restSeconds))
    expect(gutters?.[0]?.getAttribute('unit')).toBe('s')
    expect(gutters?.[0]?.getAttribute('aria-label')).toContain('between set 1 and set 2')
    expect(rows?.[0]?.hasAttribute('label')).toBe(false)
    expect(rows?.[0]?.querySelector('rrr-measurement')).not.toBeNull()
    expect(rows?.[0]?.querySelector(':scope > button .sr-only')?.textContent)
      .toMatch(/^First set, /)
  })

  test('renders a not-found state when the sequence entry is unavailable', () => {
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = 'missing-routine'
    editor.routineExerciseId = 'missing-entry'
    document.body.append(editor)

    expect(editor.textContent).toContain('This routine exercise is unavailable')
    expect(editor.querySelector('rrr-sequence')).toBeNull()
  })

  test('edits shared rest and updates every derived gutter', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    const routineExercise = version.exercises.find(({ plannedSets }) => plannedSets.length > 1)!
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = routine.id
    editor.routineExerciseId = routineExercise.id
    document.body.append(editor)
    await Promise.resolve()

    editor
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="edit-rest"] > button')
      ?.click()
    const input = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="rest-seconds"]',
    )
    input!.value = '30'
    input?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const updatedRoutine = storageService
      .getData()
      .routines.find(({ id }) => id === routine.id)!
    const updatedVersion = storageService
      .getData()
      .routineVersions.find(({ id }) => id === updatedRoutine.activeVersionId)!
    const updatedExercise = updatedVersion.exercises.find(({ id }) => id === routineExercise.id)!

    expect(updatedExercise.restSeconds).toBe(30)
    expect(Array.from(editor.querySelectorAll('rrr-sequence-gutter'))
      .every((gutter) => gutter.getAttribute('value') === '30')).toBe(true)
  })

  test('edits and adds reps sets while preserving stable set IDs', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    const routineExercise = version.exercises.find(
      ({ plannedSets }) => plannedSets[0]?.kind === 'reps',
    )!
    const originalSet = routineExercise.plannedSets[0]!
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = routine.id
    editor.routineExerciseId = routineExercise.id
    document.body.append(editor)
    await Promise.resolve()

    editor
      .querySelector<HTMLButtonElement>(`rrr-list-row[data-set-id="${originalSet.id}"] > button`)
      ?.click()
    expect(document.querySelector('rrr-sheet [slot="heading"]')?.textContent).toBe('First set')
    const repsInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="target-reps"]',
    )
    const weightInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="target-weight"]',
    )
    repsInput!.value = '12'
    weightInput!.value = '20'
    repsInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    weightInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    let currentRoutine = storageService.getData().routines.find(({ id }) => id === routine.id)!
    let currentVersion = storageService
      .getData()
      .routineVersions.find(({ id }) => id === currentRoutine.activeVersionId)!
    let currentExercise = currentVersion.exercises.find(({ id }) => id === routineExercise.id)!
    const editedSet = currentExercise.plannedSets[0]

    expect(editedSet).toMatchObject({
      id: originalSet.id,
      kind: 'reps',
      targetReps: 12,
      targetWeightKg: 20,
    })

    editor
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="add-set"] > button')
      ?.click()
    const addRepsInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="target-reps"]',
    )
    addRepsInput!.value = '8'
    addRepsInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    currentRoutine = storageService.getData().routines.find(({ id }) => id === routine.id)!
    currentVersion = storageService
      .getData()
      .routineVersions.find(({ id }) => id === currentRoutine.activeVersionId)!
    currentExercise = currentVersion.exercises.find(({ id }) => id === routineExercise.id)!
    const addedSet = currentExercise.plannedSets.at(-1)

    expect(currentExercise.plannedSets).toHaveLength(routineExercise.plannedSets.length + 1)
    expect(addedSet).toMatchObject({ kind: 'reps', targetReps: 8, targetWeightKg: null })
    expect(addedSet?.id).not.toBe(originalSet.id)
  })

  test('adds a timed set for a timed exercise', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    const routineExercise = version.exercises.find(
      ({ plannedSets }) => plannedSets[0]?.kind === 'time',
    )!
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = routine.id
    editor.routineExerciseId = routineExercise.id
    document.body.append(editor)
    await Promise.resolve()

    editor
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="add-set"] > button')
      ?.click()
    const secondsInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="target-seconds"]',
    )
    secondsInput!.value = '45'
    secondsInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const currentRoutine = storageService.getData().routines.find(({ id }) => id === routine.id)!
    const currentVersion = storageService
      .getData()
      .routineVersions.find(({ id }) => id === currentRoutine.activeVersionId)!
    const currentExercise = currentVersion.exercises.find(({ id }) => id === routineExercise.id)!

    expect(currentExercise.plannedSets.at(-1))
      .toMatchObject({ kind: 'time', targetSeconds: 45 })
  })
})
