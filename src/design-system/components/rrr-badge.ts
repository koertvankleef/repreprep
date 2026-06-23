import { defineCustomElementOnce } from './shared.ts'
import styles from './rrr-badge.css?inline'
import { ensureStyleInRoot } from './style-manager.ts'

export class RrrBadge extends HTMLElement {
  connectedCallback(): void {
    const root = this.getRootNode()
    if (root instanceof Document || root instanceof ShadowRoot) {
      ensureStyleInRoot(root, 'rrr-badge', styles)
    }
  }
}

export function registerRrrBadge(): void {
  defineCustomElementOnce('rrr-badge', RrrBadge)
}
