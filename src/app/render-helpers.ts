import { formatDate } from '../i18n/index.ts'
import { escapeHtml } from '../utils/html.ts'

export { escapeHtml }

export function formatCalendarDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return formatDate(date, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(value: string | Date): string {
  return formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export type PropertyRow = {
  label: string
  textValue?: string
  htmlString?: string
}

function rowValue(row: PropertyRow): string {
  if (row.htmlString !== undefined) {
    return row.htmlString
  }
  if (row.textValue !== undefined) {
    return escapeHtml(row.textValue)
  }
  return ''
}

export function renderPropertyRow(row: PropertyRow): string {
  return `
    <div class="rrr-property-row">
      <dt>${escapeHtml(row.label)}</dt>
      <dd>${rowValue(row)}</dd>
    </div>
  `
}
