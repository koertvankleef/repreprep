import styles from './rrr-button.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const buttonSheet = new CSSStyleSheet()
buttonSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <button type="button" part="button">
    <slot></slot>
  </button>
`

export class RrrButton extends HTMLElement {
  static observedAttributes = ['aria-label', 'aria-pressed', 'title', 'disabled']

  private readonly button: HTMLButtonElement

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.adoptedStyleSheets = [buttonSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const button = shadowRoot.querySelector<HTMLButtonElement>('button')

    if (!button) {
      throw new Error('rrr-button failed to initialize')
    }

    this.button = button
  }

  connectedCallback(): void {
    this.syncAll()

    this.button.addEventListener('click', () => {
      if (this.button.disabled) {
        return
      }

      const type = this.getAttribute('type')
      const form = this.closest('form')

      if (type === 'submit') {
        form?.requestSubmit()
      } else if (type === 'reset') {
        form?.reset()
      }
    })
  }

  attributeChangedCallback(name: string): void {
    if (name === 'aria-label' || name === 'aria-pressed' || name === 'title' || name === 'disabled') {
      this.syncAll()
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value)
  }

  override focus(options?: FocusOptions): void {
    this.button.focus(options)
  }

  private syncAll(): void {
    const ariaLabel = this.getAttribute('aria-label')
    const ariaPressed = this.getAttribute('aria-pressed')
    const title = this.getAttribute('title')

    if (ariaLabel) {
      this.button.setAttribute('aria-label', ariaLabel)
    } else {
      this.button.removeAttribute('aria-label')
    }

    if (ariaPressed) {
      this.button.setAttribute('aria-pressed', ariaPressed)
    } else {
      this.button.removeAttribute('aria-pressed')
    }

    if (title) {
      this.button.setAttribute('title', title)
    } else {
      this.button.removeAttribute('title')
    }

    reflectDisabled(this, this.button)
  }
}

export function registerRrrButton(): void {
  defineCustomElementOnce('rrr-button', RrrButton)
}
