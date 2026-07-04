import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import { storageService } from '../app/storage-instance.ts'
import { RrrRoutineEditor } from '../app/components/routines/rrr-routine-editor.ts'

const natoPrefixPattern = '(Alpha|Bravo|Charlie|Delta|Echo|Foxtrot|Golf|Hotel|India|Juliett|Kilo|Lima|Mike|November|Oscar|Papa|Quebec|Romeo|Sierra|Tango|Uniform|Victor|Whiskey|X-ray|Yankee|Zulu)'

beforeAll(() => {
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

  initLocale('en-US')
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
})
