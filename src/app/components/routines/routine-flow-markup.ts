import type { RoutineVersion } from '../../../domain/types.ts'
import {
  buildRoutineFlow,
  type RoutineFlowItem,
} from '../../../domain/routine-service.ts'
import { t, tPlural } from '../../../i18n/index.ts'
import { escapeHtml } from '../../render-helpers.ts'

type FlowMarkupOptions = {
  resolveExerciseName: (exerciseId: string) => string
  exerciseInteractive?: boolean
  transitionInteractive?: boolean
  sortable?: boolean
}

function renderExerciseRow(
  exercise: Extract<RoutineFlowItem, { kind: 'exercise' }>['exercise'],
  resolveExerciseName: (exerciseId: string) => string,
  interactive: boolean,
  sortable: boolean,
): string {
  const exerciseName = resolveExerciseName(exercise.exerciseId)
  const row = `
    <rrr-list-row
      ${interactive ? 'activation="button"' : ''}
      label="${escapeHtml(exerciseName)}"
      description="${escapeHtml(tPlural('routineDetail.setCount', exercise.setCount))}"
      data-routine-exercise-id="${escapeHtml(exercise.id)}"
    ></rrr-list-row>
  `

  if (!sortable) {
    return row
  }

  const handleLabel = t('routineDetail.reorder.handleAria', {
    exercise: exerciseName,
  })

  return `
    <div
      class="rrr-sortable-item"
      data-sequence-item
      data-sort-id="${escapeHtml(exercise.id)}"
      data-sort-label="${escapeHtml(exerciseName)}"
    >
      <button
        class="rrr-sort-handle"
        type="button"
        data-sort-handle
        aria-label="${escapeHtml(handleLabel)}"
        title="${escapeHtml(handleLabel)}"
      >
        <rrr-icon name="re-order-dots-vertical"></rrr-icon>
      </button>
      ${row}
    </div>
  `
}

function renderTransitionGutter(
  transition: Extract<RoutineFlowItem, { kind: 'transition' }>,
  version: RoutineVersion,
  resolveExerciseName: (exerciseId: string) => string,
  interactive: boolean,
): string {
  const destination = version.exercises.find(
    (exercise) => exercise.id === transition.beforeExerciseId,
  )
  const destinationName = destination
    ? resolveExerciseName(destination.exerciseId)
    : t('routineDetail.exercises.unknown')
  const spokenDuration = tPlural(
    'routineDetail.transition.durationLong',
    transition.seconds,
  )
  const customDescription = transition.inherited
    ? ''
    : t('routineDetail.transition.custom')
  const actionLabel = t(
    transition.inherited
      ? 'routineDetail.transition.editAria'
      : 'routineDetail.transition.editCustomAria',
    {
      duration: spokenDuration,
      exercise: destinationName,
    },
  )

  return `
    <rrr-sequence-gutter
      icon="water-bottle"
      ${interactive ? 'activation="button"' : ''}
      data-before-exercise-id="${escapeHtml(transition.beforeExerciseId)}"
      value="${transition.seconds}"
      unit="s"
      ${customDescription ? `description="${escapeHtml(customDescription)}"` : ''}
      ${interactive ? `action-label="${escapeHtml(actionLabel)}"` : ''}
    ></rrr-sequence-gutter>
  `
}

export function renderRoutineFlowSequence(
  version: RoutineVersion,
  options: FlowMarkupOptions,
): string {
  const resolveExerciseName = options.resolveExerciseName
  const exerciseInteractive = options.exerciseInteractive ?? true
  const transitionInteractive = options.transitionInteractive ?? true
  const sortable = options.sortable ?? false

  return buildRoutineFlow(version)
    .map((item) => item.kind === 'exercise'
      ? renderExerciseRow(item.exercise, resolveExerciseName, exerciseInteractive, sortable)
      : renderTransitionGutter(item, version, resolveExerciseName, transitionInteractive))
    .join('')
}

export function renderRoutineFlowControls(options: {
  addAction: string
  addDisabled?: boolean
  reorderAction: string
  reorderAvailable: boolean
  reorderEnabled: boolean
  transitionAction: string
  transitionSeconds: number
}): string {
  return `
    <div class="rrr-list-card">
      <rrr-list-row
        activation="button"
        label="${t('label.addExercise')}"
        data-action="${escapeHtml(options.addAction)}"
        ${options.addDisabled ? 'disabled' : ''}
      >
        <rrr-icon slot="leading" name="add"></rrr-icon>
      </rrr-list-row>
      <rrr-list-row
        control="switch"
        name="reorder-exercises"
        label="${t('routineDetail.reorder.toggleLabel')}"
        data-action="${escapeHtml(options.reorderAction)}"
        ${options.reorderEnabled ? 'checked' : ''}
        ${options.reorderAvailable ? '' : 'disabled'}
      >
        <rrr-icon slot="leading" name="arrow-sort"></rrr-icon>
      </rrr-list-row>
      <rrr-list-row
        activation="button"
        label="${t('routineDetail.transition.defaultLabel')}"
        description="${t('routineDetail.transition.defaultDescription')}"
        value-text="${escapeHtml(tPlural(
          'routineDetail.transition.duration',
          options.transitionSeconds,
        ))}"
        accessory="value"
        data-action="${escapeHtml(options.transitionAction)}"
      >
        <rrr-icon slot="leading" name="timer"></rrr-icon>
      </rrr-list-row>
    </div>
  `
}
