import type {
  Equipment,
  ExerciseCategory,
  MeasurementType,
  Muscle,
} from '../domain/types.ts'
import { formatDate, t } from '../i18n/index.ts'

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function getExerciseCategoryLabel(category: ExerciseCategory): string {
  return t(`exercise.category.${category}`)
}

export function getEquipmentLabel(equipment: Equipment): string {
  return t(`exercise.equipment.${equipment}`)
}

export function getMuscleLabel(muscle: Muscle): string {
  return t(`exercise.muscle.${muscle}`)
}

export function getMeasurementTypeLabel(type: MeasurementType): string {
  return t(`exercise.measurement.${type}`)
}

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
