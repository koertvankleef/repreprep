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
}

function renderExerciseRow(
  exercise: Extract<RoutineFlowItem, { kind: 'exercise' }>['exercise'],
  resolveExerciseName: (exerciseId: string) => string,
  interactive: boolean,
): string {
  const exerciseName = resolveExerciseName(exercise.exerciseId)

  return `
    <rrr-list-row
      ${interactive ? 'activation="button"' : ''}
      label="${escapeHtml(exerciseName)}"
      description="${escapeHtml(tPlural('routineDetail.setCount', exercise.setCount))}"
      data-routine-exercise-id="${escapeHtml(exercise.id)}"
    ></rrr-list-row>
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

  return buildRoutineFlow(version)
    .map((item) => item.kind === 'exercise'
      ? renderExerciseRow(item.exercise, resolveExerciseName, exerciseInteractive)
      : renderTransitionGutter(item, version, resolveExerciseName, transitionInteractive))
    .join('')
}

export function renderRoutineFlowControls(options: {
  addAction: string
  transitionAction: string
  transitionSeconds: number
}): string {
  return `
    <div class="rrr-list-card">
      <rrr-list-row
        activation="button"
        label="${t('label.addExercise')}"
        data-action="${escapeHtml(options.addAction)}"
      >
        <rrr-icon slot="leading" name="add"></rrr-icon>
      </rrr-list-row>
      <rrr-list-row
        activation="button"
        label="${t('routineDetail.transition.defaultLabel')}"
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
