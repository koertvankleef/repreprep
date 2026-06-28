import { defineCustomElementOnce } from './shared.ts'
import type { RrrListRow } from './rrr-list-row.ts'
import styles from './rrr-list-card.css?inline'

const radioKeys = new Set(['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'])

export class RrrListCard extends HTMLElement {
  private readonly handleChange = (event: Event): void => {
    const row = this.findRadioRow(event)
    if (!row?.checked) {
      return
    }

    for (const candidate of this.getRadioRows(row.name)) {
      if (candidate !== row) {
        candidate.checked = false
      }
    }

    this.syncRadioTabStops(row.name)
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!radioKeys.has(event.key)) {
      return
    }

    const row = this.findRadioRow(event)
    if (!row || row.disabled) {
      return
    }

    const rows = this.getRadioRows(row.name).filter((candidate) => !candidate.disabled)
    const currentIndex = rows.indexOf(row)
    if (currentIndex < 0 || rows.length === 0) {
      return
    }

    let nextIndex = currentIndex
    if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = rows.length - 1
    } else {
      const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
      nextIndex = (currentIndex + delta + rows.length) % rows.length
    }

    event.preventDefault()
    rows[nextIndex]?.selectControl()
  }

  private readonly handleSlotChange = (): void => {
    this.syncAllRadioTabStops()
  }

  constructor() {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="card">
        <slot></slot>
      </div>
    `
  }

  connectedCallback(): void {
    this.addEventListener('change', this.handleChange)
    this.addEventListener('keydown', this.handleKeyDown)
    this.shadowRoot?.addEventListener('slotchange', this.handleSlotChange)
    queueMicrotask(() => this.syncAllRadioTabStops())
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.handleChange)
    this.removeEventListener('keydown', this.handleKeyDown)
    this.shadowRoot?.removeEventListener('slotchange', this.handleSlotChange)
  }

  private findRadioRow(event: Event): RrrListRow | undefined {
    return event
      .composedPath()
      .find((node): node is RrrListRow => node instanceof HTMLElement
        && node.tagName.toLowerCase() === 'rrr-list-row'
        && (node as RrrListRow).control === 'radio')
  }

  private getRadioRows(name: string): RrrListRow[] {
    return Array.from(this.querySelectorAll<RrrListRow>('rrr-list-row[control="radio"]'))
      .filter((row) => row.name === name)
  }

  private syncAllRadioTabStops(): void {
    const names = new Set(
      Array.from(this.querySelectorAll<RrrListRow>('rrr-list-row[control="radio"]'))
        .map((row) => row.name),
    )

    for (const name of names) {
      this.syncRadioTabStops(name)
    }
  }

  private syncRadioTabStops(name: string): void {
    const rows = this.getRadioRows(name).filter((row) => !row.disabled)
    const activeRow = rows.find((row) => row.checked) ?? rows[0]

    for (const row of rows) {
      row.setControlTabIndex(row === activeRow ? 0 : -1)
    }
  }
}

export function registerRrrListCard(): void {
  defineCustomElementOnce('rrr-list-card', RrrListCard)
}
