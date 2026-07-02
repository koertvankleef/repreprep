import { storageService } from '../../storage-instance.ts'
import { getRoutineSummary } from '../../../domain/routine-summary-service.ts'
import { createWorkoutFromRoutine } from '../../../domain/workout-service.ts'
import { toastService } from '../../../foundation/toast.ts'
import { t, tPlural } from '../../../i18n/index.ts'
import type { RoutineExercise, RoutineVersion } from '../../../domain/types.ts'
import { todayIso } from '../../../utils/date.ts'
import { confirmSheet, presentSheet } from '../../../utils/sheet-service.ts'
import {
  buildRoutineFlow,
  getActiveRoutineVersion,
  getRoutine,
  type RoutineFlowItem,
} from '../../../domain/routine-service.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import {
  escapeHtml,
  formatShortDate,
  getMuscleLabel,
  renderPropertyRow,
} from '../../render-helpers.ts'

export class RrrRoutineDetail extends HTMLElement {
  private routineIdValue: string | null = null
  private renameSheetActive = false
  private name = ''

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  set routineId(value: string | null) {
    this.routineIdValue = value
    this.initialize()
  }

  get routineId(): string | null {
    return this.routineIdValue
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.initialize()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private initialize(): void {
    const data = storageService.getData()

    if (this.routineIdValue) {
      const routine = getRoutine(data, this.routineIdValue)

      if (!routine) {
        this.name = ''
        // this.exercises = []
        this.render()
        return
      }

      const version = getActiveRoutineVersion(data, this.routineIdValue)

      this.name = routine.name
      /* this.transitionSeconds = Math.max(0, version?.transitionSeconds ?? RrrRoutineEditor.defaultTransitionSeconds)
      this.exercises = version
        ? version.exercises.map((exercise) => ({
            ...exercise,
            restSeconds: Math.max(0, exercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds),
          }))
        : [] */
    } else {
      this.name = ''
      // this.transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
      // this.exercises = []
    }

    this.render()
  }

  async openRenameSheet(): Promise<boolean> {
    const routineId = this.routineIdValue
    const routine = routineId ? getRoutine(storageService.getData(), routineId) : undefined

    if (!routine || this.renameSheetActive) {
      return false
    }

    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.className = 'sheet-title'
    heading.textContent = t('routineEditor.dialog.rename.title')

    const nameInput = document.createElement('rrr-input') as HTMLElement & { value: string }
    nameInput.slot = 'body'
    nameInput.setAttribute('autofocus', '')
    nameInput.setAttribute('label', t('routineEditor.dialog.rename.label'))
    nameInput.setAttribute('required', '')
    nameInput.value = routine.name

    const confirmButton = document.createElement('rrr-button')
    confirmButton.slot = 'actions'
    confirmButton.setAttribute('type', 'button')
    confirmButton.setAttribute('data-sheet-result', 'confirm')
    confirmButton.textContent = t('action.confirm')

    const syncConfirmation = (): void => {
      confirmButton.toggleAttribute('disabled', !nameInput.value.trim())
    }
    nameInput.addEventListener('input', syncConfirmation)
    syncConfirmation()

    sheet.append(heading, nameInput, confirmButton)
    this.renameSheetActive = true

    try {
      const result = await presentSheet(sheet)
      const name = nameInput.value.trim()

      if (result !== 'confirm' || !name || name === routine.name) {
        return false
      }

      storageService.renameRoutine(routine.id, name)
      this.name = name
      window.dispatchEvent(new CustomEvent('rrr-data-changed'))
      return true
    } finally {
      this.renameSheetActive = false
    }
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

  private editWorkout(): void {
    if (!this.routineIdValue) {
      return
    }

    window.location.hash = `#/routines/${encodeURIComponent(this.routineIdValue)}/edit`
  }

  private async deleteRoutine(): Promise<void> {
    if (!this.routineIdValue) {
      return
    }

    const confirmed = await confirmSheet({
      title: t('routineDetail.dialog.delete.title'),
      message: t('routineDetail.dialog.delete.message'),
      confirmLabel: t('action.delete'),
      confirmTone: 'danger',
    })

    if (!confirmed) {
      return
    }

    storageService.archiveRoutine(this.routineIdValue)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = '#/routines'
  }

  private renderExerciseRow(routineId: string, routineExercise: RoutineExercise): string {
    const exercise = storageService
      .getData()
      .exercises.find((candidate) => candidate.id === routineExercise.exerciseId)
    const exerciseName = exercise?.name ?? t('routineDetail.exercises.unknown')
    const setCount = routineExercise.plannedSets.length

    return `
      <rrr-list-row
        label="${escapeHtml(exerciseName)}"
        description="${escapeHtml(tPlural('routineDetail.setCount', setCount))}"
        href="#/routines/${encodeURIComponent(routineId)}/exercises/${encodeURIComponent(routineExercise.id)}"
        accessory="chevron"
      ></rrr-list-row>
    `
  }

  private renderTransitionGutter(
    transition: Extract<RoutineFlowItem, { kind: 'transition' }>,
    version: RoutineVersion,
  ): string {
    const destination = version.exercises.find(
      (exercise) => exercise.id === transition.beforeExerciseId,
    )
    const destinationName = storageService
      .getData()
      .exercises.find((exercise) => exercise.id === destination?.exerciseId)?.name
      ?? t('routineDetail.exercises.unknown')
    const duration = tPlural('routineDetail.transition.duration', transition.seconds)
    const customDescription = transition.inherited
      ? ''
      : t('routineDetail.transition.custom')
    const ariaLabel = transition.inherited
      ? t('routineDetail.transition.aria', {
          duration,
          exercise: destinationName,
        })
      : t('routineDetail.transition.customAria', {
          duration,
          exercise: destinationName,
        })

    return `
      <rrr-sequence-gutter
        icon="water-bottle"
        label="${escapeHtml(duration)}"
        ${customDescription ? `description="${escapeHtml(customDescription)}"` : ''}
        aria-label="${escapeHtml(ariaLabel)}"
      ></rrr-sequence-gutter>
    `
  }

  private renderRoutineFlow(routineId: string, version: RoutineVersion): string {
    return buildRoutineFlow(version)
      .map((item) => item.kind === 'exercise'
        ? this.renderExerciseRow(routineId, item.exercise)
        : this.renderTransitionGutter(item, version))
      .join('')
  }

  private render(): void {
    const routineId = this.routineIdValue
    const summary = routineId
      ? getRoutineSummary(storageService.getData(), routineId)
      : null

    if (!routineId || !summary) {
      this.innerHTML = `
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
      ? formatShortDate(new Date(summary.lastStartedAt))
      : t('routineDetail.lastStartedNever')

    this.innerHTML = `
      <section class="page">
        ${summary.routine.description ? `<p>${escapeHtml(summary.routine.description)}</p>` : ''}

        <rrr-section>
          <span slot="heading">${t('routineDetail.section.overview')}</span>
          <dl class="rrr-property-list">
            ${renderPropertyRow({
              label: t('routineDetail.muscles.label'),
              textValue: primaryMuscles,
            })}
          </dl>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('routineDetail.section.exercises')}</span>
          ${
            exerciseCount > 0
              ? `
                <rrr-sequence aria-label="${escapeHtml(t('routineDetail.exercises.sequenceAria'))}">
                  ${summary.version ? this.renderRoutineFlow(routineId, summary.version) : ''}
                </rrr-sequence>
              `
              : `<p>${t('routineDetail.exercises.empty')}</p>`
          }
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('routineDetail.actions')}</span>
          <div class="rrr-list-card">
            <rrr-list-row
              activation="button"
              label="${t('routineDetail.action.start')}"
              data-action="start-workout"
            >
              <rrr-icon slot="leading" name="play"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              activation="button"
              label="${t('action.edit')}"
              data-action="edit-workout"
              accessory="value-chevron"
            >
              <rrr-icon slot="leading" name="edit"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              activation="button"
              label="${t('action.delete')}"
              data-action="delete-routine"
              tone="danger"
            >
              <rrr-icon slot="leading" name="delete"></rrr-icon>
            </rrr-list-row>
          </div>
        </rrr-section>

        <rrr-section>
          <span slot="heading">Data</span>
          <dl class="rrr-property-list">
            ${renderPropertyRow({
              label: t('routineDetail.exercises.label'),
              textValue: tPlural('message.routine.exerciseCount', exerciseCount),
            })}
            ${renderPropertyRow({
              label: t('routineDetail.lastStarted.label'),
              textValue: lastStarted,
            })}
          </dl>
        </rrr-section>
      </section>
    `

    this.querySelector<HTMLElement>('rrr-list-row[data-action="start-workout"]')
      ?.addEventListener('click', () => this.startWorkout())
    this.querySelector<HTMLElement>('rrr-list-row[data-action="edit-workout"]')
      ?.addEventListener('click', () => this.editWorkout())
    this.querySelector<HTMLElement>('rrr-list-row[data-action="delete-routine"]')
      ?.addEventListener('click', () => void this.deleteRoutine())
  }
}

customElements.define('rrr-routine-detail', RrrRoutineDetail)
