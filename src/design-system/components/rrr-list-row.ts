import { defineCustomElementOnce } from './shared.ts'
import styles from './rrr-list-row.css?inline'

type RowControl = 'radio' | 'checkbox' | 'switch'
type RowAccessory = 'none' | 'chevron' | 'value' | 'value-chevron' | 'badge' | 'custom'

const rowControls = new Set<RowControl>(['radio', 'checkbox', 'switch'])
const rowAccessories = new Set<RowAccessory>(['none', 'chevron', 'value', 'value-chevron', 'badge', 'custom'])

export class RrrListRow extends HTMLElement {
  static observedAttributes = [
    'accessory',
    'activation',
    'checked',
    'control',
    'description',
    'destructive',
    'disabled',
    'href',
    'label',
    'name',
    'selected',
    'value',
    'value-text',
  ]

  private controlElement: HTMLInputElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render()
    }
  }

  get control(): RowControl | null {
    const value = this.getAttribute('control')
    return value && rowControls.has(value as RowControl) ? value as RowControl : null
  }

  get name(): string {
    return this.getAttribute('name') ?? ''
  }

  get checked(): boolean {
    return this.hasAttribute('checked')
  }

  set checked(value: boolean) {
    this.toggleAttribute('checked', value)
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  setControlTabIndex(value: number): void {
    if (this.controlElement) {
      this.controlElement.tabIndex = value
    }
  }

  selectControl(): void {
    if (!this.controlElement || this.disabled) {
      return
    }

    if (!this.checked) {
      this.checked = true
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }

    this.controlElement.focus()
  }

  override focus(options?: FocusOptions): void {
    const focusTarget = this.shadowRoot?.querySelector<HTMLElement>('.row')
    focusTarget?.focus(options)
  }

  private get accessory(): RowAccessory {
    const value = this.getAttribute('accessory') ?? 'none'
    return rowAccessories.has(value as RowAccessory) ? value as RowAccessory : 'none'
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    const content = this.renderContent()
    const control = this.control
    const href = this.getAttribute('href')
    const activation = this.getAttribute('activation')
    const disabled = this.disabled

    let rowMarkup: string
    if (control) {
      const inputType = control === 'radio' ? 'radio' : 'checkbox'
      const role = control === 'switch' ? ' role="switch"' : ''
      rowMarkup = `
        <label class="row row--control">
          ${content}
          <input
            class="control control--${control}"
            type="${inputType}"
            name="${this.escapeAttribute(this.name)}"
            value="${this.escapeAttribute(this.getAttribute('value') ?? 'on')}"
            ${role}
            ${this.checked ? 'checked' : ''}
            ${disabled ? 'disabled' : ''}
          >
        </label>
      `
    } else if (href !== null) {
      rowMarkup = `
        <a
          class="row row--interactive"
          ${disabled ? 'aria-disabled="true" tabindex="-1"' : `href="${this.escapeAttribute(href)}"`}
          ${this.hasAttribute('selected') ? 'aria-current="page"' : ''}
        >
          ${content}
        </a>
      `
    } else if (activation === 'button') {
      rowMarkup = `
        <button class="row row--interactive" type="button" ${disabled ? 'disabled' : ''}>
          ${content}
        </button>
      `
    } else {
      rowMarkup = `<div class="row">${content}</div>`
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${rowMarkup}`
    this.controlElement = this.shadowRoot.querySelector<HTMLInputElement>('input.control')
    this.setAttribute('aria-disabled', disabled ? 'true' : 'false')

    this.controlElement?.addEventListener('change', (event) => {
      event.stopPropagation()
      this.checked = this.controlElement?.checked ?? false
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })

    const disabledLink = this.shadowRoot.querySelector<HTMLAnchorElement>('a[aria-disabled="true"]')
    disabledLink?.addEventListener('click', (event) => event.preventDefault())
  }

  private renderContent(): string {
    const label = this.escapeHtml(this.getAttribute('label') ?? '')
    const description = this.getAttribute('description')
    const body = this.querySelector('[slot="body"]')
      ? '<span class="body"><slot name="body"></slot></span>'
      : ''
    const leading = this.querySelector('[slot="leading"]')
      ? '<span class="leading"><slot name="leading"></slot></span>'
      : ''
    const content = `
      <span class="content">
        <span class="label">${label}</span>
        ${description ? `<span class="description">${this.escapeHtml(description)}</span>` : ''}
        ${body}
      </span>
    `

    return `<span class="main">${leading}${content}</span>${this.renderAccessory()}`
  }

  private renderAccessory(): string {
    if (this.control) {
      return ''
    }

    const accessory = this.accessory
    const valueText = this.escapeHtml(this.getAttribute('value-text') ?? '')
    const value = valueText ? `<span class="value">${valueText}</span>` : ''
    const chevron = '<rrr-icon class="chevron" name="chevron-right"></rrr-icon>'

    if (accessory === 'chevron') {
      return `<span class="trailing">${chevron}</span>`
    }

    if (accessory === 'value') {
      return `<span class="trailing">${value}</span>`
    }

    if (accessory === 'value-chevron') {
      return `<span class="trailing">${value}${chevron}</span>`
    }

    if (accessory === 'badge') {
      return `<span class="trailing"><span class="badge">${valueText}</span></span>`
    }

    if (accessory === 'custom') {
      return '<span class="trailing"><slot name="trailing"></slot></span>'
    }

    return ''
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#039;')
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value)
  }
}

export function registerRrrListRow(): void {
  defineCustomElementOnce('rrr-list-row', RrrListRow)
}
