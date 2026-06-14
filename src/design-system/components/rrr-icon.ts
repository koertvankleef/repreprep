import styles from './rrr-icon.css?inline'
import { defineCustomElementOnce } from './shared.ts'

const iconSheet = new CSSStyleSheet()
iconSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <svg part="svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"></svg>
`

export class RrrIcon extends HTMLElement {
  static observedAttributes = ['name', 'label']

  private readonly svg: SVGElement

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.adoptedStyleSheets = [iconSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    const svg = shadowRoot.querySelector<SVGElement>('svg')
    if (!svg) {
      throw new Error('rrr-icon failed to initialize')
    }

    this.svg = svg
  }

  connectedCallback(): void {
    this.syncAll()
  }

  attributeChangedCallback(): void {
    this.syncAll()
  }

  private syncAll(): void {
    const name = this.getAttribute('name')?.trim()
    if (name) {
      const symbol = document.getElementById(`icon-${name}`)
      if (symbol instanceof SVGSymbolElement) {
        const viewBox = symbol.getAttribute('viewBox')
        if (viewBox) {
          this.svg.setAttribute('viewBox', viewBox)
        }

        this.svg.innerHTML = symbol.innerHTML
      } else {
        this.svg.innerHTML = ''
      }
    } else {
      this.svg.innerHTML = ''
    }

    const label = this.getAttribute('label')?.trim()
    if (label) {
      this.svg.setAttribute('role', 'img')
      this.svg.setAttribute('aria-label', label)
      this.svg.removeAttribute('aria-hidden')
    } else {
      this.svg.removeAttribute('role')
      this.svg.removeAttribute('aria-label')
      this.svg.setAttribute('aria-hidden', 'true')
    }
  }
}

export function registerRrrIcon(): void {
  defineCustomElementOnce('rrr-icon', RrrIcon)
}
