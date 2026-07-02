import { defineCustomElementOnce } from './shared.ts'

export class RrrSequenceGutter extends HTMLElement {
  static observedAttributes = ['description', 'label']

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render()
    }
  }

  private render(): void {
    const label = this.getAttribute('label') ?? ''
    const description = this.getAttribute('description') ?? ''
    const iconName = this.getAttribute('icon') ?? ''

    this.innerHTML = `
      <span class="rrr-sequence-gutter__content">
        ${iconName
          ? `<rrr-icon name="${iconName}" class="rrr-sequence-gutter__icon"></rrr-icon>`
          : ''}        
        <span class="rrr-sequence-gutter__label">${escapeHtml(label)}</span>
        ${description
          ? `<span class="rrr-sequence-gutter__description">${escapeHtml(description)}</span>`
          : ''}
      </span>
    `
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function registerRrrSequenceGutter(): void {
  defineCustomElementOnce('rrr-sequence-gutter', RrrSequenceGutter)
}
