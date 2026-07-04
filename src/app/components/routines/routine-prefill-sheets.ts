import type { RrrListRow } from '../../../design-system/components/rrr-list-row.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import type { Workout } from '../../../domain/types.ts'
import { formatDate, t } from '../../../i18n/index.ts'
import { formatShortDate } from '../../render-helpers.ts'
import { presentSheet } from '../../../utils/sheet-service.ts'

const noPrefillValue = '__none__'

function formatWorkoutDate(date: string): string {
  return formatShortDate(new Date(`${date}T12:00:00`))
}

function createChoiceRow(options: {
  value: string
  label: string
  description?: string
  checked: boolean
}): RrrListRow {
  const row = document.createElement('rrr-list-row') as RrrListRow
  row.setAttribute('control', 'radio')
  row.setAttribute('name', 'routine-prefill-source')
  row.setAttribute('value', options.value)
  row.setAttribute('label', options.label)
  row.dataset.prefillSourceId = options.value
  row.checked = options.checked

  if (options.description) {
    row.setAttribute('description', options.description)
  }
  if (options.checked) {
    row.setAttribute('autofocus', '')
  }

  return row
}

export async function promptRoutinePrefillSource(options: {
  workouts: Workout[]
  selectedWorkoutId: string | null
}): Promise<string | null | undefined> {
  const { workouts, selectedWorkoutId } = options
  const selectedExists = workouts.some((workout) => workout.id === selectedWorkoutId)
  const sheet = document.createElement('rrr-sheet') as RrrSheet
  const heading = document.createElement('h3')
  heading.slot = 'heading'
  heading.className = 'sheet-title'
  heading.textContent = t('routineDetail.prefill.sheet.title')

  const description = document.createElement('p')
  description.slot = 'description'
  description.className = 'sheet-message'
  description.textContent = t('routineDetail.prefill.sheet.description')

  const choices = document.createElement('rrr-list-card')
  choices.slot = 'body'
  choices.setAttribute('role', 'radiogroup')
  choices.setAttribute('aria-label', t('routineDetail.prefill.sheet.groupAria'))
  choices.append(createChoiceRow({
    value: noPrefillValue,
    label: t('routineDetail.prefill.none'),
    checked: !selectedExists,
  }))

  for (const workout of workouts) {
    const completionTime = formatDate(workout.completedAt ?? '', {
      hour: 'numeric',
      minute: '2-digit',
    })
    choices.append(createChoiceRow({
      value: workout.id,
      label: formatWorkoutDate(workout.date),
      description: t('routineDetail.prefill.sheet.completedAt', {
        time: completionTime,
      }),
      checked: workout.id === selectedWorkoutId,
    }))
  }

  choices.addEventListener('change', (event) => {
    const row = event
      .composedPath()
      .find((node): node is RrrListRow => node instanceof HTMLElement
        && node.tagName.toLowerCase() === 'rrr-list-row'
        && node.dataset.prefillSourceId !== undefined
        && (node as RrrListRow).checked)
    if (row?.dataset.prefillSourceId) {
      sheet.close(row.dataset.prefillSourceId)
    }
  })

  sheet.append(heading, description, choices)
  const result = await presentSheet(sheet)

  if (result === null) {
    return undefined
  }

  return result === noPrefillValue ? null : result
}
