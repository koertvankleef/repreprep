import { defineCustomElementOnce } from './shared.ts'

type RowControl = 'radio' | 'checkbox' | 'switch'
type RowAccessory = 'none' | 'chevron' | 'value' | 'value-chevron' | 'badge' | 'custom'
type RowSlot = 'leading' | 'label' | 'body' | 'trailing'

const rowControls = new Set<RowControl>(['radio', 'checkbox', 'switch'])
const rowAccessories = new Set<RowAccessory>(['none', 'chevron', 'value', 'value-chevron', 'badge', 'custom'])
const rowSlots = new Set<RowSlot>(['leading', 'label', 'body', 'trailing'])

export class RrrListRow extends HTMLElement {
  static observedAttributes = [
    'accessory',
    'accept',
    'activation',
    'checked',
    'control',
    'description',
    'disabled',
    'href',
    'label',
    'multiple',
    'name',
    'selected',
    'value',
    'value-text',
  ]

  private controlElement: HTMLInputElement | null = null
  private fileInput: HTMLInputElement | null = null
  private controlTabIndex = 0
  private projectedContent: Record<RowSlot, Element[]> | null = null
  private renderQueued = false

  connectedCallback(): void {
    this.queueRender()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.queueRender()
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

  get files(): FileList | null {
    return this.fileInput?.files ?? null
  }

  clearFileSelection(): void {
    if (this.fileInput) {
      this.fileInput.value = ''
    }
  }

  setControlTabIndex(value: number): void {
    this.controlTabIndex = value
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
    if (this.fileInput) {
      this.fileInput.focus(options)
      return
    }

    if (this.controlElement) {
      this.controlElement.focus(options)
      return
    }

    const focusTarget = this.querySelector<HTMLElement>(':scope > .rrr-list-row__row')
    focusTarget?.focus(options)
  }

  private get accessory(): RowAccessory {
    const value = this.getAttribute('accessory') ?? 'none'
    return rowAccessories.has(value as RowAccessory) ? value as RowAccessory : 'none'
  }

  private queueRender(): void {
    if (this.renderQueued) {
      return
    }

    this.renderQueued = true
    queueMicrotask(() => {
      this.renderQueued = false
      if (this.isConnected) {
        this.render()
      }
    })
  }

  private render(): void {
    if (!this.projectedContent) {
      this.projectedContent = this.captureProjectedContent()
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
      const interactiveClass = control === 'radio'
        ? ''
        : ' rrr-list-row__row--interactive'
      rowMarkup = `
        <label class="rrr-row rrr-list-row__row rrr-list-row__row--control${interactiveClass}">
          ${content}
          <input
            class="rrr-list-row__control rrr-list-row__control--${control}"
            type="${inputType}"
            name="${this.escapeAttribute(this.name)}"
            value="${this.escapeAttribute(this.getAttribute('value') ?? 'on')}"
            tabindex="${this.controlTabIndex}"
            ${role}
            ${this.checked ? 'checked' : ''}
            ${disabled ? 'disabled' : ''}
          >
        </label>
      `
    } else if (href !== null) {
      rowMarkup = `
        <a
          class="rrr-row rrr-list-row__row rrr-list-row__row--interactive"
          ${disabled ? 'aria-disabled="true" tabindex="-1"' : `href="${this.escapeAttribute(href)}"`}
          ${this.hasAttribute('selected') ? 'aria-current="page"' : ''}
        >
          ${content}
        </a>
      `
    } else if (activation === 'file') {
      const accept = this.getAttribute('accept')
      rowMarkup = `
        <label class="rrr-row rrr-list-row__row rrr-list-row__row--interactive rrr-list-row__row--file">
          ${content}
          <input
            class="rrr-list-row__file-control"
            type="file"
            name="${this.escapeAttribute(this.name)}"
            ${accept !== null ? `accept="${this.escapeAttribute(accept)}"` : ''}
            ${this.hasAttribute('multiple') ? 'multiple' : ''}
            ${disabled ? 'disabled' : ''}
          >
        </label>
      `
    } else if (activation === 'button') {
      rowMarkup = `
        <button
          class="rrr-row rrr-list-row__row rrr-list-row__row--interactive"
          type="button"
          ${disabled ? 'disabled' : ''}
        >
          ${content}
        </button>
      `
    } else {
      rowMarkup = `<div class="rrr-row rrr-list-row__row">${content}</div>`
    }

    this.innerHTML = rowMarkup
    this.restoreProjectedContent()
    this.controlElement = this.querySelector<HTMLInputElement>(':scope > .rrr-list-row__row .rrr-list-row__control')
    this.fileInput = this.querySelector<HTMLInputElement>(':scope > .rrr-list-row__row .rrr-list-row__file-control')
    this.setAttribute('aria-disabled', disabled ? 'true' : 'false')

    this.controlElement?.addEventListener('change', (event) => {
      event.stopPropagation()
      this.checked = this.controlElement?.checked ?? false
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })

    this.fileInput?.addEventListener('change', (event) => {
      event.stopPropagation()
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })

    const disabledLink = this.querySelector<HTMLAnchorElement>(':scope > a[aria-disabled="true"]')
    disabledLink?.addEventListener('click', (event) => event.preventDefault())
    this.dispatchEvent(new CustomEvent('rrr-list-row-ready', { bubbles: true }))
  }

  private renderContent(): string {
    const label = this.hasProjectedContent('label')
      ? '<span class="rrr-list-row__label" data-row-slot="label"></span>'
      : `<span class="rrr-list-row__label">${this.escapeHtml(this.getAttribute('label') ?? '')}</span>`
    const description = this.getAttribute('description')
    const body = this.hasProjectedContent('body')
      ? '<span class="rrr-list-row__body" data-row-slot="body"></span>'
      : ''
    const leading = this.hasProjectedContent('leading')
      ? '<span class="rrr-list-row__leading" data-row-slot="leading"></span>'
      : ''
    const content = `
      <span class="rrr-list-row__content">
        ${label}
        ${description ? `<span class="rrr-list-row__description">${this.escapeHtml(description)}</span>` : ''}
        ${body}
      </span>
    `

    return `<span class="rrr-list-row__main">${leading}${content}</span>${this.renderAccessory()}`
  }

  private renderAccessory(): string {
    if (this.control) {
      return ''
    }

    const accessory = this.accessory
    const valueText = this.escapeHtml(this.getAttribute('value-text') ?? '')
    const value = valueText ? `<span class="rrr-list-row__value">${valueText}</span>` : ''
    const chevron = '<rrr-icon class="rrr-list-row__chevron" name="chevron-right"></rrr-icon>'

    if (accessory === 'chevron') {
      return `<span class="rrr-list-row__trailing">${chevron}</span>`
    }

    if (accessory === 'value') {
      return `<span class="rrr-list-row__trailing">${value}</span>`
    }

    if (accessory === 'value-chevron') {
      return `<span class="rrr-list-row__trailing">${value}${chevron}</span>`
    }

    if (accessory === 'badge') {
      return `
        <span class="rrr-list-row__trailing">
          <span class="rrr-list-row__badge">${valueText}</span>
        </span>
      `
    }

    if (accessory === 'custom') {
      return '<span class="rrr-list-row__trailing" data-row-slot="trailing"></span>'
    }

    return ''
  }

  private captureProjectedContent(): Record<RowSlot, Element[]> {
    const projectedContent: Record<RowSlot, Element[]> = {
      leading: [],
      label: [],
      body: [],
      trailing: [],
    }

    for (const child of Array.from(this.children)) {
      const slot = child.getAttribute('slot')
      if (slot && rowSlots.has(slot as RowSlot)) {
        projectedContent[slot as RowSlot].push(child)
      }
    }

    return projectedContent
  }

  private hasProjectedContent(slot: RowSlot): boolean {
    return (this.projectedContent?.[slot].length ?? 0) > 0
  }

  private restoreProjectedContent(): void {
    if (!this.projectedContent) {
      return
    }

    for (const slot of rowSlots) {
      const container = this.querySelector<HTMLElement>(`[data-row-slot="${slot}"]`)
      if (container) {
        container.append(...this.projectedContent[slot])
      }
    }
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
