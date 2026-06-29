import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'

beforeAll(async () => {
  initLocale('en-US')

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

  const { registerRrrDialogHost } = await import('../design-system/components/rrr-dialog-host.ts')
  registerRrrDialogHost()
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('dialog service portal', () => {
  test('mounts the dialog host in the active application shadow root', async () => {
    const app = document.createElement('rrr-app')
    const root = app.attachShadow({ mode: 'open' })
    const trigger = document.createElement('button')
    root.appendChild(trigger)
    document.body.appendChild(app)
    trigger.focus()

    const { confirmDialog } = await import('../utils/dialog-service.ts')
    const result = confirmDialog({
      title: 'Delete workout',
      message: 'This cannot be undone.',
    })

    const dialogHost = root.querySelector('rrr-dialog-host')
    expect(dialogHost).not.toBeNull()
    expect(document.body.querySelector('rrr-dialog-host')).toBeNull()
    expect(dialogHost?.querySelector('dialog')?.open).toBe(true)

    dialogHost?.querySelector<HTMLElement>('rrr-button[data-action="cancel"]')?.click()
    await expect(result).resolves.toBe(false)
  })
})
