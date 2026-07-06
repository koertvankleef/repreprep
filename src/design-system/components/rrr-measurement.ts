import { escapeHtml } from '../../utils/html.ts'
import { defineCustomElementOnce } from './shared.ts'

export class RrrMeasurement extends HTMLElement {
  static observedAttributes = ['unit', 'value']

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render()
    }
  }

  private render(): void {
    const value = this.getAttribute('value') ?? ''
    const unit = this.getAttribute('unit') ?? ''

    this.innerHTML = `
      <span class="rrr-measurement__value">${escapeHtml(value)}</span>
      <span class="rrr-measurement__unit">${escapeHtml(unit)}</span>
    `
  }
}

export function registerRrrMeasurement(): void {
  defineCustomElementOnce('rrr-measurement', RrrMeasurement)
}
