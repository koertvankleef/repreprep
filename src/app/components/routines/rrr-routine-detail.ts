import { storageService } from '../../storage-instance.ts'
import { getActiveExercises } from '../../../domain/exercise-service.ts'
import { getRoutineSummary } from '../../../domain/routine-summary-service.ts'
import {
  createWorkoutFromRoutine,
  getCompletedWorkoutsForRoutine,
} from '../../../domain/workout-service.ts'
import { toastService } from '../../../foundation/toast.ts'
import { t } from '../../../i18n/index.ts'
import type { Routine, RoutineExercise, RoutineVersion } from '../../../domain/types.ts'
import { todayIso } from '../../../utils/date.ts'
import { confirmSheet, presentSheet } from '../../../foundation/sheet-service.ts'
import {
  createRoutineExercise,
  getActiveRoutineVersion,
  getRoutine,
  reorderRoutineExercises,
} from '../../../domain/routine-service.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import type {
  SequenceReorderDetail,
  SequenceSortStatusDetail,
} from '../../../design-system/components/rrr-sequence.ts'
import type {
  SwipeActionCommitDetail,
} from '../../../design-system/components/rrr-swipe-action.ts'
import { getMuscleLabel } from '../../exercise-labels.ts'
import {
  escapeHtml,
  formatShortDate,
  renderPropertyRow,
} from '../../render-helpers.ts'
import {
  renderRoutineFlowControls,
  renderRoutineReorderControl,
  renderRoutineFlowSequence,
  type RoutineFlowGutterMotion,
} from './routine-flow-markup.ts'
import {
  promptRoutineTransitionDefault,
  promptTransitionOverride,
} from './routine-timing-sheets.ts'
import { promptRoutineExerciseSettings } from './routine-exercise-sheets.ts'
import { promptRoutinePrefillSource } from './routine-prefill-sheets.ts'
import { announceRoutineFlowSort } from './routine-flow-sorting.ts'
import { promptRoutineExercisePicker } from './routine-exercise-picker.ts'
import styles from './routine-card.css?inline'

export class RrrRoutineDetail extends HTMLElement {
  private routineIdValue: string | null = null
  private renameSheetActive = false
  private sheetSessionActive = false
  private prefillSheetActive = false
  private reorderMode = false
  private gutterMotion: RoutineFlowGutterMotion = 'reveal'
  private name = ''

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  set routineId(value: string | null) {
    if (value !== this.routineIdValue) {
      this.reorderMode = false
      this.gutterMotion = 'reveal'
    }
    this.routineIdValue = value
    this.initialize()
  }

  get routineId(): string | null {
    return this.routineIdValue
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.addEventListener(
      'rrr-sequence-reorder',
      this.handleSequenceReorder as EventListener,
    )
    this.addEventListener(
      'rrr-sequence-sort-status',
      this.handleSequenceSortStatus as EventListener,
    )
    this.addEventListener(
      'rrr-swipe-action-commit',
      this.handleSwipeActionCommit as EventListener,
    )
    this.initialize()
  }

  disconnectedCallback(): void {
    this.reorderMode = false
    this.gutterMotion = 'reveal'
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
    this.removeEventListener(
      'rrr-sequence-reorder',
      this.handleSequenceReorder as EventListener,
    )
    this.removeEventListener(
      'rrr-sequence-sort-status',
      this.handleSequenceSortStatus as EventListener,
    )
    this.removeEventListener(
      'rrr-swipe-action-commit',
      this.handleSwipeActionCommit as EventListener,
    )
  }

  private readonly handleSequenceSortStatus = (
    event: CustomEvent<SequenceSortStatusDetail>,
  ): void => {
    announceRoutineFlowSort(event.detail)
  }

  private readonly handleSequenceReorder = (
    event: CustomEvent<SequenceReorderDetail>,
  ): void => {
    if (!this.reorderMode) {
      return
    }

    const current = this.getCurrentRoutineVersion()
    if (!current) {
      return
    }

    const exercises = reorderRoutineExercises(
      current.version.exercises,
      event.detail.orderedIds,
    )
    if (exercises === current.version.exercises) {
      return
    }

    this.saveRoutineVersion(current.routine, current.version, { exercises })

    if (event.detail.input === 'keyboard') {
      queueMicrotask(() => {
        Array.from(this.querySelectorAll<HTMLElement>('[data-sort-id]'))
          .find((item) => item.dataset.sortId === event.detail.movedId)
          ?.querySelector<HTMLElement>('[data-sort-handle]')
          ?.focus()
      })
    }
  }

  private readonly handleSwipeActionCommit = (
    event: CustomEvent<SwipeActionCommitDetail>,
  ): void => {
    if (this.reorderMode || event.detail.action !== 'delete') {
      return
    }

    const target = event.target
    const routineExerciseId = target instanceof HTMLElement
      ? target.dataset.swipeRoutineExerciseId
      : undefined
    if (!routineExerciseId) {
      return
    }

    const current = this.getCurrentRoutineVersion()
    if (!current || !current.version.exercises.some(
      (exercise) => exercise.id === routineExerciseId,
    )) {
      return
    }

    this.saveRoutineVersion(current.routine, current.version, {
      exercises: current.version.exercises.filter(
        (exercise) => exercise.id !== routineExerciseId,
      ),
    })
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

      this.name = routine.name
    } else {
      this.name = ''
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

  private async editPrefillSource(): Promise<void> {
    const routineId = this.routineIdValue
    if (!routineId || this.prefillSheetActive) {
      return
    }

    const data = storageService.getData()
    const routine = getRoutine(data, routineId)
    if (!routine) {
      return
    }

    this.prefillSheetActive = true
    try {
      const workoutId = await promptRoutinePrefillSource({
        workouts: getCompletedWorkoutsForRoutine(data, routine.id),
        selectedWorkoutId: routine.prefillSourceWorkoutId,
      })
      if (workoutId === undefined || workoutId === routine.prefillSourceWorkoutId) {
        return
      }

      storageService.setRoutinePrefillSource(routine.id, workoutId)
      window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    } finally {
      this.prefillSheetActive = false
    }
  }

  private async addRoutineExercise(): Promise<void> {
    const current = this.getCurrentRoutineVersion()
    if (!current || this.sheetSessionActive || this.reorderMode) {
      return
    }

    const options = getActiveExercises(storageService.getData())
    if (options.length === 0) {
      return
    }

    this.sheetSessionActive = true
    try {
      await promptRoutineExercisePicker(options, ({ exerciseId, settings }) => {
        const latest = this.getCurrentRoutineVersion()
        if (!latest) {
          return
        }

        this.saveRoutineVersion(latest.routine, latest.version, {
          exercises: [
            ...latest.version.exercises,
            createRoutineExercise(exerciseId, settings),
          ],
        })
      })
    } finally {
      this.sheetSessionActive = false
    }
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

  private resolveExerciseName(exerciseId: string): string {
    return storageService
      .getData()
      .exercises.find((exercise) => exercise.id === exerciseId)?.name
      ?? t('routineDetail.exercises.unknown')
  }

  private getCurrentRoutineVersion(): {
    routine: Routine
    version: RoutineVersion
  } | null {
    const routineId = this.routineIdValue
    const data = storageService.getData()
    const routine = routineId ? getRoutine(data, routineId) : undefined
    const version = routineId ? getActiveRoutineVersion(data, routineId) : undefined

    return routine && version ? { routine, version } : null
  }

  private saveRoutineVersion(
    routine: Routine,
    version: RoutineVersion,
    options: {
      transitionSeconds?: number
      exercises?: RoutineExercise[]
    },
  ): void {
    storageService.saveRoutine(
      routine.id,
      routine.name,
      options.exercises ?? version.exercises,
      options.transitionSeconds ?? version.transitionSeconds,
    )
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private async editDefaultTransition(): Promise<void> {
    const current = this.getCurrentRoutineVersion()
    if (!current || this.sheetSessionActive) {
      return
    }

    this.sheetSessionActive = true
    try {
      const seconds = await promptRoutineTransitionDefault(current.version.transitionSeconds)
      if (seconds === undefined || seconds === current.version.transitionSeconds) {
        return
      }

      const latest = this.getCurrentRoutineVersion()
      if (latest) {
        this.saveRoutineVersion(latest.routine, latest.version, {
          transitionSeconds: seconds,
        })
      }
    } finally {
      this.sheetSessionActive = false
    }
  }

  private async editRoutineExercise(routineExerciseId: string): Promise<void> {
    if (this.reorderMode) {
      return
    }

    const current = this.getCurrentRoutineVersion()
    const routineExercise = current?.version.exercises.find(
      (exercise) => exercise.id === routineExerciseId,
    )
    const exerciseName = routineExercise
      ? storageService.getData().exercises.find(
          (exercise) => exercise.id === routineExercise.exerciseId,
        )?.name
      : undefined
    if (!current || !routineExercise || !exerciseName || this.sheetSessionActive) {
      return
    }

    this.sheetSessionActive = true
    try {
      const settings = await promptRoutineExerciseSettings({
        exerciseName,
        setCount: routineExercise.setCount,
        restSeconds: routineExercise.restSeconds,
      })
      if (!settings) {
        return
      }

      if (
        settings.setCount === routineExercise.setCount
        && settings.restSeconds === routineExercise.restSeconds
      ) {
        return
      }

      const latest = this.getCurrentRoutineVersion()
      if (latest) {
        this.saveRoutineVersion(latest.routine, latest.version, {
          exercises: latest.version.exercises.map((exercise) =>
            exercise.id === routineExerciseId
              ? { ...exercise, ...settings }
              : exercise,
          ),
        })
      }
    } finally {
      this.sheetSessionActive = false
    }
  }

  private async editTransitionOverride(beforeExerciseId: string): Promise<void> {
    if (this.reorderMode) {
      return
    }

    const current = this.getCurrentRoutineVersion()
    const destination = current?.version.exercises.find(
      (exercise) => exercise.id === beforeExerciseId,
    )
    if (!current || !destination || this.sheetSessionActive) {
      return
    }

    const destinationName = storageService
      .getData()
      .exercises.find((exercise) => exercise.id === destination.exerciseId)?.name
      ?? t('routineDetail.exercises.unknown')
    this.sheetSessionActive = true

    try {
      const override = await promptTransitionOverride({
        routineDefaultSeconds: current.version.transitionSeconds,
        currentOverrideSeconds: destination.transitionBeforeOverrideSeconds,
        destinationName,
      })
      if (
        override === undefined
        || override === destination.transitionBeforeOverrideSeconds
      ) {
        return
      }

      const latest = this.getCurrentRoutineVersion()
      if (!latest) {
        return
      }

      this.saveRoutineVersion(latest.routine, latest.version, {
        exercises: latest.version.exercises.map((exercise) => exercise.id === beforeExerciseId
          ? { ...exercise, transitionBeforeOverrideSeconds: override }
          : exercise),
      })
    } finally {
      this.sheetSessionActive = false
    }
  }

  private setReorderMode(enabled: boolean): void {
    const exerciseCount = this.getCurrentRoutineVersion()?.version.exercises.length ?? 0
    const nextMode = enabled && exerciseCount > 1
    if (nextMode === this.reorderMode) {
      return
    }

    this.reorderMode = nextMode
    this.gutterMotion = nextMode ? 'collapse' : 'reveal'
    this.render()

    const focusTarget = (): void => {
      const target = nextMode
        ? this.querySelector<HTMLElement>('[data-sort-handle]')
        : this.querySelector<HTMLElement>(
            'rrr-list-row[data-action="toggle-reorder-exercises"]',
          )
      target?.focus()
    }
    const sequence = this.querySelector<HTMLElement>('rrr-sequence')
    if (nextMode && sequence?.getAttribute('aria-busy') === 'true') {
      sequence.addEventListener(
        'rrr-sequence-reorder-ready',
        () => focusTarget(),
        { once: true },
      )
    } else {
      queueMicrotask(focusTarget)
    }
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
    const reorderAvailable = exerciseCount > 1
    const reorderEnabled = this.reorderMode && reorderAvailable
    if (this.reorderMode !== reorderEnabled) {
      this.reorderMode = reorderEnabled
    }
    const gutterMotion = exerciseCount > 1 ? this.gutterMotion : 'none'
    const gutterMotionAttribute = gutterMotion === 'none'
      ? ''
      : `data-gutter-motion="${gutterMotion}"`
    const primaryMuscles = summary.primaryMuscles.length > 0
      ? summary.primaryMuscles.map(getMuscleLabel).join(', ')
      : t('routineDetail.muscles.none')
    const lastStarted = summary.lastStartedAt
      ? formatShortDate(new Date(summary.lastStartedAt))
      : t('routineDetail.lastStartedNever')
    const completedWorkouts = getCompletedWorkoutsForRoutine(
      storageService.getData(),
      summary.routine.id,
    )
    const prefillSource = completedWorkouts.find(
      (workout) => workout.id === summary.routine.prefillSourceWorkoutId,
    )
    const prefillSourceLabel = prefillSource
      ? formatShortDate(new Date(`${prefillSource.date}T12:00:00`))
      : t('routineDetail.prefill.noneValue')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <p class="status-message">${t('routineEditor.status.default')}</p>
        ${summary.routine.description ? `<p>${escapeHtml(summary.routine.description)}</p>` : ''}

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
          </div>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('routineDetail.section.flow')}</span>
          ${exerciseCount > 0
            ? renderRoutineReorderControl({
                action: 'toggle-reorder-exercises',
                available: reorderAvailable,
                enabled: reorderEnabled,
              })
            : ''}
          <div class="rrr-card routine-card" part="routine-card">
            ${
              exerciseCount > 0
                ? `
                  <rrr-sequence
                    ${reorderEnabled ? 'sortable' : ''}
                    ${gutterMotionAttribute}
                    aria-label="${escapeHtml(t('routineDetail.exercises.sequenceAria'))}"
                  >
                    ${summary.version
    ? renderRoutineFlowSequence(summary.version, {
      resolveExerciseName: (exerciseId) => this.resolveExerciseName(exerciseId),
      showExerciseDescription: !reorderEnabled,
      exerciseInteractive: !reorderEnabled,
      transitionInteractive: !reorderEnabled,
      sortable: reorderEnabled,
      swipeable: !reorderEnabled,
    })
    : ''}
                  </rrr-sequence>
                `
                : `<p>${t('routineDetail.exercises.empty')}</p>`
            }
          </div>
          ${renderRoutineFlowControls({
    addAction: 'add-routine-exercise',
    addDisabled: reorderEnabled,
    transitionAction: 'edit-transition-default',
    transitionSeconds: summary.version?.transitionSeconds ?? 0,
    prefillSourceLabel,
  })}
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('routineDetail.section.overview')}</span>
          <dl class="rrr-property-list">
            ${renderPropertyRow({
              label: t('routineDetail.muscles.label'),
              textValue: primaryMuscles,
            })}
            ${renderPropertyRow({
              label: t('routineDetail.lastStarted.label'),
              textValue: lastStarted,
            })}
          </dl>
        </rrr-section>

        <rrr-section>
          <div class="rrr-list-card">
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

      </section>
    `

    if (gutterMotion !== 'none' && this.isConnected) {
      this.gutterMotion = 'none'
    }

    this.querySelector<HTMLElement>('rrr-list-row[data-action="start-workout"]')
      ?.addEventListener('click', () => this.startWorkout())
    this.querySelector<HTMLElement>('rrr-list-row[data-action="delete-routine"]')
      ?.addEventListener('click', () => void this.deleteRoutine())
    this.querySelector<HTMLElement>('rrr-list-row[data-action="edit-transition-default"]')
      ?.addEventListener('click', () => void this.editDefaultTransition())
    this.querySelector<HTMLElement>('rrr-list-row[data-action="add-routine-exercise"]')
      ?.addEventListener('click', () => void this.addRoutineExercise())
    const reorderControl = this.querySelector<HTMLElement & { checked: boolean }>(
      'rrr-list-row[data-action="toggle-reorder-exercises"]',
    )
    reorderControl?.addEventListener('change', () => {
      this.setReorderMode(reorderControl.checked)
    })
    this.querySelector<HTMLElement>('rrr-list-row[data-action="edit-prefill-source"]')
      ?.addEventListener('click', () => void this.editPrefillSource())
    if (!reorderEnabled) {
      this.querySelectorAll<HTMLElement>('rrr-sequence-gutter[data-before-exercise-id]')
        .forEach((gutter) => {
          gutter.addEventListener('click', () => {
            const beforeExerciseId = gutter.dataset.beforeExerciseId
            if (beforeExerciseId) {
              void this.editTransitionOverride(beforeExerciseId)
            }
          })
        })
      this.querySelectorAll<HTMLElement>('rrr-list-row[data-routine-exercise-id]')
        .forEach((row) => {
          row.addEventListener('click', () => {
            const routineExerciseId = row.dataset.routineExerciseId
            if (routineExerciseId) {
              void this.editRoutineExercise(routineExerciseId)
            }
          })
        })
    }
  }
}

customElements.define('rrr-routine-detail', RrrRoutineDetail)
