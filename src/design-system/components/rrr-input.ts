import styles from './rrr-input.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const inputSheet = new CSSStyleSheet()
inputSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <label part="label" hidden></label>
  <div class="control" part="control">
    <slot name="start"></slot>
    <input part="input" />
    <slot name="end"></slot>
  </div>
  <p class="error" part="error"></p>
`

const allowedTypes = new Set(['text', 'email', 'password', 'search', 'number', 'url', 'tel', 'date'])

export class RrrInput extends HTMLElement {
  static observedAttributes = [
    'aria-describedby',
    'aria-label',
    'disabled',
    'enterkeyhint',
    'error-text',
    'invalid',
    'label',
    'max',
    'min',
    'name',
    'placeholder',
    'required',
    'step',
    'type',
    'value',
  ]

  private readonly input: HTMLInputElement
  private readonly label: HTMLLabelElement
  private readonly error: HTMLParagraphElement
  private readonly startSlot: HTMLSlotElement
  private readonly endSlot: HTMLSlotElement

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
    shadowRoot.adoptedStyleSheets = [inputSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const input = shadowRoot.querySelector<HTMLInputElement>('input')
    const label = shadowRoot.querySelector<HTMLLabelElement>('label')
    const error = shadowRoot.querySelector<HTMLParagraphElement>('p.error')
    const startSlot = shadowRoot.querySelector<HTMLSlotElement>('slot[name="start"]')
    const endSlot = shadowRoot.querySelector<HTMLSlotElement>('slot[name="end"]')

    if (!input || !label || !error || !startSlot || !endSlot) {
      throw new Error('rrr-input failed to initialize')
    }

    this.input = input
    this.label = label
    this.error = error
    this.startSlot = startSlot
    this.endSlot = endSlot

    this.startSlot.addEventListener('slotchange', () => {
      this.syncSlotState()
    })
    this.endSlot.addEventListener('slotchange', () => {
      this.syncSlotState()
    })
  }

  connectedCallback(): void {
    this.syncAll()
    this.syncSlotState()

    this.input.addEventListener('input', () => {
      this.setAttribute('value', this.input.value)
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    })

    this.input.addEventListener('change', () => {
      this.setAttribute('value', this.input.value)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })
  }

  attributeChangedCallback(name: string): void {
    if (name === 'error-text' || name === 'invalid') {
      this.syncError()
      return
    }

    this.syncAll()
  }

  get value(): string {
    return this.input.value
  }

  set value(nextValue: string) {
    this.setAttribute('value', nextValue)
  }

  override focus(options?: FocusOptions): void {
    this.input.focus(options)
  }

  private syncAll(): void {
    const nextType = this.getAttribute('type') ?? 'text'
    this.input.type = allowedTypes.has(nextType) ? nextType : 'text'
    this.input.name = this.getAttribute('name') ?? ''
    this.input.placeholder = this.getAttribute('placeholder') ?? ''
    this.input.required = this.hasAttribute('required')
    this.reflectOptionalAttribute('enterkeyhint')
    this.reflectOptionalAttribute('min')
    this.reflectOptionalAttribute('max')
    this.reflectOptionalAttribute('step')

    const labelText = this.getAttribute('label') ?? ''
    this.label.textContent = labelText
    this.label.hidden = labelText.length === 0

    const value = this.getAttribute('value') ?? ''
    if (this.input.value !== value) {
      this.input.value = value
    }

    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel) {
      this.input.setAttribute('aria-label', ariaLabel)
    } else {
      this.input.removeAttribute('aria-label')
    }

    const describedBy = this.getAttribute('aria-describedby')
    if (describedBy) {
      this.input.setAttribute('aria-describedby', describedBy)
    } else {
      this.input.removeAttribute('aria-describedby')
    }

    reflectDisabled(this, this.input)
    this.syncError()
  }

  private reflectOptionalAttribute(name: 'enterkeyhint' | 'min' | 'max' | 'step'): void {
    const value = this.getAttribute(name)
    if (value === null) {
      this.input.removeAttribute(name)
      return
    }

    this.input.setAttribute(name, value)
  }

  private syncError(): void {
    const isInvalid = this.hasAttribute('invalid')
    const errorText = this.getAttribute('error-text') ?? ''

    if (isInvalid && errorText) {
      this.input.setAttribute('aria-invalid', 'true')
      this.error.textContent = errorText
      return
    }

    this.input.removeAttribute('aria-invalid')
    this.error.textContent = ''
  }

  private syncSlotState(): void {
    this.toggleAttribute('has-start', this.startSlot.assignedElements({ flatten: true }).length > 0)
    this.toggleAttribute('has-end', this.endSlot.assignedElements({ flatten: true }).length > 0)
  }
}

export function registerRrrInput(): void {
  defineCustomElementOnce('rrr-input', RrrInput)
}
