import { storageService } from '../storage-instance.ts'
import { getActiveExercises } from '../../domain/exercise-service.ts'
import { createRoutineExercise, getActiveRoutineVersion, getRoutine } from '../../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../../domain/workout-service.ts'
import { t } from '../../i18n/index.ts'
import type { PlannedSet, RoutineExercise } from '../../domain/types.ts'
import { todayIso } from '../../utils/date.ts'
import styles from './rrr-routine-editor.css?inline'

export class RrrRoutineEditor extends HTMLElement {
  private static readonly defaultRestSeconds = 20
  private static readonly defaultTransitionSeconds = 10

  private routineIdValue: string | null = null
  private name = ''
  private transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
  private exercises: RoutineExercise[] = []
  private listenersBound = false
  private statusMessage = ''
  private statusType: 'error' | 'success' | null = null

  set routineId(value: string | null) {
    this.routineIdValue = value
    this.initialize()
  }

  get routineId(): string | null {
    return this.routineIdValue
  }

  connectedCallback(): void {
    this.bindListeners()
    this.initialize()
  }

  private initialize(): void {
    const data = storageService.getData()

    if (this.routineIdValue) {
      const routine = getRoutine(data, this.routineIdValue)

      if (!routine) {
        this.name = ''
        this.exercises = []
        this.render()
        return
      }

      const version = getActiveRoutineVersion(data, this.routineIdValue)

      this.name = routine.name
      this.transitionSeconds = Math.max(0, version?.transitionSeconds ?? RrrRoutineEditor.defaultTransitionSeconds)
      this.exercises = version
        ? version.exercises.map((exercise) => ({
            ...exercise,
            restSeconds: Math.max(0, exercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds),
          }))
        : []
    } else {
      this.name = ''
      this.transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
      this.exercises = []
    }

    this.render()
  }

  private setStatus(message: string, type: 'error' | 'success'): void {
    this.statusMessage = message
    this.statusType = type
  }

  private bindListeners(): void {
    if (this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.addEventListener('click', (event) => {
      const actionTarget = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)

      if (!actionTarget) {
        return
      }

      const action = actionTarget.dataset.action

      if (action === 'add-exercise') {
        this.addExercise()
        return
      }

      if (action === 'remove-exercise') {
        const id = actionTarget.dataset.id

        if (id) {
          this.removeExercise(id)
        }

        return
      }

      if (action === 'move-up') {
        const id = actionTarget.dataset.id

        if (id) {
          this.moveExercise(id, -1)
        }

        return
      }

      if (action === 'move-down') {
        const id = actionTarget.dataset.id

        if (id) {
          this.moveExercise(id, 1)
        }

        return
      }

      if (action === 'add-set') {
        const id = actionTarget.dataset.id

        if (id) {
          this.addPlannedSet(id)
        }

        return
      }

      if (action === 'remove-set') {
        const exerciseId = actionTarget.dataset.exerciseId
        const setIndex = actionTarget.dataset.setIndex

        if (exerciseId && setIndex !== undefined) {
          this.removePlannedSet(exerciseId, Number(setIndex))
        }

        return
      }

      if (action === 'save') {
        this.save()
        return
      }

      if (action === 'start-workout') {
        this.startWorkout()
        return
      }

      if (action === 'back') {
        window.location.hash = '#/routines'
      }
    })
  }

  private readFields(): void {
    const nameInput = this.querySelector<HTMLInputElement>('rrr-input[name="routine-name"]')

    if (nameInput) {
      this.name = nameInput.value
    }

    const transitionInput = this.querySelector<HTMLInputElement>('input[name="routine-transition-seconds"]')
    const transitionValue = transitionInput?.valueAsNumber
    this.transitionSeconds = Number.isFinite(transitionValue)
      ? Math.max(0, Math.trunc(transitionValue ?? RrrRoutineEditor.defaultTransitionSeconds))
      : this.transitionSeconds

    this.exercises = this.exercises.map((exercise) => {
      const restInput = this.querySelector<HTMLInputElement>(
        `input[data-exercise-id="${exercise.id}"][data-field="rest-seconds"]`,
      )
      const restValue = restInput?.valueAsNumber
      const sets = exercise.plannedSets.map((set, index) => {
        if (set.kind === 'reps') {
          const repsInput = this.querySelector<HTMLInputElement>(
            `input[data-exercise-id="${exercise.id}"][data-set-index="${index}"][data-field="reps"]`,
          )
          const weightInput = this.querySelector<HTMLInputElement>(
            `input[data-exercise-id="${exercise.id}"][data-set-index="${index}"][data-field="weight"]`,
          )

          return {
            kind: 'reps' as const,
            targetReps: repsInput?.value ? Number(repsInput.value) : null,
            targetWeightKg: weightInput?.value ? Number(weightInput.value) : null,
          }
        }

        const secondsInput = this.querySelector<HTMLInputElement>(
          `input[data-exercise-id="${exercise.id}"][data-set-index="${index}"][data-field="seconds"]`,
        )

        return {
          kind: 'time' as const,
          targetSeconds: secondsInput?.value ? Number(secondsInput.value) : null,
        }
      })

      return {
        ...exercise,
        restSeconds: Number.isFinite(restValue)
          ? Math.max(0, Math.trunc(restValue ?? RrrRoutineEditor.defaultRestSeconds))
          : Math.max(0, exercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds),
        plannedSets: sets,
      }
    })
  }

  private addExercise(): void {
    this.readFields()

    const select = this.querySelector<HTMLElement & { value: string }>('rrr-select[name="add-exercise"]')
    const exerciseId = String(select?.value ?? '')

    if (!exerciseId) {
      return
    }

    this.exercises = [...this.exercises, createRoutineExercise(exerciseId)]
    this.render()
  }

  private removeExercise(id: string): void {
    this.readFields()
    this.exercises = this.exercises.filter((e) => e.id !== id)
    this.render()
  }

  private moveExercise(id: string, direction: -1 | 1): void {
    this.readFields()
    const index = this.exercises.findIndex((e) => e.id === id)

    if (index === -1) {
      return
    }

    const next = index + direction

    if (next < 0 || next >= this.exercises.length) {
      return
    }

    const updated = [...this.exercises]
    const temp = updated[index]
    const swapTarget = updated[next]

    if (!temp || !swapTarget) {
      return
    }

    updated[index] = swapTarget
    updated[next] = temp

    this.exercises = updated
    this.render()
  }

  private addPlannedSet(routineExerciseId: string): void {
    this.readFields()
    const data = storageService.getData()
    const routineExercise = this.exercises.find((exercise) => exercise.id === routineExerciseId)
    const exerciseDef = routineExercise
      ? data.exercises.find((exercise) => exercise.id === routineExercise.exerciseId)
      : undefined
    const kind = exerciseDef?.kind ?? 'reps'
    const newSet: PlannedSet =
      kind === 'time'
        ? { kind: 'time', targetSeconds: null }
        : { kind: 'reps', targetReps: null, targetWeightKg: null }

    this.exercises = this.exercises.map((e) =>
      e.id === routineExerciseId ? { ...e, plannedSets: [...e.plannedSets, newSet] } : e,
    )
    this.render()
  }

  private removePlannedSet(exerciseId: string, setIndex: number): void {
    this.readFields()
    this.exercises = this.exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, plannedSets: e.plannedSets.filter((_, i) => i !== setIndex) }
        : e,
    )
    this.render()
  }

  private save(): void {
    this.readFields()

    if (!this.name.trim()) {
      this.setStatus(t('routineEditor.status.nameRequired'), 'error')
      this.render()
      this.querySelector<HTMLElement>('rrr-input[name="routine-name"]')?.focus()
      return
    }

    const saved = storageService.saveRoutine(this.routineIdValue, this.name.trim(), this.exercises, this.transitionSeconds)

    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.routineIdValue = saved.id
    window.location.hash = '#/routines'
  }

  private startWorkout(): void {
    if (!this.routineIdValue) {
      this.setStatus(t('routineEditor.status.saveFirst'), 'error')
      this.render()
      return
    }

    const data = storageService.getData()
    const workout = createWorkoutFromRoutine(data, this.routineIdValue, todayIso())

    if (!workout) {
      this.setStatus(t('routineEditor.status.startError'), 'error')
      this.render()
      return
    }

    storageService.saveWorkout(workout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = `#/workouts/${workout.id}/log`
  }

  private render(): void {
    const data = storageService.getData()
    const activeExercises = getActiveExercises(data)
    const isEditing = this.routineIdValue !== null

    if (isEditing && this.routineIdValue !== null && !getRoutine(data, this.routineIdValue)) {
      this.innerHTML = `
        <style>${styles}</style>
        <section class="page">
          <div class="rrr-card">
            <h2>${t('routineEditor.notFound.title')}</h2>
            <rrr-button type="button" variant="outline" data-action="back">${t('routineEditor.notFound.back')}</rrr-button>
          </div>
        </section>
      `
      return
    }

    const exerciseListHtml = this.exercises.length === 0
      ? `<p>${t('routineEditor.exercises.empty')}</p>`
      : this.exercises
          .map((routineExercise, index) => {
            const def = data.exercises.find((e) => e.id === routineExercise.exerciseId)
            const exerciseName = def?.name ?? t('routineEditor.exercises.unknown')
            const exerciseHeadingId = `routine-exercise-${routineExercise.id}`
            const isFirst = index === 0
            const isLast = index === this.exercises.length - 1

            const setsHtml = routineExercise.plannedSets.length === 0
              ? `<p>${t('routineEditor.sets.empty')}</p>`
              : routineExercise.plannedSets
                  .map((set, setIndex) => {
                    if (set.kind === 'reps') {
                      return `
                        <div class="planned-set">
                          <span>${t('routineEditor.set.label', { index: setIndex + 1 })}</span>
                          <label>${t('routineEditor.field.targetReps')} <input type="number" min="0" placeholder="${t('routineEditor.field.targetReps.placeholder')}"
                            data-exercise-id="${routineExercise.id}"
                            data-set-index="${setIndex}"
                            data-field="reps"
                            value="${set.targetReps ?? ''}" /></label>
                          <label>${t('routineEditor.field.targetWeight')} <input type="number" min="0" step="0.5" placeholder="${t('routineEditor.field.targetWeight.placeholder')}"
                            data-exercise-id="${routineExercise.id}"
                            data-set-index="${setIndex}"
                            data-field="weight"
                            value="${set.targetWeightKg ?? ''}" /></label>
                          <rrr-button type="button" variant="ghost" tone="danger" data-action="remove-set"
                            data-exercise-id="${routineExercise.id}"
                            data-set-index="${setIndex}" aria-label="${escapeHtml(t('routineEditor.action.removeSetAria', { index: setIndex + 1, name: exerciseName }))}"><rrr-icon name="delete"></rrr-icon></rrr-button>
                        </div>
                      `
                    }

                    return `
                      <div class="planned-set">
                        <span>${t('routineEditor.set.label', { index: setIndex + 1 })}</span>
                        <label>${t('routineEditor.field.targetSeconds')} <input type="number" min="0" placeholder="${t('routineEditor.field.targetSeconds.placeholder')}"
                          data-exercise-id="${routineExercise.id}"
                          data-set-index="${setIndex}"
                          data-field="seconds"
                          value="${set.targetSeconds ?? ''}" /></label>
                        <rrr-button type="button" variant="ghost" tone="danger" data-action="remove-set"
                          data-exercise-id="${routineExercise.id}"
                          data-set-index="${setIndex}" aria-label="${escapeHtml(t('routineEditor.action.removeSetAria', { index: setIndex + 1, name: exerciseName }))}"><rrr-icon name="delete"></rrr-icon></rrr-button>
                      </div>
                    `
                  })
                  .join('')

            return `
              <section class="exercise-item" aria-labelledby="${exerciseHeadingId}">
                <div class="exercise-header">
                  <span class="exercise-name" id="${exerciseHeadingId}">${escapeHtml(exerciseName)}</span>
                  <div class="exercise-order">
                    <rrr-button type="button" variant="outline" data-action="move-up" data-id="${routineExercise.id}"
                      ${isFirst ? 'disabled' : ''} aria-label="${escapeHtml(t('routineEditor.action.moveUpAria', { name: exerciseName }))}">↑</rrr-button>
                    <rrr-button type="button" variant="outline" data-action="move-down" data-id="${routineExercise.id}"
                      ${isLast ? 'disabled' : ''} aria-label="${escapeHtml(t('routineEditor.action.moveDownAria', { name: exerciseName }))}">↓</rrr-button>
                    <rrr-button type="button" variant="ghost" tone="danger" data-action="remove-exercise" data-id="${routineExercise.id}" aria-label="${escapeHtml(t('routineEditor.action.removeExerciseAria', { name: exerciseName }))}"><rrr-icon name="delete"></rrr-icon></rrr-button>
                  </div>
                </div>
                <label>
                  ${t('routineEditor.field.restSeconds')}
                  <input type="number" min="0" step="1"
                    data-exercise-id="${routineExercise.id}"
                    data-field="rest-seconds"
                    value="${Math.max(0, routineExercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds)}" />
                </label>
                <div class="planned-sets">${setsHtml}</div>
                <div>
                  <rrr-button type="button" data-action="add-set" data-id="${routineExercise.id}" aria-label="${escapeHtml(t('routineEditor.action.addSetAria', { name: exerciseName }))}">${t('routineEditor.action.addSet')}</rrr-button>
                </div>
              </section>
            `
          })
          .join('')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="rrr-card">
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || t('routineEditor.status.default')}</p>
          <div class="row">
            <rrr-input label="${t('field.name')}" name="routine-name" placeholder="${t('routineEditor.field.name.placeholder')}"></rrr-input>
            <label>
              ${t('routineEditor.field.transitionSeconds')}
              <input type="number" min="0" step="1" name="routine-transition-seconds" value="${this.transitionSeconds}" />
            </label>
          </div>
          <div>
            <h3>${t('routineEditor.section.exercises')}</h3>
            <div class="exercise-list" aria-live="polite">${exerciseListHtml}</div>
          </div>
          <div class="add-exercise-row">
            <rrr-select label="${t('label.addExercise')}" name="add-exercise">
              ${activeExercises.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
            </rrr-select>
            <rrr-button type="button" data-action="add-exercise">${t('action.add')}</rrr-button>
          </div>
          <div class="actions">
            <rrr-button type="button" data-action="save">${t('routineEditor.action.save')}</rrr-button>
            ${isEditing ? `<rrr-button type="button" data-action="start-workout">${t('routineEditor.action.startWorkout')}</rrr-button>` : ''}
            <rrr-button type="button" variant="outline" data-action="back">${t('action.cancel')}</rrr-button>
          </div>
        </div>
      </section>
    `

    const nameField = this.querySelector<HTMLElement>('rrr-input[name="routine-name"]')
    const exerciseField = this.querySelector<HTMLElement & { value: string }>('rrr-select[name="add-exercise"]')

    if (nameField) {
      nameField.setAttribute('value', this.name)
    }

    if (exerciseField) {
      exerciseField.setAttribute('value', activeExercises[0]?.id ?? '')
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-routine-editor', RrrRoutineEditor)
