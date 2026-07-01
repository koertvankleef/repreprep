import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

type DateFieldElement = HTMLElement & { value: string }
type DatePickerElement = HTMLElement & { value: string }

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

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
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

  const { registerRrrButton } = await import('../design-system/components/rrr-button.ts')
  const { registerRrrDateField } = await import('../design-system/components/rrr-date-field.ts')
  const { registerRrrDatePicker } = await import('../design-system/components/rrr-date-picker.ts')
  const { registerRrrSheet } = await import('../design-system/components/rrr-sheet.ts')
  registerRrrButton()
  registerRrrDatePicker()
  registerRrrDateField()
  registerRrrSheet()
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('date picker', () => {
  test('uses locale field order and accessible spinbutton semantics', () => {
    const picker = document.createElement('rrr-date-picker') as DatePickerElement
    picker.setAttribute('value', '2024-02-29')
    picker.setAttribute('locale', 'en-US')
    picker.setAttribute('day-label', 'Day')
    picker.setAttribute('month-label', 'Month')
    picker.setAttribute('year-label', 'Year')
    document.body.append(picker)

    const wheels = Array.from(picker.shadowRoot?.querySelectorAll<HTMLElement>('[role="spinbutton"]') ?? [])
    expect(wheels.map((wheel) => wheel.getAttribute('aria-label'))).toEqual(['Month', 'Day', 'Year'])
    expect(wheels[0]?.getAttribute('aria-valuetext')).toBe('February')
    expect(wheels[1]?.getAttribute('aria-valuenow')).toBe('29')

    const input = vi.fn()
    picker.addEventListener('input', input)
    wheels[2]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    expect(picker.value).toBe('2025-02-28')
    expect(input).toHaveBeenCalledOnce()
  })

  test('uses day-month-year order for Dutch', () => {
    const picker = document.createElement('rrr-date-picker')
    picker.setAttribute('value', '2026-07-01')
    picker.setAttribute('locale', 'nl-NL')
    picker.setAttribute('day-label', 'Dag')
    picker.setAttribute('month-label', 'Maand')
    picker.setAttribute('year-label', 'Jaar')
    document.body.append(picker)

    const labels = Array.from(picker.shadowRoot?.querySelectorAll('[role="spinbutton"]') ?? [])
      .map((wheel) => wheel.getAttribute('aria-label'))
    expect(labels).toEqual(['Dag', 'Maand', 'Jaar'])
  })
})

describe('sheet-backed date field', () => {
  test('displays a localized date while retaining its ISO value', () => {
    const field = createDateField('2026-07-01', 'nl-NL')
    document.body.append(field)

    expect(field.value).toBe('2026-07-01')
    expect(field.shadowRoot?.querySelector('.value')?.textContent).toBe('1 juli 2026')
    expect(field.shadowRoot?.querySelector('button')?.getAttribute('aria-haspopup')).toBe('dialog')
  })

  test('discards a temporary selection when dismissed', async () => {
    const field = createDateField('2026-07-01', 'en-US')
    const change = vi.fn()
    field.addEventListener('change', change)
    document.body.append(field)

    field.shadowRoot?.querySelector<HTMLButtonElement>('.control')?.click()
    const picker = document.querySelector<DatePickerElement>('rrr-date-picker')
    expect(picker?.shadowRoot?.activeElement?.getAttribute('role')).toBe('spinbutton')
    if (picker) picker.value = '2026-07-02'

    document.querySelector<HTMLButtonElement>('.sheet-assistive-dismiss')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 0))

    expect(field.value).toBe('2026-07-01')
    expect(change).not.toHaveBeenCalled()
  })

  test('mounts its sheet in the surrounding presentation root', async () => {
    const host = document.createElement('div')
    const presentationRoot = host.attachShadow({ mode: 'open' })
    const field = createDateField('2026-07-01', 'en-US')
    presentationRoot.append(field)
    document.body.append(host)

    field.shadowRoot?.querySelector<HTMLButtonElement>('.control')?.click()

    expect(field.shadowRoot?.querySelector('rrr-sheet')).toBeNull()
    expect(presentationRoot.querySelector('rrr-sheet h3')?.textContent).toBe('Workout date')

    presentationRoot.querySelector<HTMLButtonElement>('.sheet-assistive-dismiss')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  test('commits a temporary selection only when confirmed', async () => {
    const field = createDateField('2026-07-01', 'en-US')
    const input = vi.fn()
    const change = vi.fn()
    field.addEventListener('input', input)
    field.addEventListener('change', change)
    document.body.append(field)

    field.shadowRoot?.querySelector<HTMLButtonElement>('.control')?.click()
    const picker = document.querySelector<DatePickerElement>('rrr-date-picker')
    if (picker) picker.value = '2026-07-02'
    document.querySelector<HTMLElement>('[data-sheet-result="confirm"]')?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 0))

    expect(field.value).toBe('2026-07-02')
    expect(input).toHaveBeenCalledOnce()
    expect(change).toHaveBeenCalledOnce()
    expect(field.shadowRoot?.querySelector('.value')?.textContent).toBe('July 2, 2026')
  })
})

function createDateField(value: string, locale: string): DateFieldElement {
  const field = document.createElement('rrr-date-field') as DateFieldElement
  field.setAttribute('label', 'Date')
  field.setAttribute('value', value)
  field.setAttribute('locale', locale)
  field.setAttribute('picker-title', 'Workout date')
  field.setAttribute('confirm-label', 'Confirm')
  field.setAttribute('dismiss-label', 'Close')
  field.setAttribute('day-label', 'Day')
  field.setAttribute('month-label', 'Month')
  field.setAttribute('year-label', 'Year')
  return field
}
