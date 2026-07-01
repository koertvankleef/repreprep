import type { RrrSheet } from './rrr-sheet.ts'
import type { RrrDatePicker } from './rrr-date-picker.ts'
import styles from './rrr-date-field.css?inline'
import { defineCustomElementOnce } from './shared.ts'

const fieldSheet = new CSSStyleSheet()
fieldSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <span class="label" id="label"></span>
  <button class="control" type="button" aria-haspopup="dialog" aria-labelledby="label value">
    <span class="value" id="value"></span>
    <rrr-icon name="calendar"></rrr-icon>
  </button>
  <p class="error" id="error"></p>
`

export class RrrDateField extends HTMLElement {
  static observedAttributes = [
    'confirm-label',
    'day-label',
    'disabled',
    'dismiss-label',
    'error-text',
    'invalid',
    'label',
    'locale',
    'max',
    'min',
    'month-label',
    'picker-title',
    'placeholder',
    'required',
    'value',
    'year-label',
  ]

  private readonly root: ShadowRoot
  private readonly labelElement: HTMLElement
  private readonly button: HTMLButtonElement
  private readonly valueElement: HTMLElement
  private readonly errorElement: HTMLElement
  private activeSheet: RrrSheet | null = null

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open', delegatesFocus: true })
    this.root.adoptedStyleSheets = [fieldSheet]
    this.root.append(template.content.cloneNode(true))

    this.labelElement = this.root.querySelector<HTMLElement>('.label')!
    this.button = this.root.querySelector<HTMLButtonElement>('.control')!
    this.valueElement = this.root.querySelector<HTMLElement>('.value')!
    this.errorElement = this.root.querySelector<HTMLElement>('.error')!
    this.button.addEventListener('click', () => void this.openPicker())
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    this.sync()
  }

  get value(): string {
    return this.getAttribute('value') ?? ''
  }

  set value(value: string) {
    this.setAttribute('value', value)
  }

  override focus(options?: FocusOptions): void {
    this.button.focus(options)
  }

  private sync(): void {
    const label = this.getAttribute('label') ?? ''
    const displayValue = this.formatValue(this.value)
    this.labelElement.textContent = label
    this.labelElement.hidden = label.length === 0
    this.valueElement.textContent = displayValue || this.getAttribute('placeholder') || ''
    this.valueElement.dataset.empty = displayValue ? 'false' : 'true'
    this.button.disabled = this.hasAttribute('disabled')
    this.button.setAttribute('aria-required', this.hasAttribute('required') ? 'true' : 'false')

    const invalid = this.hasAttribute('invalid')
    const errorText = invalid ? this.getAttribute('error-text') ?? '' : ''
    if (invalid) {
      this.button.setAttribute('aria-invalid', 'true')
    } else {
      this.button.removeAttribute('aria-invalid')
    }
    if (errorText) {
      this.button.setAttribute('aria-describedby', 'error')
    } else {
      this.button.removeAttribute('aria-describedby')
    }
    this.errorElement.textContent = errorText
  }

  private formatValue(value: string): string {
    if (!isIsoDate(value)) {
      return ''
    }

    return new Intl.DateTimeFormat(this.getAttribute('locale') || 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`))
  }

  private async openPicker(): Promise<void> {
    if (this.button.disabled || this.activeSheet) {
      return
    }

    const dismissLabel = this.getAttribute('dismiss-label') ?? ''
    if (!dismissLabel.trim()) {
      throw new Error('rrr-date-field requires a dismiss label')
    }

    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.className = 'sheet-title'
    heading.textContent = this.getAttribute('picker-title') ?? this.getAttribute('label') ?? ''

    const body = document.createElement('div')
    body.slot = 'body'
    body.className = 'date-picker-body'
    const picker = document.createElement('rrr-date-picker') as RrrDatePicker
    picker.setAttribute('autofocus', '')
    picker.setAttribute('value', isIsoDate(this.value) ? this.value : todayIso())
    for (const attribute of ['day-label', 'locale', 'max', 'min', 'month-label', 'year-label']) {
      const value = this.getAttribute(attribute)
      if (value !== null) {
        picker.setAttribute(attribute, value)
      }
    }
    body.append(picker)

    const confirm = document.createElement('rrr-button')
    confirm.slot = 'actions'
    confirm.setAttribute('type', 'button')
    confirm.setAttribute('data-sheet-result', 'confirm')
    confirm.textContent = this.getAttribute('confirm-label') ?? ''
    sheet.append(heading, body, confirm)
    this.getPresentationContainer().append(sheet)
    this.activeSheet = sheet

    try {
      const result = await sheet.present({ dismissLabel })
      if (result !== 'confirm') {
        return
      }

      this.value = picker.value
      this.removeAttribute('invalid')
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    } finally {
      this.activeSheet = null
    }
  }

  private getPresentationContainer(): HTMLElement | ShadowRoot {
    const root = this.getRootNode()
    return root instanceof Document ? root.body : root as ShadowRoot
  }
}

function isIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

function todayIso(): string {
  const now = new Date()
  return [
    String(now.getFullYear()).padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export function registerRrrDateField(): void {
  defineCustomElementOnce('rrr-date-field', RrrDateField)
}
