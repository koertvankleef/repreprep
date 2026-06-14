import { defineCustomElementOnce } from './shared.ts'
import styles from './rrr-card.css?inline'

export class RrrCard extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="card">
        <slot></slot>
      </section>
    `
  }
}

export function registerRrrCard(): void {
  defineCustomElementOnce('rrr-card', RrrCard)
}
