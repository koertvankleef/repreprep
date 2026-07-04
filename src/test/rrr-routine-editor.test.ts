import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSequence } from '../design-system/components/rrr-sequence.ts'
import { registerRrrSequenceGutter } from '../design-system/components/rrr-sequence-gutter.ts'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import { storageService } from '../app/storage-instance.ts'
import { RrrRoutineEditor } from '../app/components/routines/rrr-routine-editor.ts'
import type { RoutineExercise } from '../domain/types.ts'

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

  const { registerRrrNumberStepper } = await import(
    '../design-system/components/rrr-number-stepper.ts'
  )
  initLocale('en-US')
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

describe('rrr-routine-editor new routine confirmation', () => {
  test('shows only one empty-state message and no cancel action when no exercises exist', async () => {
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    const emptyMentions = Array.from(editor.querySelectorAll('p'))
      .filter((node) => node.textContent?.includes('No exercises added yet.'))

    expect(emptyMentions).toHaveLength(1)
    expect(editor.querySelector('[data-action="back"]')).toBeNull()
    expect(editor.querySelector('rrr-list-row[data-action="save"]')).not.toBeNull()
  })

  test('does not create a new routine when creation confirmation is dismissed', async () => {
    const initialCount = storageService.getData().routines.length
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    editor.querySelector<HTMLElement>('[data-action="save"]')?.click()
    await Promise.resolve()

    expect(document.querySelector('rrr-sheet')).not.toBeNull()
    expect(storageService.getData().routines).toHaveLength(initialCount)

    document.querySelector<HTMLElement>('rrr-sheet .sheet-assistive-dismiss')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(storageService.getData().routines).toHaveLength(initialCount)
    expect(window.location.hash).toBe('#/routines/new')
  })

  test('creates a new routine only after confirmation', async () => {
    const initialCount = storageService.getData().routines.length
    const editor = new RrrRoutineEditor()
    document.body.append(editor)
    await Promise.resolve()

    editor.querySelector<HTMLElement>('[data-action="save"]')?.click()
    await Promise.resolve()

    expect(document.querySelector('rrr-sheet')).not.toBeNull()
    expect(storageService.getData().routines).toHaveLength(initialCount)

    document.querySelector<HTMLElement>('rrr-sheet [data-action="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

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

    editor.querySelector<HTMLElement>('[data-action="save"]')?.click()
    await Promise.resolve()
    document.querySelector<HTMLElement>('rrr-sheet [data-action="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(storageService.getData().routines).toHaveLength(initialCount + 1)
    const created = storageService.getData().routines.at(-1)
    expect(created?.name).toBe('Morning Session')
  })

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
})
