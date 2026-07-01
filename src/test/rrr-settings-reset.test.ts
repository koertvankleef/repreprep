import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrButton } from '../design-system/components/rrr-button.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { registerRrrSheet } from '../design-system/components/rrr-sheet.ts'
import '../app/components/rrr-settings.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrButton()
  registerRrrListRow()
  registerRrrSection()
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
  initLocale('en-US')
})

describe('Settings reset-data flow', () => {
  test('uses an action row and validates the destructive action inside a sheet', async () => {
    const settings = document.createElement('rrr-settings')
    const clearRequest = vi.fn()
    settings.addEventListener('rrr-clear-data-request', clearRequest)
    document.body.append(settings)
    await Promise.resolve()

    const row = settings.querySelector('rrr-list-row[data-action="delete-app-data"]')
    expect(row?.getAttribute('tone')).toBe('danger')
    expect(row?.querySelector('rrr-icon[slot="leading"][name="delete"]')).not.toBeNull()
    expect(settings.querySelector('.danger-card-content')).toBeNull()
    expect(settings.querySelector('.reset-confirm-panel')).toBeNull()

    row?.querySelector<HTMLButtonElement>(':scope > button')?.click()

    const sheet = settings.querySelector('rrr-sheet')
    const input = sheet?.querySelector<HTMLInputElement>('input[name="reset-date-confirm"]')
    const confirm = sheet?.querySelector<HTMLElement>('[data-sheet-result="confirm"]')
    const confirmControl = confirm?.querySelector<HTMLButtonElement>('button[data-rrr-button-inner]')

    expect(sheet?.querySelector('.sheet-title')?.textContent).toBe('Reset app data')
    expect(sheet?.querySelector('[data-action="cancel"]')).toBeNull()
    expect(sheet?.querySelector('.reset-sheet-card.rrr-card')).not.toBeNull()
    expect(input?.placeholder).toBe('MMDDYYYY')
    expect(confirm?.hasAttribute('disabled')).toBe(true)

    confirmControl?.click()
    expect(clearRequest).not.toHaveBeenCalled()
    expect(sheet?.querySelector('dialog')?.open).toBe(true)

    if (input) {
      input.value = getTodayDigits('en-US')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    expect(confirm?.hasAttribute('disabled')).toBe(false)
    expect(sheet?.querySelector<HTMLElement>('.reset-confirm-hint')?.hidden).toBe(true)
    confirmControl?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 240))

    expect(clearRequest).toHaveBeenCalledOnce()
    expect(settings.querySelector('rrr-sheet')).toBeNull()
  })

  test('shows the separator-free date pattern in locale order', async () => {
    initLocale('nl-NL')
    const settings = document.createElement('rrr-settings')
    document.body.append(settings)
    await Promise.resolve()

    settings
      .querySelector<HTMLButtonElement>('rrr-list-row[data-action="delete-app-data"] > button')
      ?.click()

    const sheet = settings.querySelector('rrr-sheet')
    expect(sheet?.querySelector<HTMLInputElement>('input')?.placeholder).toBe('DDMMYYYY')
    expect(sheet?.querySelector('label')?.textContent).toContain('(DDMMYYYY)')

    sheet?.querySelector<HTMLDialogElement>('dialog')
      ?.dispatchEvent(new Event('cancel', { cancelable: true }))
    await new Promise((resolve) => window.setTimeout(resolve, 240))
  })
})

function getTodayDigits(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .formatToParts(new Date())
    .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
    .map((part) => part.value.replace(/\D/g, ''))
    .join('')
}
