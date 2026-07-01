import { defineCustomElementOnce } from './shared.ts'

const sequenceItemSelector = 'rrr-list-row, rrr-sequence-gutter, [data-sequence-item]'

export class RrrSequence extends HTMLElement {
  private readonly observer = new MutationObserver(() => {
    this.syncSemantics()
  })

  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'list')
    }

    this.observer.observe(this, { childList: true })
    this.syncSemantics()
  }

  disconnectedCallback(): void {
    this.observer.disconnect()
  }

  private syncSemantics(): void {
    for (const child of Array.from(this.children)) {
      if (child.matches(sequenceItemSelector) && !child.hasAttribute('role')) {
        child.setAttribute('role', 'listitem')
      }
    }
  }
}

export function registerRrrSequence(): void {
  defineCustomElementOnce('rrr-sequence', RrrSequence)
}
