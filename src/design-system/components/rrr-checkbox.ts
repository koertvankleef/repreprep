import styles from './rrr-checkbox.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const checkboxSheet = new CSSStyleSheet()
checkboxSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <label part="label">
    <input part="input" type="checkbox" />
    <span part="text"><slot></slot></span>
  </label>
  <p class="error" part="error"></p>
`

export class RrrCheckbox extends HTMLElement {
  static observedAttributes = ['aria-label', 'checked', 'disabled', 'error-text', 'invalid', 'name', 'required', 'value']

  private readonly checkbox: HTMLInputElement
  private readonly error: HTMLParagraphElement

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
    shadowRoot.adoptedStyleSheets = [checkboxSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const checkbox = shadowRoot.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const error = shadowRoot.querySelector<HTMLParagraphElement>('p.error')

    if (!checkbox || !error) {
      throw new Error('rrr-checkbox failed to initialize')
    }

    this.checkbox = checkbox
    this.error = error
  }

  connectedCallback(): void {
    this.syncAll()

    this.checkbox.addEventListener('change', () => {
      this.toggleAttribute('checked', this.checkbox.checked)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })
  }

  attributeChangedCallback(): void {
    this.syncAll()
  }

  get checked(): boolean {
    return this.checkbox.checked
  }

  set checked(nextValue: boolean) {
    this.toggleAttribute('checked', nextValue)
  }

  private syncAll(): void {
    this.checkbox.checked = this.hasAttribute('checked')
    this.checkbox.required = this.hasAttribute('required')
    this.checkbox.name = this.getAttribute('name') ?? ''
    this.checkbox.value = this.getAttribute('value') ?? 'on'

    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel) {
      this.checkbox.setAttribute('aria-label', ariaLabel)
    } else {
      this.checkbox.removeAttribute('aria-label')
    }

    reflectDisabled(this, this.checkbox)

    const isInvalid = this.hasAttribute('invalid')
    const errorText = this.getAttribute('error-text') ?? ''

    if (isInvalid && errorText) {
      this.checkbox.setAttribute('aria-invalid', 'true')
      this.error.textContent = errorText
      return
    }

    this.checkbox.removeAttribute('aria-invalid')
    this.error.textContent = ''
  }
}

export function registerRrrCheckbox(): void {
  defineCustomElementOnce('rrr-checkbox', RrrCheckbox)
}
