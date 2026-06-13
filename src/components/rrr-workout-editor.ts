import { storageService } from '../app/storage-instance.ts'
import { getActiveExercises, getExercise } from '../domain/exercise-service.ts'
import { createExerciseEntry, createNewWorkout } from '../domain/workout-service.ts'
import type { ExerciseDefinition, Workout, WorkoutExerciseEntry } from '../domain/types.ts'
import { todayIso } from '../utils/date.ts'
import './rrr-exercise-entry.ts'

const styles = `
  :host {
    display: block;
  }

  .page {
    display: grid;
    gap: var(--rrr-space-lg);
  }

  .card {
    background: var(--rrr-color-surface);
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: var(--rrr-space-lg);
    display: grid;
    gap: var(--rrr-space-md);
  }

  .row {
    display: grid;
    gap: var(--rrr-space-md);
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .entries {
    display: grid;
    gap: var(--rrr-space-md);
  }

  .actions {
    display: flex;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }
`

export class RrrWorkoutEditor extends HTMLElement {
  private workoutIdValue: string | null = null
  private workout: Workout | null = null
  private listenersBound = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

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
    if (!this.shadowRoot || this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.shadowRoot.addEventListener('rrr-exercise-changed', (event) => {
      const customEvent = event as CustomEvent<WorkoutExerciseEntry>

      if (!this.workout) {
        return
      }

      this.workout = {
        ...this.workout,
        exercises: this.workout.exercises.map((entry) => (entry.id === customEvent.detail.id ? customEvent.detail : entry)),
      }
    })

    this.shadowRoot.addEventListener('rrr-exercise-removed', (event) => {
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

  private updateWorkoutFields(): void {
    if (!this.workout || !this.shadowRoot) {
      return
    }

    const dateInput = this.shadowRoot.querySelector<HTMLInputElement>('input[name="date"]')
    const notesInput = this.shadowRoot.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')

    this.workout = {
      ...this.workout,
      date: dateInput?.value ?? '',
      notes: notesInput?.value ?? '',
      updatedAt: new Date().toISOString(),
    }
  }

  private addExercise(): void {
    if (!this.workout || !this.shadowRoot) {
      return
    }

    const select = this.shadowRoot.querySelector<HTMLSelectElement>('select[name="exercise"]')
    const exerciseId = select?.value ?? ''

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
      window.alert('Please provide a workout date')
      return
    }

    storageService.saveWorkout(this.workout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = '#/workouts'
  }

  private renderExerciseEntries(activeExercises: ExerciseDefinition[]): void {
    if (!this.shadowRoot || !this.workout) {
      return
    }

    const container = this.shadowRoot.querySelector<HTMLDivElement>('.entries')

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
    if (!this.shadowRoot) {
      return
    }

    const activeExercises = getActiveExercises(storageService.getData())

    if (!this.workout) {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <section class="page">
          <div class="card">
            <h2>Workout not found</h2>
            <button type="button" data-action="back">Back to Workouts</button>
          </div>
        </section>
      `

      this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="back"]')?.addEventListener('click', () => {
        window.location.hash = '#/workouts'
      })
      return
    }

    const title = this.workoutIdValue ? 'Edit Workout' : 'New Workout'

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="card">
          <div>
            <h2>${title}</h2>
            <p>Capture your training details for the day.</p>
          </div>
          <div class="row">
            <label>
              Date
              <input type="date" name="date" value="${this.workout.date}" required />
            </label>
            <label>
              Notes
              <textarea name="notes" rows="3" placeholder="Workout notes">${this.workout.notes}</textarea>
            </label>
          </div>
          <div>
            <h3>Exercises</h3>
            <div class="entries"></div>
          </div>
          <div class="row">
            <label>
              Add Exercise
              <select name="exercise">
                ${activeExercises.map((exercise) => `<option value="${exercise.id}">${exercise.name}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="actions">
            <button type="button" data-action="add-exercise" ${activeExercises.length === 0 ? 'disabled' : ''}>Add</button>
            <button type="button" data-action="save">Save Workout</button>
            <button type="button" data-action="cancel">Cancel</button>
          </div>
        </div>
      </section>
    `

    this.renderExerciseEntries(activeExercises)

    this.shadowRoot.querySelector<HTMLInputElement>('input[name="date"]')?.addEventListener('input', () => {
      this.updateWorkoutFields()
    })

    this.shadowRoot.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')?.addEventListener('input', () => {
      this.updateWorkoutFields()
    })

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="add-exercise"]')?.addEventListener('click', () => {
      this.addExercise()
    })

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="save"]')?.addEventListener('click', () => {
      this.saveWorkout()
    })

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="cancel"]')?.addEventListener('click', () => {
      window.location.hash = '#/workouts'
    })
  }
}

customElements.define('rrr-workout-editor', RrrWorkoutEditor)
