import { storageService } from '../app/storage-instance.ts'
import { getActiveExercises } from '../domain/exercise-service.ts'
import { createRoutineExercise, getActiveRoutineVersion, getRoutine } from '../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'
import { t } from '../i18n/index.ts'
import type { PlannedSet, RoutineExercise } from '../domain/types.ts'
import { todayIso } from '../utils/date.ts'

const styles = `
  .exercise-list {
    display: grid;
    gap: var(--rrr-space-md);
  }

  .exercise-item {
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-md);
    padding: var(--rrr-space-md);
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .exercise-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }

  .exercise-name {
    font-weight: bold;
  }

  .exercise-order {
    display: flex;
    gap: var(--rrr-space-xs, 0.25rem);
  }

  .planned-sets {
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .planned-set {
    display: flex;
    gap: var(--rrr-space-sm);
    align-items: center;
    flex-wrap: wrap;
  }

  .planned-set input {
    width: 6rem;
  }

  .add-exercise-row {
    display: flex;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
    align-items: flex-end;
  }

  .add-exercise-row label {
    flex: 1;
    min-width: 12rem;
  }

  .field-input,
  .field-select {
    display: block;
    width: 100%;
  }
`

export class RrrRoutineEditor extends HTMLElement {
  private routineIdValue: string | null = null
  private name = ''
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
      this.exercises = version ? [...version.exercises] : []
    } else {
      this.name = ''
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
      const target = event.target as HTMLElement
      const action = target.dataset.action

      if (action === 'add-exercise') {
        this.addExercise()
        return
      }

      if (action === 'remove-exercise') {
        const id = target.dataset.id

        if (id) {
          this.removeExercise(id)
        }

        return
      }

      if (action === 'move-up') {
        const id = target.dataset.id

        if (id) {
          this.moveExercise(id, -1)
        }

        return
      }

      if (action === 'move-down') {
        const id = target.dataset.id

        if (id) {
          this.moveExercise(id, 1)
        }

        return
      }

      if (action === 'add-set') {
        const id = target.dataset.id

        if (id) {
          this.addPlannedSet(id)
        }

        return
      }

      if (action === 'remove-set') {
        const exerciseId = target.dataset.exerciseId
        const setIndex = target.dataset.setIndex

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
    const nameInput = this.querySelector<HTMLInputElement>('input[name="routine-name"]')

    if (nameInput) {
      this.name = nameInput.value
    }

    this.exercises = this.exercises.map((exercise) => {
      const sets = exercise.plannedSets.map((set, index) => {
        if (set.kind === 'reps-weight') {
          const repsInput = this.querySelector<HTMLInputElement>(
            `input[data-exercise-id="${exercise.id}"][data-set-index="${index}"][data-field="reps"]`,
          )
          const weightInput = this.querySelector<HTMLInputElement>(
            `input[data-exercise-id="${exercise.id}"][data-set-index="${index}"][data-field="weight"]`,
          )

          return {
            kind: 'reps-weight' as const,
            targetReps: repsInput?.value ? Number(repsInput.value) : null,
            targetWeightKg: weightInput?.value ? Number(weightInput.value) : null,
          }
        }

        const secondsInput = this.querySelector<HTMLInputElement>(
          `input[data-exercise-id="${exercise.id}"][data-set-index="${index}"][data-field="seconds"]`,
        )

        return {
          kind: 'duration' as const,
          targetSeconds: secondsInput?.value ? Number(secondsInput.value) : null,
        }
      })

      return { ...exercise, plannedSets: sets }
    })
  }

  private addExercise(): void {
    this.readFields()

    const select = this.querySelector<HTMLSelectElement>('select[name="add-exercise"]')
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

  private addPlannedSet(exerciseId: string): void {
    this.readFields()
    const data = storageService.getData()
    const exerciseDef = data.exercises.find((e) => e.id === exerciseId)
    const kind = exerciseDef?.kind ?? 'reps-weight'
    const newSet: PlannedSet =
      kind === 'duration'
        ? { kind: 'duration', targetSeconds: null }
        : { kind: 'reps-weight', targetReps: null, targetWeightKg: null }

    this.exercises = this.exercises.map((e) =>
      e.id === exerciseId ? { ...e, plannedSets: [...e.plannedSets, newSet] } : e,
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
      this.querySelector<HTMLInputElement>('input[name="routine-name"]')?.focus()
      return
    }

    const saved = storageService.saveRoutine(this.routineIdValue, this.name.trim(), this.exercises)

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
    window.location.hash = `#/workouts/${workout.id}`
  }

  private render(): void {
    const data = storageService.getData()
    const activeExercises = getActiveExercises(data)
    const isEditing = this.routineIdValue !== null
    const title = isEditing ? t('routineEditor.title.edit') : t('routineEditor.title.new')

    if (isEditing && this.routineIdValue !== null && !getRoutine(data, this.routineIdValue)) {
      this.innerHTML = `
        <style>${styles}</style>
        <section class="page">
          <rrr-card size="lg">
            <h2>${t('routineEditor.notFound.title')}</h2>
            <button type="button" data-action="back">${t('routineEditor.notFound.back')}</button>
          </rrr-card>
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
                    if (set.kind === 'reps-weight') {
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
                          <button type="button" data-action="remove-set"
                            data-exercise-id="${routineExercise.id}"
                            data-set-index="${setIndex}" aria-label="${escapeHtml(t('routineEditor.action.removeSetAria', { index: setIndex + 1, name: exerciseName }))}">${t('action.remove')}</button>
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
                        <button type="button" data-action="remove-set"
                          data-exercise-id="${routineExercise.id}"
                          data-set-index="${setIndex}" aria-label="${escapeHtml(t('routineEditor.action.removeSetAria', { index: setIndex + 1, name: exerciseName }))}">${t('action.remove')}</button>
                      </div>
                    `
                  })
                  .join('')

            return `
              <section class="exercise-item" aria-labelledby="${exerciseHeadingId}">
                <div class="exercise-header">
                  <span class="exercise-name" id="${exerciseHeadingId}">${escapeHtml(exerciseName)}</span>
                  <div class="exercise-order">
                    <button type="button" data-action="move-up" data-id="${routineExercise.id}"
                      ${isFirst ? 'disabled' : ''} aria-label="${escapeHtml(t('routineEditor.action.moveUpAria', { name: exerciseName }))}">↑</button>
                    <button type="button" data-action="move-down" data-id="${routineExercise.id}"
                      ${isLast ? 'disabled' : ''} aria-label="${escapeHtml(t('routineEditor.action.moveDownAria', { name: exerciseName }))}">↓</button>
                    <button type="button" data-action="remove-exercise" data-id="${routineExercise.id}" aria-label="${escapeHtml(t('routineEditor.action.removeExerciseAria', { name: exerciseName }))}">${t('action.remove')}</button>
                  </div>
                </div>
                <div class="planned-sets">${setsHtml}</div>
                <div>
                  <button type="button" data-action="add-set" data-id="${routineExercise.id}" aria-label="${escapeHtml(t('routineEditor.action.addSetAria', { name: exerciseName }))}">${t('routineEditor.action.addSet')}</button>
                </div>
              </section>
            `
          })
          .join('')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <div>
            <h2>${title}</h2>
          </div>
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || t('routineEditor.status.default')}</p>
          <div class="row">
            <label>
              ${t('field.name')}
              <input class="field-input" name="routine-name" type="text" placeholder="${t('routineEditor.field.name.placeholder')}" autocomplete="off" />
            </label>
          </div>
          <div>
            <h3>${t('routineEditor.section.exercises')}</h3>
            <div class="exercise-list" aria-live="polite">${exerciseListHtml}</div>
          </div>
          <div class="add-exercise-row">
            <label>
              ${t('label.addExercise')}
              <select class="field-select" name="add-exercise">
                ${activeExercises.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
              </select>
            </label>
            <button type="button" data-action="add-exercise">${t('action.add')}</button>
          </div>
          <div class="actions">
            <button type="button" data-action="save">${t('routineEditor.action.save')}</button>
            ${isEditing ? `<button type="button" data-action="start-workout">${t('routineEditor.action.startWorkout')}</button>` : ''}
            <button type="button" data-action="back">${t('action.cancel')}</button>
          </div>
        </rrr-card>
      </section>
    `

    const nameField = this.querySelector<HTMLInputElement>('input[name="routine-name"]')
    const exerciseField = this.querySelector<HTMLSelectElement>('select[name="add-exercise"]')

    if (nameField) {
      nameField.value = this.name
    }

    if (exerciseField) {
      exerciseField.value = activeExercises[0]?.id ?? ''
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-routine-editor', RrrRoutineEditor)
