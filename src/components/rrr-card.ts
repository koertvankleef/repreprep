const styles = `
  :host {
    display: block;
  }

  .card {
    background: var(--rrr-color-surface);
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    display: grid;
  }

  :host([size="md"]) .card {
    padding: var(--rrr-space-md);
    gap: var(--rrr-space-sm);
  }

  :host(:not([size])),
  :host([size="lg"]) {
    padding: 0;
  }

  :host(:not([size])) .card,
  :host([size="lg"]) .card {
    padding: var(--rrr-space-lg);
    gap: var(--rrr-space-md);
  }
`

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

customElements.define('rrr-card', RrrCard)
