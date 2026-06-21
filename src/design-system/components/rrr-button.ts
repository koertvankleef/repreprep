import styles from './rrr-button.css?inline'
import { defineCustomElementOnce, reflectDisabled } from './shared.ts'

const styledRoots = new WeakSet<Document | ShadowRoot>()

function ensureButtonStyles(root: Document | ShadowRoot): void {
  if (styledRoots.has(root)) {
    return
  }

  const style = document.createElement('style')
  style.setAttribute('data-rrr-button-styles', 'true')
  style.textContent = styles

  if (root instanceof ShadowRoot) {
    root.appendChild(style)
  } else {
    root.head.appendChild(style)
  }

  styledRoots.add(root)
}

export class RrrButton extends HTMLElement {
  static observedAttributes = ['aria-label', 'aria-pressed', 'title', 'disabled']

  private button!: HTMLButtonElement
  private isInitialized = false

  constructor() {
    super()
  }

  connectedCallback(): void {
    const root = this.getRootNode()
    if (root instanceof Document || root instanceof ShadowRoot) {
      ensureButtonStyles(root)
    }

    if (!this.isInitialized) {
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('part', 'button')
      button.setAttribute('data-rrr-button-inner', 'true')

      while (this.firstChild) {
        button.appendChild(this.firstChild)
      }

      this.appendChild(button)
      this.button = button
      this.isInitialized = true

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

    this.syncAll()
    this.syncContentState()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isInitialized) {
      return
    }

    if (name === 'aria-label' || name === 'aria-pressed' || name === 'title' || name === 'disabled') {
      this.syncAll()
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value)
  }

  override focus(options?: FocusOptions): void {
    this.button.focus(options)
  }

  private syncAll(): void {
    if (!this.isInitialized) {
      return
    }

    const ariaLabel = this.getAttribute('aria-label')
    const ariaPressed = this.getAttribute('aria-pressed')
    const title = this.getAttribute('title')

    if (ariaLabel) {
      this.button.setAttribute('aria-label', ariaLabel)
    } else {
      this.button.removeAttribute('aria-label')
    }

    if (ariaPressed) {
      this.button.setAttribute('aria-pressed', ariaPressed)
    } else {
      this.button.removeAttribute('aria-pressed')
    }

    if (title) {
      this.button.setAttribute('title', title)
    } else {
      this.button.removeAttribute('title')
    }

    reflectDisabled(this, this.button)
    this.syncContentState()
  }

  private syncContentState(): void {
    const contentNodes = Array.from(this.button.childNodes)
    const hasVisibleText = contentNodes.some((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? '').trim().length > 0
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element

        if (element.tagName.toLowerCase() === 'rrr-icon') {
          return false
        }

        return (element.textContent ?? '').trim().length > 0
      }

      return false
    })

    this.toggleAttribute('icon-only', contentNodes.length > 0 && !hasVisibleText)
  }
}

export function registerRrrButton(): void {
  defineCustomElementOnce('rrr-button', RrrButton)
}
