import type { RrrNumberStepper } from '../../../design-system/components/rrr-number-stepper.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { getLocale, t } from '../../../i18n/index.ts'
import { presentSheet } from '../../../utils/sheet-service.ts'

export type RoutineExerciseSettings = {
  setCount: number
  restSeconds: number
}

function createNumberStepper(options: {
  name: string
  label: string
  value: number
  min: number
  size: number
  autofocus?: boolean
}): RrrNumberStepper {
  const stepper = document.createElement('rrr-number-stepper') as RrrNumberStepper
  stepper.slot = 'body'
  stepper.setAttribute('name', options.name)
  stepper.setAttribute('label', options.label)
  stepper.setAttribute('min', String(options.min))
  stepper.setAttribute('step', '1')
  stepper.setAttribute('size', String(options.size))
  stepper.setAttribute('locale', getLocale())
  stepper.setAttribute('button-only', '')
  stepper.setAttribute('decrement-label', t('numberStepper.decrement', { label: options.label }))
  stepper.setAttribute('increment-label', t('numberStepper.increment', { label: options.label }))
  stepper.toggleAttribute('autofocus', options.autofocus ?? false)
  stepper.value = options.value
  return stepper
}

function parseRequiredInteger(stepper: RrrNumberStepper, min: number): number | undefined {
  if (!stepper.value.trim()) {
    return undefined
  }

  const value = stepper.valueAsNumber
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

  const setCountInput = createNumberStepper({
    name: 'set-count',
    label: t('routineExercise.setCount.label'),
    value: options.setCount,
    min: 1,
    size: 2,
    autofocus: true,
  })
  const restInput = createNumberStepper({
    name: 'rest-seconds',
    label: t('routineExercise.rest.sheet.seconds'),
    value: options.restSeconds,
    min: 0,
    size: 3,
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
