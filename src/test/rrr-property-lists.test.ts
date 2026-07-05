import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrListCard } from '../design-system/components/rrr-list-card.ts'
import { registerRrrSequence } from '../design-system/components/rrr-sequence.ts'
import { registerRrrSequenceGutter } from '../design-system/components/rrr-sequence-gutter.ts'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { storageService } from '../app/storage-instance.ts'
import { RrrExerciseDetail } from '../app/components/exercises/rrr-exercise-detail.ts'
import { RrrRoutineDetail } from '../app/components/routines/rrr-routine-detail.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'

beforeAll(async () => {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }
  const adoptedStyleSheets = new WeakMap<Document | ShadowRoot, CSSStyleSheet[]>()
  const descriptor = {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      return adoptedStyleSheets.get(this) ?? []
    },
    set(this: Document | ShadowRoot, value: CSSStyleSheet[]): void {
      adoptedStyleSheets.set(this, value)
    },
  }
  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', descriptor)
  }
  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', descriptor)
  }

  const { registerRrrNumberStepper } = await import('../design-system/components/rrr-number-stepper.ts')
  initLocale('en-US')
  registerRrrNumberStepper()
  registerRrrSheet()
  registerRrrListRow()
  registerRrrListCard()
  registerRrrSequence()
  registerRrrSequenceGutter()
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
    const exerciseSequence = detail.querySelector<HTMLElement>('rrr-sequence')
    const firstExerciseRow = exerciseSequence?.querySelector<HTMLElement>('rrr-list-row')
    const actionRow = detail.querySelector<HTMLElement>('rrr-list-row[data-action="start-workout"]')
    const sections = detail.querySelectorAll('rrr-section')
    const flowSection = Array.from(sections).find(
      (section) => section.querySelector('[slot="heading"]')?.textContent === 'Flow',
    )
    const flowCard = flowSection?.querySelector<HTMLElement>(':scope > .rrr-card')
    const timingCard = flowSection?.querySelector<HTMLElement>(
      ':scope > .rrr-list-card',
    )
    const timingRows = Array.from(timingCard?.querySelectorAll<HTMLElement>('rrr-list-row') ?? [])

    expect(propertyList).not.toBeNull()
    expectSemanticPropertyRows(propertyList!)
    expect(propertyList?.querySelector('rrr-list-row')).toBeNull()
    expect(Array.from(propertyList?.querySelectorAll('dt') ?? [])
      .map((label) => label.textContent)).toContain('Last started')
    expect(Array.from(sections)
      .some((section) => section.querySelector('[slot="heading"]')?.textContent === 'Data'))
      .toBe(false)
    expect(firstExerciseRow?.getAttribute('activation')).toBe('button')
    expect(firstExerciseRow?.hasAttribute('href')).toBe(false)
    expect(firstExerciseRow?.hasAttribute('accessory')).toBe(false)
    expect(exerciseSequence?.hasAttribute('sortable')).toBe(false)
    expect(exerciseSequence?.querySelector('[data-sort-handle]')).toBeNull()
    expect(exerciseSequence?.querySelector('rrr-sequence-gutter')).not.toBeNull()
    expect(timingCard?.querySelector(
      'rrr-list-row[data-action="edit-transition-default"]',
    )?.getAttribute('accessory')).toBe('value')
    expect(timingCard?.querySelector(
      'rrr-list-row[data-action="edit-transition-default"]',
    )?.getAttribute('description')).toBe('Default time between exercises')
    expect(timingRows[0]?.dataset.action).toBe('add-routine-exercise')
    expect(timingRows[1]?.dataset.action).toBe('toggle-reorder-exercises')
    expect(timingRows[1]?.getAttribute('control')).toBe('switch')
    expect(timingRows[1]?.hasAttribute('checked')).toBe(false)
    expect(timingRows[2]?.dataset.action).toBe('edit-transition-default')
    expect(flowCard?.querySelector(':scope > rrr-sequence')).toBe(exerciseSequence)
    expect(flowCard?.querySelector(':scope > .rrr-list-card')).toBeNull()
    expect(actionRow?.getAttribute('activation')).toBe('button')
    expect(actionRow?.querySelector(':scope > button')).not.toBeNull()
    expect(actionRow?.querySelector('rrr-icon[slot="leading"][name="play"]')).not.toBeNull()
    expect(detail.querySelector('rrr-button[data-action="start-workout"]')).toBeNull()
  })

  test('only labels transition gutters that override the routine default', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    storageService.setData({
      ...data,
      routineVersions: data.routineVersions.map((candidate) => candidate.id === version.id
        ? {
            ...candidate,
            exercises: candidate.exercises.map((exercise, index) => index === 1
              ? { ...exercise, transitionBeforeOverrideSeconds: 45 }
              : exercise),
          }
        : candidate),
    })

    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    const gutters = detail.querySelectorAll('rrr-sequence-gutter')

    expect(gutters[0]?.getAttribute('description')).toBe('Custom')
    expect(gutters[1]?.hasAttribute('description')).toBe(false)
    expect(gutters[1]?.getAttribute('action-label')).not.toContain('default')
  })

  test('edits routine-exercise set count and rest in a sheet', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const previousVersionId = routine.activeVersionId
    const version = data.routineVersions.find(({ id }) => id === previousVersionId)!
    const routineExercise = version.exercises[0]!
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail.querySelector<HTMLButtonElement>(
      `rrr-list-row[data-routine-exercise-id="${routineExercise.id}"] > button`,
    )?.click()
    const setCountInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-number-stepper[name="set-count"]',
    )
    const restInput = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-number-stepper[name="rest-seconds"]',
    )
    const confirmButton = document.querySelector<HTMLElement>(
      'rrr-sheet [data-sheet-result="confirm"]',
    )

    setCountInput!.value = ''
    restInput!.value = ''
    setCountInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    restInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(confirmButton?.hasAttribute('disabled')).toBe(true)

    setCountInput!.value = '0'
    restInput!.value = '0'
    setCountInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    restInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(confirmButton?.hasAttribute('disabled')).toBe(true)

    setCountInput!.value = '4'
    setCountInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(confirmButton?.hasAttribute('disabled')).toBe(false)

    restInput!.value = ''
    restInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(confirmButton?.hasAttribute('disabled')).toBe(true)

    restInput!.value = '30'
    restInput?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(confirmButton?.hasAttribute('disabled')).toBe(false)
    confirmButton?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const updatedRoutine = storageService.getData().routines.find(
      ({ id }) => id === routine.id,
    )!
    const updatedVersion = storageService.getData().routineVersions.find(
      ({ id }) => id === updatedRoutine.activeVersionId,
    )!
    const updatedExercise = updatedVersion.exercises.find(
      ({ id }) => id === routineExercise.id,
    )

    expect(updatedRoutine.activeVersionId).not.toBe(previousVersionId)
    expect(updatedExercise).toMatchObject({ setCount: 4, restSeconds: 30 })
  })

  test('deletes a routine exercise from the edit sheet', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const previousVersionId = routine.activeVersionId
    const version = data.routineVersions.find(({ id }) => id === previousVersionId)!
    const routineExercise = version.exercises[0]!
    const previousCount = version.exercises.length
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail.querySelector<HTMLButtonElement>(
      `rrr-list-row[data-routine-exercise-id="${routineExercise.id}"] > button`,
    )?.click()

    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="delete"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const updatedRoutine = storageService.getData().routines.find(
      ({ id }) => id === routine.id,
    )!
    const updatedVersion = storageService.getData().routineVersions.find(
      ({ id }) => id === updatedRoutine.activeVersionId,
    )!

    expect(updatedRoutine.activeVersionId).not.toBe(previousVersionId)
    expect(updatedVersion.exercises).toHaveLength(previousCount - 1)
    expect(updatedVersion.exercises.some(({ id }) => id === routineExercise.id)).toBe(false)
  })

  test('edits the routine transition default and saves a new active version', async () => {
    const routine = storageService.getData().routines[0]!
    const previousVersionId = routine.activeVersionId
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail
      .querySelector<HTMLButtonElement>(
        'rrr-list-row[data-action="edit-transition-default"] > button',
      )
      ?.click()

    const input = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="seconds"]',
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

    expect(updatedRoutine.activeVersionId).not.toBe(previousVersionId)
    expect(updatedVersion.transitionSeconds).toBe(30)
    expect(detail.querySelector(
      'rrr-list-row[data-action="edit-transition-default"]',
    )?.getAttribute('value-text')).toBe('30 s')
  })

  test('edits a transition gutter with a custom override and restores the default', async () => {
    const routine = storageService.getData().routines[0]!
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail
      .querySelector<HTMLButtonElement>('rrr-sequence-gutter > button')
      ?.click()
    await Promise.resolve()

    const dismissButton = document.querySelector<HTMLButtonElement>(
      'rrr-sheet .sheet-assistive-dismiss',
    )
    const selectedModeInput = document.querySelector<HTMLInputElement>(
      'rrr-sheet rrr-list-row[autofocus] input',
    )
    const customMode = document.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-sheet rrr-list-row[data-transition-mode="custom"]',
    )
    expect(document.activeElement).toBe(selectedModeInput)
    expect(document.activeElement).not.toBe(dismissButton)
    customMode!.checked = true
    customMode?.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

    const input = document.querySelector<HTMLElement & { value: string }>(
      'rrr-sheet rrr-input[name="seconds"]',
    )
    input!.value = '45'
    input?.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const updatedRoutine = storageService
      .getData()
      .routines.find(({ id }) => id === routine.id)!
    const updatedVersion = storageService
      .getData()
      .routineVersions.find(({ id }) => id === updatedRoutine.activeVersionId)!

    expect(updatedVersion.exercises[1]?.transitionBeforeOverrideSeconds).toBe(45)
    expect(detail.querySelector('rrr-sequence-gutter')?.getAttribute('value')).toBe('45')
    expect(detail.querySelector('rrr-sequence-gutter')?.getAttribute('unit')).toBe('s')
    expect(detail.querySelector('rrr-sequence-gutter')?.getAttribute('description')).toBe('Custom')

    detail
      .querySelector<HTMLButtonElement>('rrr-sequence-gutter > button')
      ?.click()
    await Promise.resolve()

    const defaultMode = document.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-sheet rrr-list-row[data-transition-mode="default"]',
    )
    defaultMode!.checked = true
    defaultMode?.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const restoredRoutine = storageService
      .getData()
      .routines.find(({ id }) => id === routine.id)!
    const restoredVersion = storageService
      .getData()
      .routineVersions.find(({ id }) => id === restoredRoutine.activeVersionId)!

    expect(restoredVersion.exercises[1]?.transitionBeforeOverrideSeconds).toBeNull()
    expect(detail.querySelector('rrr-sequence-gutter')?.hasAttribute('description')).toBe(false)
  })

  test('reorders routine exercises from the sequence and re-derives transition gutters', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    const first = version.exercises[0]!
    const second = version.exercises[1]!
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    const reorderControl = detail.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-list-row[data-action="toggle-reorder-exercises"]',
    )!
    reorderControl.checked = true
    reorderControl.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await Promise.resolve()

    const sequence = detail.querySelector<HTMLElement>('rrr-sequence')
    const firstHandle = detail.querySelector<HTMLButtonElement>(
      `[data-sort-id="${first.id}"] [data-sort-handle]`,
    )!
    const firstSortableItem = firstHandle.closest<HTMLElement>('[data-sort-id]')!
    const firstExerciseRow = firstSortableItem.querySelector<HTMLElement>(
      'rrr-list-row[data-routine-exercise-id]',
    )
    const addExercise = detail.querySelector<HTMLElement>(
      'rrr-list-row[data-action="add-routine-exercise"]',
    )

    expect(sequence?.hasAttribute('sortable')).toBe(true)
    expect(firstSortableItem.firstElementChild).toBe(firstHandle)
    expect(firstExerciseRow?.hasAttribute('activation')).toBe(false)
    expect(detail.querySelector('rrr-sequence-gutter')?.hasAttribute('activation')).toBe(false)
    expect(addExercise?.hasAttribute('disabled')).toBe(true)
    expect(document.activeElement).toBe(firstHandle)
    expect(firstHandle.getAttribute('aria-label')).toContain('Press Space')

    firstHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))
    expect(sequence?.getAttribute('data-sorting'))
      .toBe('keyboard')

    firstHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))
    firstHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))
    await Promise.resolve()
    await Promise.resolve()

    const updatedRoutine = storageService.getData().routines.find(
      ({ id }) => id === routine.id,
    )!
    const updatedVersion = storageService.getData().routineVersions.find(
      ({ id }) => id === updatedRoutine.activeVersionId,
    )!
    const firstGutter = detail.querySelector<HTMLElement>('rrr-sequence-gutter')
    const focusedHandle = document.activeElement?.closest<HTMLElement>('[data-sort-id]')

    expect(updatedRoutine.activeVersionId).not.toBe(version.id)
    expect(updatedVersion.exercises.slice(0, 2).map(({ id }) => id))
      .toEqual([second.id, first.id])
    expect(firstGutter?.dataset.beforeExerciseId).toBe(first.id)
    expect(focusedHandle?.dataset.sortId).toBe(first.id)
    expect(document.querySelector<HTMLElement>('[role="status"].sr-only')?.textContent)
      .toContain('dropped at position 2')
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

  test('adds a routine exercise from the flow card', async () => {
    const routine = storageService.getData().routines[0]!
    const previousVersionId = routine.activeVersionId
    const previousVersion = storageService.getData().routineVersions.find(
      ({ id }) => id === previousVersionId,
    )!
    const previousCount = previousVersion.exercises.length
    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    detail
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="add-routine-exercise"] > button')
      ?.click()
    await Promise.resolve()

    expect(document.querySelector('rrr-sheet rrr-select[name="add-exercise"]')).not.toBeNull()
    document.querySelector<HTMLElement>('rrr-sheet [data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    const updatedRoutine = storageService.getData().routines.find(({ id }) => id === routine.id)!
    const updatedVersion = storageService.getData().routineVersions.find(
      ({ id }) => id === updatedRoutine.activeVersionId,
    )!

    expect(updatedRoutine.activeVersionId).not.toBe(previousVersionId)
    expect(updatedVersion.exercises).toHaveLength(previousCount + 1)
  })

  test('selects and clears the completed workout used for starting values', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const older = {
      ...createWorkoutFromRoutine(data, routine.id, '2026-06-01')!,
      completedAt: '2026-06-01T12:00:00.000Z',
    }
    const newer = {
      ...createWorkoutFromRoutine(data, routine.id, '2026-06-02')!,
      completedAt: '2026-06-02T12:00:00.000Z',
    }
    const unfinished = createWorkoutFromRoutine(data, routine.id, '2026-06-03')!
    storageService.saveWorkout(older)
    storageService.saveWorkout(newer)
    storageService.saveWorkout(unfinished)

    const detail = new RrrRoutineDetail()
    detail.routineId = routine.id
    document.body.append(detail)
    await Promise.resolve()

    const sourceRow = detail.querySelector<HTMLElement>(
      'rrr-list-row[data-action="edit-prefill-source"]',
    )
    expect(sourceRow?.getAttribute('value-text')).toBe('None')
    expect(sourceRow?.getAttribute('accessory')).toBe('value')
    sourceRow?.querySelector<HTMLButtonElement>(':scope > button')?.click()
    await Promise.resolve()

    const choices = Array.from(document.querySelectorAll<HTMLElement>(
      'rrr-sheet rrr-list-row[data-prefill-source-id]',
    ))
    expect(choices.map((row) => row.dataset.prefillSourceId)).toEqual([
      '__none__',
      newer.id,
      older.id,
    ])
    expect(choices.some((row) => row.dataset.prefillSourceId === unfinished.id)).toBe(false)

    const newerChoice = choices.find((row) => row.dataset.prefillSourceId === newer.id) as
      | (HTMLElement & { checked: boolean })
      | undefined
    newerChoice!.checked = true
    newerChoice?.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(storageService.getData().routines[0]?.prefillSourceWorkoutId).toBe(newer.id)
    expect(detail.querySelector(
      'rrr-list-row[data-action="edit-prefill-source"]',
    )?.getAttribute('value-text')).toBe('Jun 2, 2026')

    detail.querySelector<HTMLElement>(
      'rrr-list-row[data-action="edit-prefill-source"] > button',
    )?.click()
    await Promise.resolve()
    const noneChoice = document.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-sheet rrr-list-row[data-prefill-source-id="__none__"]',
    )
    noneChoice!.checked = true
    noneChoice?.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(storageService.getData().routines[0]?.prefillSourceWorkoutId).toBeNull()
    expect(detail.querySelector(
      'rrr-list-row[data-action="edit-prefill-source"]',
    )?.getAttribute('value-text')).toBe('None')
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

    const sheet = document.querySelector('rrr-sheet')
    expect(sheet?.querySelector('.sheet-title')?.textContent).toBe('Delete routine?')
    expect(sheet?.querySelector('[data-action="cancel"]')).toBeNull()
    expect(sheet?.querySelector('[data-action="confirm"]')?.getAttribute('tone')).toBe('danger')
    expect(storageService.getData().routines.find(({ id }) => id === routine.id)?.archived).toBe(false)

    sheet?.querySelector<HTMLDialogElement>('dialog')?.dispatchEvent(new Event('cancel', { cancelable: true }))
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(storageService.getData().routines.find(({ id }) => id === routine.id)?.archived).toBe(false)

    detail
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="delete-routine"] > button')
      ?.click()
    document.querySelector<HTMLElement>('rrr-sheet [data-action="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(storageService.getData().routines.find(({ id }) => id === routine.id)?.archived).toBe(true)
    expect(window.location.hash).toBe('#/routines')
  })
})
