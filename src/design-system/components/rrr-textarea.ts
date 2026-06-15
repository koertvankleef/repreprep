import styles from './rrr-textarea.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const textareaSheet = new CSSStyleSheet()
textareaSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <label part="label" hidden></label>
  <textarea part="textarea"></textarea>
  <p class="error" part="error"></p>
`

export class RrrTextarea extends HTMLElement {
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
    'rows',
    'value',
  ]

  private readonly textarea: HTMLTextAreaElement
  private readonly label: HTMLLabelElement
  private readonly error: HTMLParagraphElement

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
    shadowRoot.adoptedStyleSheets = [textareaSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const textarea = shadowRoot.querySelector<HTMLTextAreaElement>('textarea')
    const label = shadowRoot.querySelector<HTMLLabelElement>('label')
    const error = shadowRoot.querySelector<HTMLParagraphElement>('p.error')

    if (!textarea || !label || !error) {
      throw new Error('rrr-textarea failed to initialize')
    }

    this.textarea = textarea
    this.label = label
    this.error = error
  }

  connectedCallback(): void {
    this.syncAll()

    this.textarea.addEventListener('input', () => {
      this.setAttribute('value', this.textarea.value)
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    })

    this.textarea.addEventListener('change', () => {
      this.setAttribute('value', this.textarea.value)
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
    return this.textarea.value
  }

  set value(nextValue: string) {
    this.setAttribute('value', nextValue)
  }

  private syncAll(): void {
    this.textarea.name = this.getAttribute('name') ?? ''
    this.textarea.placeholder = this.getAttribute('placeholder') ?? ''
    this.textarea.required = this.hasAttribute('required')
    this.textarea.rows = Number(this.getAttribute('rows') ?? '3') || 3

    const labelText = this.getAttribute('label') ?? ''
    this.label.textContent = labelText
    this.label.hidden = labelText.length === 0

    const value = this.getAttribute('value') ?? ''
    if (this.textarea.value !== value) {
      this.textarea.value = value
    }

    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel) {
      this.textarea.setAttribute('aria-label', ariaLabel)
    } else {
      this.textarea.removeAttribute('aria-label')
    }

    const describedBy = this.getAttribute('aria-describedby')
    if (describedBy) {
      this.textarea.setAttribute('aria-describedby', describedBy)
    } else {
      this.textarea.removeAttribute('aria-describedby')
    }

    reflectDisabled(this, this.textarea)
    this.syncError()
  }

  private syncError(): void {
    const isInvalid = this.hasAttribute('invalid')
    const errorText = this.getAttribute('error-text') ?? ''

    if (isInvalid && errorText) {
      this.textarea.setAttribute('aria-invalid', 'true')
      this.error.textContent = errorText
      return
    }

    this.textarea.removeAttribute('aria-invalid')
    this.error.textContent = ''
  }
}

export function registerRrrTextarea(): void {
  defineCustomElementOnce('rrr-textarea', RrrTextarea)
}
