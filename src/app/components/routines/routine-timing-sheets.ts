import type { RrrInput } from '../../../design-system/components/rrr-input.ts'
import type { RrrListRow } from '../../../design-system/components/rrr-list-row.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { t } from '../../../i18n/index.ts'
import { presentSheet } from '../../../utils/sheet-service.ts'

export type TransitionOverrideResult = number | null | undefined

type TransitionMode = 'default' | 'none' | 'custom'

function createSheet(title: string, description?: string): RrrSheet {
  const sheet = document.createElement('rrr-sheet') as RrrSheet
  const heading = document.createElement('h3')
  heading.slot = 'heading'
  heading.className = 'sheet-title'
  heading.textContent = title
  sheet.append(heading)

  if (description) {
    const message = document.createElement('p')
    message.slot = 'description'
    message.className = 'sheet-message'
    message.textContent = description
    sheet.append(message)
  }

  return sheet
}

function createSecondsInput(value: number, min: number): RrrInput {
  const input = document.createElement('rrr-input') as RrrInput
  input.slot = 'body'
  input.setAttribute('type', 'number')
  input.setAttribute('name', 'seconds')
  input.setAttribute('label', t('routineDetail.transition.sheet.seconds'))
  input.setAttribute('min', String(min))
  input.setAttribute('step', '1')
  input.setAttribute('required', '')
  input.value = String(value)
  return input
}

function createConfirmButton(): HTMLElement {
  const button = document.createElement('rrr-button')
  button.slot = 'actions'
  button.setAttribute('type', 'button')
  button.setAttribute('data-sheet-result', 'confirm')
  button.textContent = t('action.confirm')
  return button
}

function parseSeconds(input: RrrInput, min: number): number | null {
  const value = Number(input.value)
  return Number.isInteger(value) && value >= min ? value : null
}

export async function promptRoutineTransitionDefault(
  currentSeconds: number,
): Promise<number | undefined> {
  const sheet = createSheet(
    t('routineDetail.transition.defaultSheet.title'),
    t('routineDetail.transition.defaultSheet.description'),
  )
  const input = createSecondsInput(currentSeconds, 0)
  input.setAttribute('autofocus', '')
  const confirmButton = createConfirmButton()
  const syncConfirmation = (): void => {
    confirmButton.toggleAttribute('disabled', parseSeconds(input, 0) === null)
  }

  input.addEventListener('input', syncConfirmation)
  syncConfirmation()
  sheet.append(input, confirmButton)

  if (await presentSheet(sheet) !== 'confirm') {
    return undefined
  }

  return parseSeconds(input, 0) ?? undefined
}

function createModeRow(
  mode: TransitionMode,
  label: string,
  checked: boolean,
  description?: string,
): RrrListRow {
  const row = document.createElement('rrr-list-row') as RrrListRow
  row.setAttribute('control', 'radio')
  row.setAttribute('name', 'transition-mode')
  row.setAttribute('value', mode)
  row.setAttribute('label', label)
  row.dataset.transitionMode = mode
  row.checked = checked
  row.toggleAttribute('autofocus', checked)

  if (description) {
    row.setAttribute('description', description)
  }

  return row
}

export async function promptTransitionOverride(options: {
  routineDefaultSeconds: number
  currentOverrideSeconds: number | null
  destinationName: string
}): Promise<TransitionOverrideResult> {
  const { routineDefaultSeconds, currentOverrideSeconds, destinationName } = options
  const initialMode: TransitionMode = currentOverrideSeconds === null
    ? 'default'
    : currentOverrideSeconds === 0
      ? 'none'
      : 'custom'
  let selectedMode = initialMode
  const sheet = createSheet(
    t('routineDetail.transition.overrideSheet.title'),
    t('routineDetail.transition.overrideSheet.description', { exercise: destinationName }),
  )
  const choices = document.createElement('rrr-list-card')
  choices.slot = 'body'
  choices.setAttribute('role', 'radiogroup')
  choices.setAttribute('aria-label', t('routineDetail.transition.overrideSheet.mode'))
  choices.append(
    createModeRow(
      'default',
      t('routineDetail.transition.overrideSheet.default'),
      initialMode === 'default',
      t('routineDetail.transition.overrideSheet.defaultValue', {
        seconds: routineDefaultSeconds,
      }),
    ),
    createModeRow(
      'none',
      t('routineDetail.transition.overrideSheet.none'),
      initialMode === 'none',
    ),
    createModeRow(
      'custom',
      t('routineDetail.transition.overrideSheet.custom'),
      initialMode === 'custom',
    ),
  )

  const input = createSecondsInput(
    currentOverrideSeconds !== null && currentOverrideSeconds > 0
      ? currentOverrideSeconds
      : Math.max(1, routineDefaultSeconds),
    1,
  )
  input.toggleAttribute('disabled', initialMode !== 'custom')
  const confirmButton = createConfirmButton()
  const syncConfirmation = (): void => {
    input.toggleAttribute('disabled', selectedMode !== 'custom')
    confirmButton.toggleAttribute(
      'disabled',
      selectedMode === 'custom' && parseSeconds(input, 1) === null,
    )
  }

  choices.addEventListener('change', (event) => {
    const row = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement
        && node.tagName.toLowerCase() === 'rrr-list-row'
        && node.dataset.transitionMode !== undefined)

    if (row?.dataset.transitionMode) {
      selectedMode = row.dataset.transitionMode as TransitionMode
      syncConfirmation()
    }
  })
  input.addEventListener('input', syncConfirmation)
  syncConfirmation()
  sheet.append(choices, input, confirmButton)

  if (await presentSheet(sheet) !== 'confirm') {
    return undefined
  }

  if (selectedMode === 'default') {
    return null
  }

  if (selectedMode === 'none') {
    return 0
  }

  return parseSeconds(input, 1) ?? undefined
}
