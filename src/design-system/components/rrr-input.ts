import styles from './rrr-input.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const inputSheet = new CSSStyleSheet()
inputSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <label part="label" hidden></label>
  <input part="input" />
  <p class="error" part="error" hidden></p>
`

const allowedTypes = new Set(['text', 'email', 'password', 'search', 'number', 'url', 'tel', 'date'])

export class RrrInput extends HTMLElement {
  static observedAttributes = [
    'aria-describedby',
    'aria-label',
    'disabled',
    'error-text',
    'invalid',
    'label',
    'name',
    'placeholder',
    'required',
    'type',
    'value',
  ]

  private readonly input: HTMLInputElement
  private readonly label: HTMLLabelElement
  private readonly error: HTMLParagraphElement

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
    shadowRoot.adoptedStyleSheets = [inputSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const input = shadowRoot.querySelector<HTMLInputElement>('input')
    const label = shadowRoot.querySelector<HTMLLabelElement>('label')
    const error = shadowRoot.querySelector<HTMLParagraphElement>('p.error')

    if (!input || !label || !error) {
      throw new Error('rrr-input failed to initialize')
    }

    this.input = input
    this.label = label
    this.error = error
  }

  connectedCallback(): void {
    this.syncAll()

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

  private syncAll(): void {
    const nextType = this.getAttribute('type') ?? 'text'
    this.input.type = allowedTypes.has(nextType) ? nextType : 'text'
    this.input.name = this.getAttribute('name') ?? ''
    this.input.placeholder = this.getAttribute('placeholder') ?? ''
    this.input.required = this.hasAttribute('required')

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

  private syncError(): void {
    const isInvalid = this.hasAttribute('invalid')
    const errorText = this.getAttribute('error-text') ?? ''

    if (isInvalid && errorText) {
      this.input.setAttribute('aria-invalid', 'true')
      this.error.textContent = errorText
      this.error.hidden = false
      return
    }

    this.input.removeAttribute('aria-invalid')
    this.error.textContent = ''
    this.error.hidden = true
  }
}

export function registerRrrInput(): void {
  defineCustomElementOnce('rrr-input', RrrInput)
}
