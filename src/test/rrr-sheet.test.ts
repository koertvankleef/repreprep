import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { registerRrrSheet, type RrrSheet } from '../design-system/components/rrr-sheet.ts'
import { getTopSheetPresentation } from '../foundation/presentation-stack.ts'
import { toastService } from '../foundation/toast.ts'
import { confirmSheet, presentSheet } from '../utils/sheet-service.ts'

beforeAll(() => {
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
})

describe('sheet presentation', () => {
  test('stacks independent sheets and dismisses only the top sheet', async () => {
    const firstResult = confirmSheet({
      title: 'First task',
      message: 'First message',
      confirmLabel: 'Continue',
    })
    const secondResult = confirmSheet({
      title: 'Second task',
      message: 'Second message',
      confirmLabel: 'Continue',
    })

    const sheets = Array.from(document.querySelectorAll('rrr-sheet'))
    const firstDialog = sheets[0]?.querySelector<HTMLDialogElement>('dialog')
    const secondDialog = sheets[1]?.querySelector<HTMLDialogElement>('dialog')

    expect(sheets).toHaveLength(2)
    expect(firstDialog?.open).toBe(true)
    expect(secondDialog?.open).toBe(true)
    expect(getTopSheetPresentation()?.host).toBe(sheets[1])

    firstDialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(firstDialog?.hasAttribute('data-closing')).toBe(false)

    secondDialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
    await expect(secondResult).resolves.toBe(false)

    expect(firstDialog?.open).toBe(true)
    expect(getTopSheetPresentation()?.host).toBe(sheets[0])

    sheets[0]?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(firstResult).resolves.toBe(true)
  })

  test('dismisses from the backdrop and restores focus', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()

    const result = confirmSheet({
      title: 'Delete routine?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      confirmTone: 'danger',
    })
    const dialog = document.querySelector<HTMLDialogElement>('rrr-sheet dialog')

    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await expect(result).resolves.toBe(false)

    expect(document.activeElement).toBe(trigger)
  })

  test('dismisses after a deliberate downward handle drag', async () => {
    const result = confirmSheet({
      title: 'Drag sheet',
      message: 'Drag the handle down.',
      confirmLabel: 'Continue',
    })
    const handle = document.querySelector<HTMLElement>('[data-drag-handle]')

    handle?.dispatchEvent(pointerEvent('pointerdown', 1, 10))
    handle?.dispatchEvent(pointerEvent('pointermove', 1, 90))
    handle?.dispatchEvent(pointerEvent('pointerup', 1, 90))

    await expect(result).resolves.toBe(false)
  })

  test('presents authored heading, body, and action content without replacing it', async () => {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.textContent = 'Interactive task'
    const body = document.createElement('div')
    body.slot = 'body'
    body.innerHTML = '<label>Value <input autofocus></label>'
    const action = document.createElement('button')
    action.slot = 'actions'
    action.dataset.sheetResult = 'saved'
    action.textContent = 'Save'
    sheet.append(heading, body, action)

    const result = presentSheet(sheet)

    expect(sheet.querySelector('.sheet-content > h3')).toBe(heading)
    expect(sheet.querySelector('.sheet-body > [slot="body"]')).toBe(body)
    expect(sheet.querySelector('.sheet-actions > [slot="actions"]')).toBe(action)
    expect(document.activeElement).toBe(body.querySelector('input'))

    action.click()
    await expect(result).resolves.toBe('saved')
  })

  test('places toasts inside the top sheet presentation layer', async () => {
    const result = confirmSheet({
      title: 'Sheet with feedback',
      message: 'The toast belongs above this sheet.',
      confirmLabel: 'Done',
    })
    const dialog = document.querySelector<HTMLDialogElement>('rrr-sheet dialog')

    toastService.success('Saved', { durationMs: 10_000 })

    expect(dialog?.querySelector('#rrr-toast-root')).not.toBeNull()
    dialog?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(result).resolves.toBe(true)
    expect(document.body.querySelector('#rrr-toast-root')).not.toBeNull()
  })
})

function pointerEvent(type: string, pointerId: number, clientY: number): Event {
  const event = new MouseEvent(type, { bubbles: true, clientY })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  return event
}
