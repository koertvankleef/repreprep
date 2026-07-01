import { storageService } from '../storage-instance.ts'
import { getActiveExercises, getExercise } from '../../domain/exercise-service.ts'
import { createExerciseEntry, createNewWorkout } from '../../domain/workout-service.ts'
import type { ExerciseDefinition, Workout, WorkoutExerciseEntry } from '../../domain/types.ts'
import { getLocale, t } from '../../i18n/index.ts'
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

    const dateField = this.querySelector<HTMLElement & { value: string }>('rrr-date-field[name="date"]')
    const notesField = this.querySelector<HTMLElement & { value: string }>('rrr-textarea[name="notes"]')

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

    const select = this.querySelector<HTMLElement & { value: string }>('rrr-select[name="exercise"]')
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
      const dateField = this.querySelector<HTMLElement>('rrr-date-field[name="date"]')

      if (dateField) {
        dateField.setAttribute('invalid', '')
      }

      this.setStatus(t('workout.validation.dateRequired'), 'error')
      this.render()
      this.querySelector<HTMLElement>('rrr-date-field[name="date"]')?.focus()
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
          <div class="rrr-card">
            <h2>${t('workout.notFound.title')}</h2>
            <rrr-button type="button" variant="outline" data-action="back">${t('workout.notFound.back')}</rrr-button>
          </div>
        </section>
      `

      this.querySelector<HTMLElement>('rrr-button[data-action="back"]')?.addEventListener('click', () => {
        window.location.hash = '#/workouts'
      })
      return
    }

    const isEditContext = this.workoutIdValue !== null && this.workout.updatedAt !== this.workout.createdAt
    const subtitle = isEditContext ? t('workout.subtitle.edit') : t('workout.subtitle.new')
    const defaultStatus = isEditContext ? t('workout.status.default.edit') : t('workout.status.default.new')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="rrr-card">
          <div>
            <p>${subtitle}</p>
          </div>
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || defaultStatus}</p>
          <div class="row">
            <rrr-date-field
              label="${t('field.date')}"
              name="date"
              locale="${getLocale()}"
              picker-title="${t('workout.form.datePickerTitle')}"
              confirm-label="${t('action.confirm')}"
              dismiss-label="${t('action.close')}"
              day-label="${t('datePicker.day')}"
              month-label="${t('datePicker.month')}"
              year-label="${t('datePicker.year')}"
              placeholder="${t('datePicker.placeholder')}"
              required
            ></rrr-date-field>
            <rrr-textarea label="${t('workout.form.notes')}" name="notes" rows="3" placeholder="${t('workout.form.notes.placeholder')}"></rrr-textarea>
          </div>
          <div>
            <h3>${t('workout.section.exercises')}</h3>
            <div class="entries" aria-live="polite"></div>
          </div>
          <div class="row">
            <rrr-select label="${t('label.addExercise')}" name="exercise">
              ${activeExercises.map((exercise) => `<option value="${exercise.id}">${exercise.name}</option>`).join('')}
            </rrr-select>
          </div>
          <div class="actions">
            <rrr-button type="button" data-action="add-exercise" ${activeExercises.length === 0 ? 'disabled' : ''}>${t('action.add')}</rrr-button>
            <rrr-button type="button" data-action="save">${t('workout.action.save')}</rrr-button>
            <rrr-button type="button" variant="outline" data-action="cancel">${t('action.cancel')}</rrr-button>
          </div>
        </div>
      </section>
    `

    const dateField = this.querySelector<HTMLElement>('rrr-date-field[name="date"]')
    const notesField = this.querySelector<HTMLElement & { value: string }>('rrr-textarea[name="notes"]')
    const exerciseField = this.querySelector<HTMLElement & { value: string }>('rrr-select[name="exercise"]')

    if (dateField) {
      dateField.setAttribute('value', this.workout.date)
      dateField.removeAttribute('invalid')
    }

    if (notesField) {
      notesField.setAttribute('value', this.workout.notes)
    }

    if (exerciseField) {
      exerciseField.setAttribute('value', activeExercises[0]?.id ?? '')
    }

    this.renderExerciseEntries(activeExercises)

    this.querySelector<HTMLElement>('rrr-date-field[name="date"]')?.addEventListener('input', () => {
      this.updateWorkoutFields()
    })

    this.querySelector<HTMLElement>('rrr-textarea[name="notes"]')?.addEventListener('input', () => {
      this.updateWorkoutFields()
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="add-exercise"]')?.addEventListener('click', () => {
      this.addExercise()
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="save"]')?.addEventListener('click', () => {
      this.saveWorkout()
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="cancel"]')?.addEventListener('click', () => {
      window.location.hash = '#/workouts'
    })
  }
}

customElements.define('rrr-workout-editor', RrrWorkoutEditor)
