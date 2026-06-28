import { defineCustomElementOnce } from './shared.ts'
import styles from './rrr-section.css?inline'

export class RrrSection extends HTMLElement {
  static observedAttributes = ['heading-level']

  private readonly handleSlotChange = (): void => {
    this.syncHeader()
  }

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="section">
        <header class="header">
          <div class="heading" role="heading">
            <slot name="heading"></slot>
          </div>
          <div class="description">
            <slot name="description"></slot>
          </div>
        </header>
        <slot></slot>
      </section>
    `
  }

  connectedCallback(): void {
    this.shadowRoot?.addEventListener('slotchange', this.handleSlotChange)
    this.syncHeadingLevel()
    this.syncHeader()
  }

  disconnectedCallback(): void {
    this.shadowRoot?.removeEventListener('slotchange', this.handleSlotChange)
  }

  attributeChangedCallback(): void {
    this.syncHeadingLevel()
  }

  private syncHeadingLevel(): void {
    const heading = this.shadowRoot?.querySelector<HTMLElement>('.heading')
    const requestedLevel = Number.parseInt(this.getAttribute('heading-level') ?? '2', 10)
    const headingLevel = Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 6
      ? requestedLevel
      : 2

    heading?.setAttribute('aria-level', String(headingLevel))
  }

  private syncHeader(): void {
    const header = this.shadowRoot?.querySelector<HTMLElement>('.header')
    const heading = this.shadowRoot?.querySelector<HTMLElement>('.heading')
    const description = this.shadowRoot?.querySelector<HTMLElement>('.description')
    if (header) {
      header.hidden = !this.querySelector('[slot="heading"], [slot="description"]')
    }
    if (heading) {
      heading.hidden = !this.querySelector('[slot="heading"]')
    }
    if (description) {
      description.hidden = !this.querySelector('[slot="description"]')
    }
  }
}

export function registerRrrSection(): void {
  defineCustomElementOnce('rrr-section', RrrSection)
}
