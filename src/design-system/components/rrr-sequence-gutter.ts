import { defineCustomElementOnce } from './shared.ts'

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
        <span class="rrr-sequence-gutter__measurement">
          <span class="rrr-sequence-gutter__value">${escapeHtml(value)}</span>
          <span class="rrr-sequence-gutter__unit">${escapeHtml(unit)}</span>
        </span>
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function registerRrrSequenceGutter(): void {
  defineCustomElementOnce('rrr-sequence-gutter', RrrSequenceGutter)
}
