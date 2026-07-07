import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSequence } from '../design-system/components/rrr-sequence.ts'
import { registerRrrSequenceGutter } from '../design-system/components/rrr-sequence-gutter.ts'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import { storageService } from '../app/storage-instance.ts'
import { RrrRoutineEditor } from '../app/components/routines/rrr-routine-editor.ts'
import type { RoutineExercise } from '../domain/types.ts'
import { specIt } from './helpers.ts'

const natoPrefixPattern = '(Alpha|Bravo|Charlie|Delta|Echo|Foxtrot|Golf|Hotel|India|Juliett|Kilo|Lima|Mike|November|Oscar|Papa|Quebec|Romeo|Sierra|Tango|Uniform|Victor|Whiskey|X-ray|Yankee|Zulu)'

beforeAll(async () => {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }

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

  const [
    { registerRrrInput },
    { registerRrrNumberStepper },
  ] = await Promise.all([
    import('../design-system/components/rrr-input.ts'),
    import('../design-system/components/rrr-number-stepper.ts'),
  ])
  initLocale('en-US')
  registerRrrInput()
  registerRrrListRow()
  registerRrrNumberStepper()
  registerRrrSequence()
  registerRrrSequenceGutter()
  registerRrrSheet()
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  storageService.resetAllData()
  window.location.hash = '#/routines/new'
})

describe('rrr-routine-editor creation', () => {
  test('shows only one empty-state message and no cancel action when no exercises exist', async () => {
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    const emptyMentions = Array.from(editor.querySelectorAll('p'))
      .filter((node) => node.textContent?.includes('No exercises added yet.'))

    expect(emptyMentions).toHaveLength(1)
    expect(editor.querySelector('.status-message')?.textContent)
      .toContain('Swipe left on an exercise to delete it.')
    expect(editor.querySelector('[data-action="back"]')).toBeNull()
    expect(editor.querySelector('rrr-list-row[data-action="create-routine"]')).not.toBeNull()
    expect(editor.querySelector(
      'rrr-list-row[data-action="create-routine"]',
    )?.getAttribute('label')).toBe('Create routine')
  })

  test('creates a new routine directly from the explicit create action', async () => {
    const initialCount = storageService.getData().routines.length
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    editor.querySelector<HTMLElement>('[data-action="create-routine"]')?.click()

    expect(document.querySelector('rrr-sheet')).toBeNull()
    expect(storageService.getData().routines).toHaveLength(initialCount + 1)
    const created = storageService.getData().routines.at(-1)
    expect(created?.name).toMatch(new RegExp(`^${natoPrefixPattern} [A-Za-z]+(?: \\d+)?$`))
    expect(window.location.hash).toBe(`#/routines/${created?.id}`)
  })

  test('allows overriding the auto name via rename sheet before creation', async () => {
    const initialCount = storageService.getData().routines.length
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    const renamePromise = editor.openRenameSheet()
    await Promise.resolve()

    const renameInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input',
    )
    renameInput!.value = 'Morning Session'
    renameInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await renamePromise
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    editor.querySelector<HTMLElement>('[data-action="create-routine"]')?.click()

    expect(storageService.getData().routines).toHaveLength(initialCount + 1)
    const created = storageService.getData().routines.at(-1)
    expect(created?.name).toBe('Morning Session')
  })

  specIt('adds a selected exercise to the local routine draft through search', ['PICKER-CONFIG-007'], async () => {
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    editor
      .querySelector<HTMLButtonElement>(
        'rrr-list-row[data-action="add-routine-exercise"] > button',
      )
      ?.click()
    await Promise.resolve()

    const search = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet [data-routine-exercise-search]',
    )!
    const target = storageService.getData().exercises.find(
      (exercise) => exercise.name.toLowerCase().includes('plank'),
    )!
    search.value = target.name
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await Promise.resolve()

    const resultRow = document.querySelector<HTMLElement>(
      `rrr-sheet [data-exercise-id="${target.id}"]`,
    )
    resultRow?.querySelector<HTMLButtonElement>(':scope > button')?.click()
    await Promise.resolve()

    const sheets = document.querySelectorAll<HTMLElement & { close(result: string | null): void }>('rrr-sheet')
    const topSheet = sheets[sheets.length - 1] as typeof sheets[0]
    topSheet?.close('confirm')
    await new Promise((resolve) => window.setTimeout(resolve, 230))
    // dismiss picker so promptRoutineExercisePicker resolves
    const pickerSheet = sheets[0] as typeof sheets[0]
    pickerSheet?.close(null)
    await new Promise((resolve) => window.setTimeout(resolve, 230))

    const draftEditor = editor as unknown as {
      exercises: RoutineExercise[]
    }
    expect(draftEditor.exercises.at(-1)?.exerciseId).toBe(target.id)
  }, 10000)

  test('edits the local routine draft through Flow without a duplicate exercise section', async () => {
    const data = storageService.getData()
    const sourceVersion = data.routineVersions[0]!
    const editor = new RrrRoutineEditor()
    document.body.append(editor)

    const draftEditor = editor as unknown as {
      exercises: RoutineExercise[]
      render: () => void
    }
    draftEditor.exercises = sourceVersion.exercises.slice(0, 2).map(
      (exercise) => ({ ...exercise }),
    )
    draftEditor.render()
    await Promise.resolve()

    expect(editor.querySelector('.exercise-list')).toBeNull()
    expect(editor.querySelector('.exercise-item')).toBeNull()
    expect(editor.querySelector('input[type="number"]')).toBeNull()
    const flowSection = editor.querySelector<HTMLElement>('rrr-section')
    expect(flowSection?.querySelector(':scope > .rrr-card > rrr-sequence')).not.toBeNull()
    expect(flowSection?.querySelector(
      ':scope > .rrr-list-card [data-action="add-routine-exercise"]',
    )).not.toBeNull()

    const firstExercise = draftEditor.exercises[0]!
    editor.querySelector<HTMLElement>(
      `rrr-list-row[data-routine-exercise-id="${firstExercise.id}"]`,
    )?.click()
    await Promise.resolve()

    const setCount = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-number-stepper[name="set-count"]',
    )
    const restSeconds = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-number-stepper[name="rest-seconds"]',
    )
    setCount!.value = '4'
    restSeconds!.value = '30'
    setCount?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    restSeconds?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>(
      'rrr-sheet [data-sheet-result="confirm"]',
    )?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(draftEditor.exercises[0]).toMatchObject({
      id: firstExercise.id,
      setCount: 4,
      restSeconds: 30,
    })
    expect(editor.querySelector(
      `rrr-list-row[data-routine-exercise-id="${firstExercise.id}"]`,
    )?.getAttribute('description')).toBe('4 sets')
  })

  test('deletes an exercise from the local draft when swipe commits', async () => {
    const sourceVersion = storageService.getData().routineVersions[0]!
    const editor = new RrrRoutineEditor()
    document.body.append(editor)

    const draftEditor = editor as unknown as {
      exercises: RoutineExercise[]
      render: () => void
    }
    draftEditor.exercises = sourceVersion.exercises.slice(0, 2).map(
      (exercise) => ({ ...exercise }),
    )
    draftEditor.render()
    await Promise.resolve()

    const removedExercise = draftEditor.exercises[0]!
    const swipeAction = editor.querySelector<HTMLElement>(
      `rrr-swipe-action[data-swipe-routine-exercise-id="${removedExercise.id}"]`,
    )!

    expect(swipeAction.getAttribute('action-label')).toContain('Delete ')
    swipeAction.dispatchEvent(new CustomEvent('rrr-swipe-action-commit', {
      bubbles: true,
      composed: true,
      detail: { action: 'delete' },
    }))

    expect(draftEditor.exercises.some(({ id }) => id === removedExercise.id)).toBe(false)
    expect(editor.querySelector(
      `rrr-swipe-action[data-swipe-routine-exercise-id="${removedExercise.id}"]`,
    )).toBeNull()
    expect(document.querySelector('rrr-sheet')).toBeNull()
  })

  test('uses an explicit reorder mode for the local routine draft', async () => {
    const sourceVersion = storageService.getData().routineVersions[0]!
    const editor = new RrrRoutineEditor()
    document.body.append(editor)

    const draftEditor = editor as unknown as {
      exercises: RoutineExercise[]
      render: () => void
    }
    draftEditor.exercises = sourceVersion.exercises.slice(0, 2).map(
      (exercise) => ({ ...exercise }),
    )
    draftEditor.render()
    await Promise.resolve()

    const firstExerciseId = draftEditor.exercises[0]!.id
    const normalRow = editor.querySelector<HTMLElement>(
      `rrr-list-row[data-routine-exercise-id="${firstExerciseId}"]`,
    )
    const reorderControl = editor.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-list-row[data-action="toggle-reorder-exercises"]',
    )!

    expect(editor.querySelector('rrr-sequence')?.hasAttribute('sortable')).toBe(false)
    expect(editor.querySelector('[data-sort-handle]')).toBeNull()
    expect(normalRow?.getAttribute('activation')).toBe('button')

    reorderControl.checked = true
    reorderControl.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await Promise.resolve()

    const firstHandle = editor.querySelector<HTMLButtonElement>(
      `[data-sort-id="${firstExerciseId}"] [data-sort-handle]`,
    )
    const sortableItem = firstHandle?.closest<HTMLElement>('[data-sort-id]')
    const reorderRow = editor.querySelector<HTMLElement>(
      `rrr-list-row[data-routine-exercise-id="${firstExerciseId}"]`,
    )

    expect(editor.querySelector('rrr-sequence')?.hasAttribute('sortable')).toBe(true)
    expect(editor.querySelector('rrr-swipe-action')).toBeNull()
    expect(sortableItem?.firstElementChild).toBe(firstHandle)
    expect(reorderRow?.hasAttribute('activation')).toBe(false)
    expect(reorderRow?.hasAttribute('description')).toBe(false)
    expect(editor.querySelector('rrr-sequence-gutter')?.hasAttribute('activation')).toBe(false)
    expect(editor.querySelector(
      'rrr-list-row[data-action="add-routine-exercise"]',
    )?.hasAttribute('disabled')).toBe(true)

    expect(editor.querySelector<HTMLElement>('rrr-sequence')?.dataset.gutterMotion)
      .toBe('collapse')
    editor.querySelector('rrr-sequence-gutter')?.dispatchEvent(
      new Event('animationend', { bubbles: true }),
    )
    await Promise.resolve()

    expect(document.activeElement).toBe(firstHandle)

    reorderRow?.click()
    expect(document.querySelector('rrr-sheet')).toBeNull()

    const activeReorderControl = editor.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-list-row[data-action="toggle-reorder-exercises"]',
    )!
    activeReorderControl.checked = false
    activeReorderControl.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }))
    await Promise.resolve()

    expect(editor.querySelector('[data-sort-handle]')).toBeNull()
    expect(editor.querySelector<HTMLElement>('rrr-sequence')?.dataset.gutterMotion)
      .toBe('reveal')
    expect(editor.querySelector(
      `rrr-list-row[data-routine-exercise-id="${firstExerciseId}"]`,
    )?.getAttribute('activation')).toBe('button')
    expect(editor.querySelector(
      `rrr-list-row[data-routine-exercise-id="${firstExerciseId}"]`,
    )?.hasAttribute('description')).toBe(true)
    expect(editor.querySelector(
      'rrr-list-row[data-action="add-routine-exercise"]',
    )?.hasAttribute('disabled')).toBe(false)
  })
})
