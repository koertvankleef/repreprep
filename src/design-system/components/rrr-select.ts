import styles from './rrr-select.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const selectSheet = new CSSStyleSheet()
selectSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <label part="label" hidden></label>
  <div class="select-shell" part="shell">
    <select part="select"></select>
  </div>
  <p class="error" part="error"></p>
`

export class RrrSelect extends HTMLElement {
  static observedAttributes = [
    'aria-describedby',
    'aria-label',
    'disabled',
    'error-text',
    'invalid',
    'label',
    'name',
    'required',
    'value',
  ]

  private readonly select: HTMLSelectElement
  private readonly label: HTMLLabelElement
  private readonly error: HTMLParagraphElement
  private readonly observer: MutationObserver

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
    shadowRoot.adoptedStyleSheets = [selectSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const select = shadowRoot.querySelector<HTMLSelectElement>('select')
    const label = shadowRoot.querySelector<HTMLLabelElement>('label')
    const error = shadowRoot.querySelector<HTMLParagraphElement>('p.error')

    if (!select || !label || !error) {
      throw new Error('rrr-select failed to initialize')
    }

    this.select = select
    this.label = label
    this.error = error
    this.observer = new MutationObserver(() => {
      this.syncOptions()
      this.syncValue()
    })
  }

  connectedCallback(): void {
    this.syncAll()
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['label', 'value', 'selected', 'disabled'],
    })

    this.select.addEventListener('input', () => {
      this.setAttribute('value', this.select.value)
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    })

    this.select.addEventListener('change', () => {
      this.setAttribute('value', this.select.value)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })
  }

  disconnectedCallback(): void {
    this.observer.disconnect()
  }

  attributeChangedCallback(name: string): void {
    if (name === 'error-text' || name === 'invalid') {
      this.syncError()
      return
    }

    this.syncAll()
  }

  get value(): string {
    return this.select.value
  }

  set value(nextValue: string) {
    this.setAttribute('value', nextValue)
  }

  private syncAll(): void {
    this.select.name = this.getAttribute('name') ?? ''
    this.select.required = this.hasAttribute('required')

    const labelText = this.getAttribute('label') ?? ''
    this.label.textContent = labelText
    this.label.hidden = labelText.length === 0

    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel) {
      this.select.setAttribute('aria-label', ariaLabel)
    } else {
      this.select.removeAttribute('aria-label')
    }

    const describedBy = this.getAttribute('aria-describedby')
    if (describedBy) {
      this.select.setAttribute('aria-describedby', describedBy)
    } else {
      this.select.removeAttribute('aria-describedby')
    }

    reflectDisabled(this, this.select)
    this.syncOptions()
    this.syncValue()
    this.syncError()
  }

  private syncOptions(): void {
    const currentValue = this.select.value
    this.select.replaceChildren()

    const optionNodes = Array.from(this.children).filter((child) => child instanceof HTMLOptionElement || child instanceof HTMLOptGroupElement)
    optionNodes.forEach((node) => {
      this.select.appendChild(node.cloneNode(true))
    })

    if (!this.hasAttribute('value') && currentValue) {
      this.select.value = currentValue
    }
  }

  private syncValue(): void {
    if (this.hasAttribute('value')) {
      this.select.value = this.getAttribute('value') ?? ''
      return
    }

    if (this.select.value) {
      this.setAttribute('value', this.select.value)
    }
  }

  private syncError(): void {
    const isInvalid = this.hasAttribute('invalid')
    const errorText = this.getAttribute('error-text') ?? ''

    if (isInvalid && errorText) {
      this.select.setAttribute('aria-invalid', 'true')
      this.error.textContent = errorText
      return
    }

    this.select.removeAttribute('aria-invalid')
    this.error.textContent = ''
  }
}

export function registerRrrSelect(): void {
  defineCustomElementOnce('rrr-select', RrrSelect)
}
