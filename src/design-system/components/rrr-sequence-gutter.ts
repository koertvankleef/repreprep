import { escapeHtml } from '../../utils/html.ts'
import { defineCustomElementOnce } from './shared.ts'
import { registerRrrMeasurement } from './rrr-measurement.ts'

export class RrrSequenceGutter extends HTMLElement {
  static observedAttributes = [
    'action-label',
    'activation',
    'description',
    'disabled',
    'icon',
    'unit',
    'value',
  ]

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
    const description = this.getAttribute('description') ?? ''
    const iconName = this.getAttribute('icon') ?? ''
    const interactive = this.getAttribute('activation') === 'button'
    const content = `
      <span class="rrr-sequence-gutter__content">
        ${iconName
          ? `<rrr-icon name="${escapeHtml(iconName)}" class="rrr-sequence-gutter__icon"></rrr-icon>`
          : ''}
        <rrr-measurement
          value="${escapeHtml(value)}"
          unit="${escapeHtml(unit)}"
        ></rrr-measurement>
        ${description
          ? `<span class="rrr-sequence-gutter__description">${escapeHtml(description)}</span>`
          : ''}
      </span>
    `

    this.innerHTML = interactive
      ? `
        <button
          type="button"
          class="rrr-sequence-gutter__control"
          aria-label="${escapeHtml(
            this.getAttribute('action-label') || `${value} ${unit}`.trim(),
          )}"
          ${this.hasAttribute('disabled') ? 'disabled' : ''}
        >${content}</button>
      `
      : content
  }
}

export function registerRrrSequenceGutter(): void {
  registerRrrMeasurement()
  defineCustomElementOnce('rrr-sequence-gutter', RrrSequenceGutter)
}
