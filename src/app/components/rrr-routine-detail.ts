import { storageService } from '../storage-instance.ts'
import { getRoutineSummary } from '../../domain/routine-summary-service.ts'
import { createWorkoutFromRoutine } from '../../domain/workout-service.ts'
import { toastService } from '../../foundation/toast.ts'
import { formatDate, t, tPlural } from '../../i18n/index.ts'
import type { Muscle, RoutineExercise } from '../../domain/types.ts'
import { todayIso } from '../../utils/date.ts'
import styles from './rrr-routine-detail.css?inline'

export class RrrRoutineDetail extends HTMLElement {
  private routineIdValue: string | null = null

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  set routineId(value: string | null) {
    this.routineIdValue = value
    this.render()
  }

  get routineId(): string | null {
    return this.routineIdValue
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private startWorkout(): void {
    if (!this.routineIdValue) {
      return
    }

    const workout = createWorkoutFromRoutine(storageService.getData(), this.routineIdValue, todayIso())
    if (!workout) {
      toastService.danger(t('routineDetail.startError'))
      return
    }

    storageService.saveWorkout(workout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = `#/workouts/${workout.id}/log`
  }

  private renderExerciseRow(routineExercise: RoutineExercise): string {
    const exercise = storageService
      .getData()
      .exercises.find((candidate) => candidate.id === routineExercise.exerciseId)
    const exerciseName = exercise?.name ?? t('routineDetail.exercises.unknown')
    const setCount = routineExercise.plannedSets.length

    return `
      <rrr-list-row
        label="${escapeHtml(exerciseName)}"
        description="${escapeHtml(tPlural('routineDetail.setCount', setCount))}"
      ></rrr-list-row>
    `
  }

  private renderPropertyRow(label: string, value: string): string {
    return `
      <div class="rrr-property-row">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `
  }

  private render(): void {
    const routineId = this.routineIdValue
    const summary = routineId
      ? getRoutineSummary(storageService.getData(), routineId)
      : null

    if (!summary) {
      this.innerHTML = `
        <style>${styles}</style>
        <section class="page">
          <p>${t('routineDetail.notFound.description')}</p>
        </section>
      `
      return
    }

    const exerciseCount = summary.version?.exercises.length ?? 0
    const primaryMuscles = summary.primaryMuscles.length > 0
      ? summary.primaryMuscles.map(getMuscleLabel).join(', ')
      : t('routineDetail.muscles.none')
    const lastStarted = summary.lastStartedAt
      ? formatDate(new Date(summary.lastStartedAt), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : t('routineDetail.lastStartedNever')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        ${summary.routine.description ? `<p>${escapeHtml(summary.routine.description)}</p>` : ''}
        <div class="primary-action">
          <rrr-button type="button" data-action="start-workout">${t('routineDetail.action.start')}</rrr-button>
        </div>

        <rrr-section>
          <span slot="heading">${t('routineDetail.section.overview')}</span>
          <dl class="rrr-property-list">
            ${this.renderPropertyRow(
              t('routineDetail.exercises.label'),
              tPlural('message.routine.exerciseCount', exerciseCount),
            )}
            ${this.renderPropertyRow(t('routineDetail.muscles.label'), primaryMuscles)}
            ${this.renderPropertyRow(t('routineDetail.lastStarted.label'), lastStarted)}
          </dl>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('routineDetail.section.exercises')}</span>
          ${
            exerciseCount > 0
              ? `
                <div class="rrr-list-card">
                  ${summary.version?.exercises.map((exercise) => this.renderExerciseRow(exercise)).join('') ?? ''}
                </div>
              `
              : `<p>${t('routineDetail.exercises.empty')}</p>`
          }
        </rrr-section>
      </section>
    `

    this.querySelector<HTMLElement>('rrr-button[data-action="start-workout"]')
      ?.addEventListener('click', () => this.startWorkout())
  }
}

function getMuscleLabel(muscle: Muscle): string {
  return t(`exercise.muscle.${muscle}`)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-routine-detail', RrrRoutineDetail)
