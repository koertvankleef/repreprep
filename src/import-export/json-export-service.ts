import type { AppData } from '../domain/types.ts'
import { todayIso } from '../utils/date.ts'

export function formatExportData(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function exportToJson(data: AppData): void {
  const content = formatExportData(data)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `repreprep-export-${todayIso()}.json`
  link.click()

  URL.revokeObjectURL(url)
}
