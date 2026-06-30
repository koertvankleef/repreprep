import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import { getTopSheetPresentation } from '../foundation/presentation-stack.ts'
import { toastService } from '../foundation/toast.ts'
import { confirmSheet } from '../utils/sheet-service.ts'

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
