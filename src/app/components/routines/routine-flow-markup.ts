import type { RoutineVersion } from '../../../domain/types.ts'
import {
  buildRoutineFlow,
  type RoutineFlowItem,
} from '../../../domain/routine-service.ts'
import { t, tPlural } from '../../../i18n/index.ts'
import { escapeHtml } from '../../render-helpers.ts'

export type RoutineFlowGutterMotion = 'none' | 'reveal' | 'collapse'

type FlowMarkupOptions = {
  resolveExerciseName: (exerciseId: string) => string
  showExerciseDescription?: boolean
  exerciseInteractive?: boolean
  transitionInteractive?: boolean
  sortable?: boolean
  swipeable?: boolean
}

function renderExerciseRow(
  exercise: Extract<RoutineFlowItem, { kind: 'exercise' }>['exercise'],
  resolveExerciseName: (exerciseId: string) => string,
  showDescription: boolean,
  interactive: boolean,
  sortable: boolean,
  swipeable: boolean,
): string {
  const exerciseName = resolveExerciseName(exercise.exerciseId)
  const row = `
    <rrr-list-row
      ${interactive ? 'activation="button"' : ''}
      ${showDescription
        ? `description="${escapeHtml(tPlural('routineDetail.setCount', exercise.setCount))}"`
        : ''}
      data-routine-exercise-id="${escapeHtml(exercise.id)}"
    >
      <span slot="label" class="rrr-domain-heading">${escapeHtml(exerciseName)}</span>
    </rrr-list-row>
  `

  if (swipeable && !sortable) {
    return `
      <rrr-swipe-action
        action="delete"
        action-label="${escapeHtml(t('routineExercise.swipe.delete', {
          exercise: exerciseName,
        }))}"
        direction="end-to-start"
        tone="danger"
        data-swipe-routine-exercise-id="${escapeHtml(exercise.id)}"
      >
        ${row}
      </rrr-swipe-action>
    `
  }

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
  const showExerciseDescription = options.showExerciseDescription ?? true
  const exerciseInteractive = options.exerciseInteractive ?? true
  const transitionInteractive = options.transitionInteractive ?? true
  const sortable = options.sortable ?? false
  const swipeable = options.swipeable ?? false

  return buildRoutineFlow(version)
    .map((item) => item.kind === 'exercise'
      ? renderExerciseRow(
          item.exercise,
          resolveExerciseName,
          showExerciseDescription,
          exerciseInteractive,
          sortable,
          swipeable,
        )
      : renderTransitionGutter(item, version, resolveExerciseName, transitionInteractive))
    .join('')
}

export function renderRoutineFlowControls(options: {
  addAction: string
  addDisabled?: boolean
  transitionAction: string
  transitionSeconds: number
  prefillSourceLabel?: string
}): string {
  return `
    <div class="rrr-list-card routine-flow-data-controls">
      <rrr-list-row
        activation="button"
        label="${t('label.addExercise')}"
        data-action="${escapeHtml(options.addAction)}"
        ${options.addDisabled ? 'disabled' : ''}
      >
        <rrr-icon slot="leading" name="add"></rrr-icon>
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
        <rrr-icon slot="leading" name="water-bottle"></rrr-icon>
      </rrr-list-row>
      ${options.prefillSourceLabel === undefined
        ? ''
        : `
          <rrr-list-row
            activation="button"
            label="${t('routineDetail.prefill.label')}"
            description="${t('routineDetail.prefill.description')}"
            value-text="${escapeHtml(options.prefillSourceLabel)}"
            accessory="value"
            data-action="edit-prefill-source"
          >
            <rrr-icon slot="leading" name="arrow-repeat-1"></rrr-icon>
          </rrr-list-row>
        `}
    </div>
  `
}

export function renderRoutineReorderControl(options: {
  action: string
  available: boolean
  enabled: boolean
}): string {
  return `
    <div class="rrr-list-card routine-flow-reorder-control">
      <rrr-list-row
        control="switch"
        name="reorder-exercises"
        label="${t('routineDetail.reorder.toggleLabel')}"
        data-action="${escapeHtml(options.action)}"
        ${options.enabled ? 'checked' : ''}
        ${options.available ? '' : 'disabled'}
      >
        <rrr-icon slot="leading" name="arrow-sort"></rrr-icon>
      </rrr-list-row>
    </div>
  `
}
