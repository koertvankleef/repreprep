import { storageService } from '../app/storage-instance.ts'
import { Required, type Validator } from '@lion/ui/form-core.js'
import { getActiveExercises, getExercise } from '../domain/exercise-service.ts'
import { createExerciseEntry, createNewWorkout } from '../domain/workout-service.ts'
import type { ExerciseDefinition, Workout, WorkoutExerciseEntry } from '../domain/types.ts'
import { todayIso } from '../utils/date.ts'
import './rrr-exercise-entry.ts'

const styles = `
  .entries {
    display: grid;
    gap: var(--rrr-space-md);
  }

  lion-input-datepicker,
  lion-textarea,
  lion-select {
    display: block;
  }
`

interface LionFieldLike extends HTMLElement {
  modelValue: unknown
  submitted: boolean
  validators: Validator[]
}

function isoDateToDate(value: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const parsed = new Date(`${value}T00:00:00`)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function dateToIsoDate(value: unknown): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return ''
  }

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export class RrrWorkoutEditor extends HTMLElement {
  private workoutIdValue: string | null = null
  private workout: Workout | null = null
  private listenersBound = false
  private statusMessage = ''
  private statusType: 'error' | 'success' | null = null

  set workoutId(value: string | null) {
    this.workoutIdValue = value
    this.initializeWorkout()
  }

  get workoutId(): string | null {
    return this.workoutIdValue
  }

  connectedCallback(): void {
    this.bindListeners()
    this.initializeWorkout()
  }

  private bindListeners(): void {
    if (this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.addEventListener('rrr-exercise-changed', (event) => {
      const customEvent = event as CustomEvent<WorkoutExerciseEntry>

      if (!this.workout) {
        return
      }

      this.workout = {
        ...this.workout,
        exercises: this.workout.exercises.map((entry) => (entry.id === customEvent.detail.id ? customEvent.detail : entry)),
      }
    })

    this.addEventListener('rrr-exercise-removed', (event) => {
      const customEvent = event as CustomEvent<string>

      if (!this.workout) {
        return
      }

      this.workout = {
        ...this.workout,
        exercises: this.workout.exercises.filter((entry) => entry.id !== customEvent.detail),
      }

      this.render()
    })
  }

  private initializeWorkout(): void {
    const data = storageService.getData()

    if (this.workoutIdValue) {
      this.workout = data.workouts.find((workout) => workout.id === this.workoutIdValue) ?? null
    } else {
      this.workout = createNewWorkout(todayIso())
    }

    this.render()
  }

  private setStatus(message: string, type: 'error' | 'success'): void {
    this.statusMessage = message
    this.statusType = type
  }

  private updateWorkoutFields(): void {
    if (!this.workout) {
      return
    }

    const dateField = this.querySelector<LionFieldLike>('lion-input-datepicker[name="date"]')
    const notesField = this.querySelector<LionFieldLike>('lion-textarea[name="notes"]')

    this.workout = {
      ...this.workout,
      date: dateToIsoDate(dateField?.modelValue),
      notes: String(notesField?.modelValue ?? ''),
      updatedAt: new Date().toISOString(),
    }
  }

  private addExercise(): void {
    if (!this.workout) {
      return
    }

    const select = this.querySelector<LionFieldLike>('lion-select[name="exercise"]')
    const exerciseId = String(select?.modelValue ?? '')

    if (!exerciseId) {
      return
    }

    this.updateWorkoutFields()
    this.workout = {
      ...this.workout,
      exercises: [...this.workout.exercises, createExerciseEntry(exerciseId)],
      updatedAt: new Date().toISOString(),
    }
    this.render()
  }

  private saveWorkout(): void {
    this.updateWorkoutFields()

    if (!this.workout || !this.workout.date.trim()) {
      const dateField = this.querySelector<LionFieldLike>('lion-input-datepicker[name="date"]')

      if (dateField) {
        dateField.submitted = true
      }

      this.setStatus('Please provide a workout date.', 'error')
      this.render()
      this.querySelector<LionFieldLike>('lion-input-datepicker[name="date"]')?.focus()
      return
    }

    storageService.saveWorkout(this.workout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = '#/workouts'
  }

  private renderExerciseEntries(activeExercises: ExerciseDefinition[]): void {
    if (!this.workout) {
      return
    }

    const container = this.querySelector<HTMLDivElement>('.entries')

    if (!container) {
      return
    }

    if (this.workout.exercises.length === 0) {
      container.innerHTML = '<p>No exercises added yet.</p>'
      return
    }

    this.workout.exercises.forEach((entry) => {
      const exerciseElement = document.createElement('rrr-exercise-entry') as HTMLElement & {
        entry: WorkoutExerciseEntry
        exercise: ExerciseDefinition | null
      }
      const exercise = activeExercises.find((item) => item.id === entry.exerciseId) ?? getExercise(storageService.getData(), entry.exerciseId) ?? null

      exerciseElement.entry = entry
      exerciseElement.exercise = exercise
      container.append(exerciseElement)
    })
  }

  private render(): void {
    const activeExercises = getActiveExercises(storageService.getData())

    if (!this.workout) {
      this.innerHTML = `
        <style>${styles}</style>
        <section class="page">
          <rrr-card size="lg">
            <h2>Workout not found</h2>
            <button type="button" data-action="back">Back to Workouts</button>
          </rrr-card>
        </section>
      `

      this.querySelector<HTMLButtonElement>('button[data-action="back"]')?.addEventListener('click', () => {
        window.location.hash = '#/workouts'
      })
      return
    }

    const title = this.workoutIdValue ? 'Edit Workout' : 'New Workout'

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <div>
            <h2>${title}</h2>
            <p>Capture your training details for the day.</p>
          </div>
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || 'Fill in workout details and save when finished.'}</p>
          <div class="row">
            <lion-input-datepicker name="date" label="Date"></lion-input-datepicker>
            <lion-textarea name="notes" label="Notes"></lion-textarea>
          </div>
          <div>
            <h3>Exercises</h3>
            <div class="entries" aria-live="polite"></div>
          </div>
          <div class="row">
            <lion-select name="exercise" label="Add Exercise">
              <select slot="input">
                ${activeExercises.map((exercise) => `<option value="${exercise.id}">${exercise.name}</option>`).join('')}
              </select>
            </lion-select>
          </div>
          <div class="actions">
            <button type="button" data-action="add-exercise" ${activeExercises.length === 0 ? 'disabled' : ''}>Add</button>
            <button type="button" data-action="save">Save Workout</button>
            <button type="button" data-action="cancel">Cancel</button>
          </div>
        </rrr-card>
      </section>
    `

    const dateField = this.querySelector<LionFieldLike>('lion-input-datepicker[name="date"]')
    const notesField = this.querySelector<LionFieldLike>('lion-textarea[name="notes"]')
    const exerciseField = this.querySelector<LionFieldLike>('lion-select[name="exercise"]')

    if (dateField) {
      dateField.modelValue = isoDateToDate(this.workout.date)
      dateField.validators = [new Required()]
      dateField.setAttribute('field-name', 'workout date')
    }

    if (notesField) {
      notesField.modelValue = this.workout.notes
      notesField.validators = []
      notesField.setAttribute('placeholder', 'Workout notes')
      notesField.setAttribute('rows', '3')
    }

    if (exerciseField) {
      exerciseField.modelValue = activeExercises[0]?.id ?? ''
      exerciseField.validators = []
      exerciseField.setAttribute('field-name', 'exercise')
    }

    this.renderExerciseEntries(activeExercises)

    this.querySelector<LionFieldLike>('lion-input-datepicker[name="date"]')?.addEventListener('model-value-changed', () => {
      this.updateWorkoutFields()
    })

    this.querySelector<LionFieldLike>('lion-textarea[name="notes"]')?.addEventListener('model-value-changed', () => {
      this.updateWorkoutFields()
    })

    this.querySelector<HTMLButtonElement>('button[data-action="add-exercise"]')?.addEventListener('click', () => {
      this.addExercise()
    })

    this.querySelector<HTMLButtonElement>('button[data-action="save"]')?.addEventListener('click', () => {
      this.saveWorkout()
    })

    this.querySelector<HTMLButtonElement>('button[data-action="cancel"]')?.addEventListener('click', () => {
      window.location.hash = '#/workouts'
    })
  }
}

customElements.define('rrr-workout-editor', RrrWorkoutEditor)
