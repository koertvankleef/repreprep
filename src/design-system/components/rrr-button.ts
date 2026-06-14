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
  static observedAttributes = ['disabled']

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
    this.syncDisabled()

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
    if (name === 'disabled') {
      this.syncDisabled()
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value)
  }

  private syncDisabled(): void {
    reflectDisabled(this, this.button)
  }
}

export function registerRrrButton(): void {
  defineCustomElementOnce('rrr-button', RrrButton)
}
