import type { RrrInput } from '../../../design-system/components/rrr-input.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import type { PlannedSet, RepsPlannedSet, TimePlannedSet } from '../../../domain/types.ts'
import { t } from '../../../i18n/index.ts'
import { presentSheet } from '../../../utils/sheet-service.ts'

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

function createNumberInput(options: {
  name: string
  label: string
  value: number | null
  min?: number
  step?: number
  autofocus?: boolean
}): RrrInput {
  const input = document.createElement('rrr-input') as RrrInput
  input.slot = 'body'
  input.setAttribute('type', 'number')
  input.setAttribute('name', options.name)
  input.setAttribute('label', options.label)
  input.setAttribute('min', String(options.min ?? 0))
  input.setAttribute('step', String(options.step ?? 1))
  input.toggleAttribute('autofocus', options.autofocus ?? false)
  input.value = options.value === null ? '' : String(options.value)
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

function parseOptionalNumber(
  input: RrrInput,
  options?: { integer?: boolean },
): number | null | undefined {
  if (!input.value.trim()) {
    return null
  }

  const value = Number(input.value)
  if (
    !Number.isFinite(value)
    || value < 0
    || (options?.integer && !Number.isInteger(value))
  ) {
    return undefined
  }

  return value
}

function parseRequiredInteger(input: RrrInput): number | undefined {
  const value = Number(input.value)
  return Number.isInteger(value) && value >= 0 ? value : undefined
}

export async function promptExerciseRestSeconds(
  currentSeconds: number,
): Promise<number | undefined> {
  const sheet = createSheet(
    t('routineExercise.rest.sheet.title'),
    t('routineExercise.rest.sheet.description'),
  )
  const input = createNumberInput({
    name: 'rest-seconds',
    label: t('routineExercise.rest.sheet.seconds'),
    value: currentSeconds,
    autofocus: true,
  })
  const confirmButton = createConfirmButton()
  const syncConfirmation = (): void => {
    confirmButton.toggleAttribute('disabled', parseRequiredInteger(input) === undefined)
  }

  input.addEventListener('input', syncConfirmation)
  syncConfirmation()
  sheet.append(input, confirmButton)

  if (await presentSheet(sheet) !== 'confirm') {
    return undefined
  }

  return parseRequiredInteger(input)
}

export async function promptPlannedSet(options: {
  set: PlannedSet
  exerciseName: string
  setNumber: number
  adding: boolean
}): Promise<PlannedSet | undefined> {
  const { set, exerciseName, setNumber, adding } = options
  const sheet = createSheet(
    adding
      ? t('routineExercise.set.sheet.addTitle')
      : t('routineExercise.set.sheet.editTitle', { index: setNumber }),
    exerciseName,
  )
  const confirmButton = createConfirmButton()

  if (set.kind === 'time') {
    const secondsInput = createNumberInput({
      name: 'target-seconds',
      label: t('routineExercise.set.sheet.targetSeconds'),
      value: set.targetSeconds,
      autofocus: true,
    })
    const syncConfirmation = (): void => {
      confirmButton.toggleAttribute(
        'disabled',
        parseOptionalNumber(secondsInput, { integer: true }) === undefined,
      )
    }

    secondsInput.addEventListener('input', syncConfirmation)
    syncConfirmation()
    sheet.append(secondsInput, confirmButton)

    if (await presentSheet(sheet) !== 'confirm') {
      return undefined
    }

    const targetSeconds = parseOptionalNumber(secondsInput, { integer: true })
    return targetSeconds === undefined
      ? undefined
      : { ...set, targetSeconds } satisfies TimePlannedSet
  }

  const repsInput = createNumberInput({
    name: 'target-reps',
    label: t('routineExercise.set.sheet.targetReps'),
    value: set.targetReps,
    autofocus: true,
  })
  const weightInput = createNumberInput({
    name: 'target-weight',
    label: t('routineExercise.set.sheet.targetWeight'),
    value: set.targetWeightKg,
    step: 0.5,
  })
  const syncConfirmation = (): void => {
    confirmButton.toggleAttribute(
      'disabled',
      parseOptionalNumber(repsInput, { integer: true }) === undefined
        || parseOptionalNumber(weightInput) === undefined,
    )
  }

  repsInput.addEventListener('input', syncConfirmation)
  weightInput.addEventListener('input', syncConfirmation)
  syncConfirmation()
  sheet.append(repsInput, weightInput, confirmButton)

  if (await presentSheet(sheet) !== 'confirm') {
    return undefined
  }

  const targetReps = parseOptionalNumber(repsInput, { integer: true })
  const targetWeightKg = parseOptionalNumber(weightInput)
  return targetReps === undefined || targetWeightKg === undefined
    ? undefined
    : { ...set, targetReps, targetWeightKg } satisfies RepsPlannedSet
}
