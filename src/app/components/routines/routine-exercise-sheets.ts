import type { RrrInput } from '../../../design-system/components/rrr-input.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { t } from '../../../i18n/index.ts'
import { presentSheet } from '../../../utils/sheet-service.ts'

export type RoutineExerciseSettings = {
  setCount: number
  restSeconds: number
}

function createNumberInput(options: {
  name: string
  label: string
  value: number
  min: number
  autofocus?: boolean
}): RrrInput {
  const input = document.createElement('rrr-input') as RrrInput
  input.slot = 'body'
  input.setAttribute('type', 'number')
  input.setAttribute('name', options.name)
  input.setAttribute('label', options.label)
  input.setAttribute('min', String(options.min))
  input.setAttribute('step', '1')
  input.toggleAttribute('autofocus', options.autofocus ?? false)
  input.value = String(options.value)
  return input
}

function parseRequiredInteger(input: RrrInput, min: number): number | undefined {
  if (!input.value.trim()) {
    return undefined
  }

  const value = Number(input.value)
  return Number.isInteger(value) && value >= min ? value : undefined
}

export async function promptRoutineExerciseSettings(options: {
  exerciseName: string
  setCount: number
  restSeconds: number
}): Promise<RoutineExerciseSettings | undefined> {
  const sheet = document.createElement('rrr-sheet') as RrrSheet
  const heading = document.createElement('h3')
  heading.slot = 'heading'
  heading.className = 'sheet-title'
  heading.textContent = t('routineExercise.sheet.heading', { exercise: options.exerciseName })

  const setCountInput = createNumberInput({
    name: 'set-count',
    label: t('routineExercise.setCount.label'),
    value: options.setCount,
    min: 1,
    autofocus: true,
  })
  const restInput = createNumberInput({
    name: 'rest-seconds',
    label: t('routineExercise.rest.sheet.seconds'),
    value: options.restSeconds,
    min: 0,
  })
  const confirmButton = document.createElement('rrr-button')
  confirmButton.slot = 'actions'
  confirmButton.setAttribute('type', 'button')
  confirmButton.setAttribute('data-sheet-result', 'confirm')
  confirmButton.textContent = t('action.confirm')

  const syncConfirmation = (): void => {
    confirmButton.toggleAttribute(
      'disabled',
      parseRequiredInteger(setCountInput, 1) === undefined
        || parseRequiredInteger(restInput, 0) === undefined,
    )
  }

  setCountInput.addEventListener('input', syncConfirmation)
  restInput.addEventListener('input', syncConfirmation)
  syncConfirmation()
  sheet.append(heading, setCountInput, restInput, confirmButton)

  if (await presentSheet(sheet) !== 'confirm') {
    return undefined
  }

  const setCount = parseRequiredInteger(setCountInput, 1)
  const restSeconds = parseRequiredInteger(restInput, 0)
  return setCount === undefined || restSeconds === undefined
    ? undefined
    : { setCount, restSeconds }
}
