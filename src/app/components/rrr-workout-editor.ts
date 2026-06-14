import { storageService } from '../storage-instance.ts'
import { getActiveExercises, getExercise } from '../../domain/exercise-service.ts'
import { createExerciseEntry, createNewWorkout } from '../../domain/workout-service.ts'
import type { ExerciseDefinition, Workout, WorkoutExerciseEntry } from '../../domain/types.ts'
import { t } from '../../i18n/index.ts'
import { todayIso } from '../../utils/date.ts'
import './rrr-exercise-entry.ts'
import styles from './rrr-workout-editor.css?inline'

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

    const dateField = this.querySelector<HTMLInputElement>('input[name="date"]')
    const notesField = this.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')

    this.workout = {
      ...this.workout,
      date: dateField?.value ?? '',
      notes: notesField?.value ?? '',
      updatedAt: new Date().toISOString(),
    }
  }

  private addExercise(): void {
    if (!this.workout) {
      return
    }

    const select = this.querySelector<HTMLSelectElement>('select[name="exercise"]')
    const exerciseId = String(select?.value ?? '')

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
      const dateField = this.querySelector<HTMLInputElement>('input[name="date"]')

      if (dateField) {
        dateField.setAttribute('aria-invalid', 'true')
      }

      this.setStatus(t('workout.validation.dateRequired'), 'error')
      this.render()
      this.querySelector<HTMLInputElement>('input[name="date"]')?.focus()
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
      container.innerHTML = `<p>${t('workout.section.emptyExercises')}</p>`
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
            <h2>${t('workout.notFound.title')}</h2>
            <button type="button" data-action="back">${t('workout.notFound.back')}</button>
          </rrr-card>
        </section>
      `

      this.querySelector<HTMLButtonElement>('button[data-action="back"]')?.addEventListener('click', () => {
        window.location.hash = '#/workouts'
      })
      return
    }

    const title = this.workoutIdValue ? t('workout.title.edit') : t('workout.title.new')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <div>
            <h2>${title}</h2>
            <p>${t('workout.subtitle')}</p>
          </div>
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || t('workout.status.default')}</p>
          <div class="row">
            <label>
              ${t('field.date')}
              <input class="field-input" name="date" type="date" />
            </label>
            <label>
              ${t('workout.form.notes')}
              <textarea class="field-textarea" name="notes" rows="3" placeholder="${t('workout.form.notes.placeholder')}"></textarea>
            </label>
          </div>
          <div>
            <h3>${t('workout.section.exercises')}</h3>
            <div class="entries" aria-live="polite"></div>
          </div>
          <div class="row">
            <label>
              ${t('label.addExercise')}
              <select class="field-select" name="exercise">
                ${activeExercises.map((exercise) => `<option value="${exercise.id}">${exercise.name}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="actions">
            <button type="button" data-action="add-exercise" ${activeExercises.length === 0 ? 'disabled' : ''}>${t('action.add')}</button>
            <button type="button" data-action="save">${t('workout.action.save')}</button>
            <button type="button" data-action="cancel">${t('action.cancel')}</button>
          </div>
        </rrr-card>
      </section>
    `

    const dateField = this.querySelector<HTMLInputElement>('input[name="date"]')
    const notesField = this.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')
    const exerciseField = this.querySelector<HTMLSelectElement>('select[name="exercise"]')

    if (dateField) {
      dateField.value = this.workout.date
      dateField.removeAttribute('aria-invalid')
    }

    if (notesField) {
      notesField.value = this.workout.notes
    }

    if (exerciseField) {
      exerciseField.value = activeExercises[0]?.id ?? ''
    }

    this.renderExerciseEntries(activeExercises)

    this.querySelector<HTMLInputElement>('input[name="date"]')?.addEventListener('input', () => {
      this.updateWorkoutFields()
    })

    this.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')?.addEventListener('input', () => {
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
