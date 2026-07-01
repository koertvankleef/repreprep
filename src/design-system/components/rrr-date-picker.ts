import styles from './rrr-date-picker.css?inline'
import { defineCustomElementOnce } from './shared.ts'

type DatePart = 'day' | 'month' | 'year'
type DateValue = { day: number; month: number; year: number }

const dateParts = new Set<DatePart>(['day', 'month', 'year'])
const pickerSheet = new CSSStyleSheet()
pickerSheet.replaceSync(styles)

export class RrrDatePicker extends HTMLElement {
  static observedAttributes = [
    'day-label',
    'locale',
    'max',
    'min',
    'month-label',
    'value',
    'year-label',
  ]

  private readonly root: ShadowRoot

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open', delegatesFocus: true })
    this.root.adoptedStyleSheets = [pickerSheet]
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render()
    }
  }

  get value(): string {
    return toIsoDate(clampDate(this.getDate(), this.getMinDate(), this.getMaxDate()))
  }

  set value(value: string) {
    this.setAttribute('value', value)
  }

  override focus(options?: FocusOptions): void {
    this.root.querySelector<HTMLElement>('[role="spinbutton"]')?.focus(options)
  }

  private getDate(): DateValue {
    return parseIsoDate(this.getAttribute('value')) ?? today()
  }

  private getMinDate(): DateValue {
    return parseIsoDate(this.getAttribute('min')) ?? { year: 1900, month: 1, day: 1 }
  }

  private getMaxDate(): DateValue {
    return parseIsoDate(this.getAttribute('max')) ?? { year: 2100, month: 12, day: 31 }
  }

  private setPart(part: DatePart, requestedValue: number): void {
    const current = this.getDate()
    const minDate = this.getMinDate()
    const maxDate = this.getMaxDate()
    const next = { ...current }

    if (part === 'year') {
      next.year = clamp(requestedValue, minDate.year, maxDate.year)
    } else if (part === 'month') {
      next.month = clamp(requestedValue, 1, 12)
    } else {
      next.day = clamp(requestedValue, 1, daysInMonth(next.year, next.month))
    }

    next.day = Math.min(next.day, daysInMonth(next.year, next.month))
    const clamped = clampDate(next, minDate, maxDate)
    const value = toIsoDate(clamped)
    if (value === this.value) {
      return
    }

    this.setAttribute('value', value)
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private changePart(part: DatePart, offset: number): void {
    const date = this.getDate()
    this.setPart(part, date[part] + offset)
  }

  private getPartOrder(): DatePart[] {
    const locale = this.getAttribute('locale') || 'en-US'
    const parts = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(new Date(Date.UTC(2026, 6, 1)))

    const order = parts
      .map((part) => part.type)
      .filter((part): part is DatePart => dateParts.has(part as DatePart))

    return Array.from(new Set(order))
  }

  private getPartLabel(part: DatePart): string {
    return this.getAttribute(`${part}-label`) || part
  }

  private getPartBounds(part: DatePart, date: DateValue): { min: number; max: number } {
    if (part === 'day') {
      return { min: 1, max: daysInMonth(date.year, date.month) }
    }

    if (part === 'month') {
      return { min: 1, max: 12 }
    }

    return { min: this.getMinDate().year, max: this.getMaxDate().year }
  }

  private formatPart(part: DatePart, value: number): string {
    if (part !== 'month') {
      return new Intl.NumberFormat(this.getAttribute('locale') || 'en-US', {
        useGrouping: false,
      }).format(value)
    }

    return new Intl.DateTimeFormat(this.getAttribute('locale') || 'en-US', {
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, value - 1, 1)))
  }

  private createWheel(part: DatePart, date: DateValue): HTMLElement {
    const { min, max } = this.getPartBounds(part, date)
    const value = date[part]
    const wheel = document.createElement('div')
    wheel.className = `wheel wheel--${part}`
    wheel.tabIndex = 0
    wheel.setAttribute('role', 'spinbutton')
    wheel.setAttribute('aria-label', this.getPartLabel(part))
    wheel.setAttribute('aria-valuemin', String(min))
    wheel.setAttribute('aria-valuemax', String(max))
    wheel.setAttribute('aria-valuenow', String(value))
    wheel.setAttribute('aria-valuetext', this.formatPart(part, value))

    for (const offset of [-1, 0, 1]) {
      const option = document.createElement('span')
      const optionValue = value + offset
      option.className = offset === 0 ? 'option option--selected' : 'option'
      option.setAttribute('aria-hidden', 'true')
      if (offset !== 0 && optionValue >= min && optionValue <= max) {
        option.dataset.offset = String(offset)
        option.textContent = this.formatPart(part, optionValue)
      } else if (offset === 0) {
        option.textContent = this.formatPart(part, value)
      }
      wheel.append(option)
    }

    wheel.addEventListener('keydown', (event) => {
      const offsets: Record<string, number> = {
        ArrowDown: 1,
        ArrowUp: -1,
        PageDown: part === 'year' ? 10 : 1,
        PageUp: part === 'year' ? -10 : -1,
      }
      const offset = offsets[event.key]
      if (offset !== undefined) {
        event.preventDefault()
        this.changePart(part, offset)
        this.refocusPart(part)
        return
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        this.setPart(part, event.key === 'Home' ? min : max)
        this.refocusPart(part)
      }
    })

    wheel.addEventListener('wheel', (event) => {
      event.preventDefault()
      this.changePart(part, event.deltaY > 0 ? 1 : -1)
      this.refocusPart(part)
    }, { passive: false })

    let pointerStartY: number | null = null
    let dragged = false
    wheel.addEventListener('pointerdown', (event) => {
      pointerStartY = event.clientY
      dragged = false
      wheel.setPointerCapture?.(event.pointerId)
    })
    wheel.addEventListener('pointermove', (event) => {
      if (pointerStartY !== null && Math.abs(event.clientY - pointerStartY) >= 20) {
        dragged = true
      }
    })
    wheel.addEventListener('pointerup', (event) => {
      if (pointerStartY !== null && dragged) {
        this.changePart(part, event.clientY < pointerStartY ? 1 : -1)
        this.refocusPart(part)
      }
      pointerStartY = null
    })
    wheel.addEventListener('pointercancel', () => {
      pointerStartY = null
      dragged = false
    })
    wheel.addEventListener('click', (event) => {
      if (dragged) {
        dragged = false
        return
      }

      const option = (event.target as Element).closest<HTMLElement>('[data-offset]')
      const offset = Number(option?.dataset.offset)
      if (offset === -1 || offset === 1) {
        this.changePart(part, offset)
        this.refocusPart(part)
      }
    })

    return wheel
  }

  private refocusPart(part: DatePart): void {
    queueMicrotask(() => {
      this.root.querySelector<HTMLElement>(`.wheel--${part}`)?.focus()
    })
  }

  private render(): void {
    const picker = document.createElement('div')
    picker.className = 'picker'
    picker.setAttribute('role', 'group')
    const date = clampDate(this.getDate(), this.getMinDate(), this.getMaxDate())
    this.getPartOrder().forEach((part) => picker.append(this.createWheel(part, date)))
    this.root.replaceChildren(picker)
  }
}

function parseIsoDate(value: string | null): DateValue | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null
  }

  return { year, month, day }
}

function today(): DateValue {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampDate(value: DateValue, min: DateValue, max: DateValue): DateValue {
  const iso = toIsoDate(value)
  if (iso < toIsoDate(min)) return min
  if (iso > toIsoDate(max)) return max
  return value
}

function toIsoDate(value: DateValue): string {
  return [
    String(value.year).padStart(4, '0'),
    String(value.month).padStart(2, '0'),
    String(value.day).padStart(2, '0'),
  ].join('-')
}

export function registerRrrDatePicker(): void {
  defineCustomElementOnce('rrr-date-picker', RrrDatePicker)
}
