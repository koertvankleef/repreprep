import { storageService } from '../storage-instance.ts'
import { buildWorkoutLoggingPrototypeData } from './rrr-workout-logging-adapter.ts'
import { applyWorkoutLoggingEventToWorkout } from './rrr-workout-logging-event-apply.ts'
import {
  configureWorkoutLoggingPrototypeModel,
  resetWorkoutLoggingPrototypeModel,
  type WorkoutEvent,
} from './rrr-workout-logging-prototype-model.ts'

export class RrrWorkoutLogging extends HTMLElement {
  private workoutIdValue: string | null = null
  private exerciseEntryIds: string[] = []

  set workoutId(value: string | null) {
    this.workoutIdValue = value
    this.render()
  }

  get workoutId(): string | null {
    return this.workoutIdValue
  }

  connectedCallback(): void {
    this.addEventListener('rrr-workout-event', this.handleWorkoutEvent as EventListener)
    this.addEventListener('rrr-workout-flow-finished', this.handleWorkoutFlowFinished as EventListener)
    this.render()
  }

  disconnectedCallback(): void {
    this.removeEventListener('rrr-workout-event', this.handleWorkoutEvent as EventListener)
    this.removeEventListener('rrr-workout-flow-finished', this.handleWorkoutFlowFinished as EventListener)
    this.exerciseEntryIds = []
    resetWorkoutLoggingPrototypeModel()
  }

  private readonly handleWorkoutFlowFinished = (): void => {
    if (!this.workoutIdValue) {
      return
    }

    window.location.hash = `#/workouts/${this.workoutIdValue}`
  }

  private readonly handleWorkoutEvent = (event: CustomEvent<WorkoutEvent>): void => {
    const workoutId = this.workoutIdValue
    if (!workoutId) {
      return
    }

    const currentData = storageService.getData()
    const workout = currentData.workouts.find((entry) => entry.id === workoutId)
    if (!workout) {
      return
    }

    const updatedWorkout = applyWorkoutLoggingEventToWorkout(workout, this.exerciseEntryIds, event.detail)
    if (!updatedWorkout) {
      return
    }

    storageService.saveWorkout(updatedWorkout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private renderMissing(message: string): void {
    this.exerciseEntryIds = []
    this.innerHTML = `
      <section class="page">
        <rrr-card size="lg">
          <h2>Workout logging unavailable</h2>
          <p>${message}</p>
          <rrr-button type="button" data-action="back">Back to workouts</rrr-button>
        </rrr-card>
      </section>
    `

    this.querySelector<HTMLElement>('rrr-button[data-action="back"]')?.addEventListener('click', () => {
      window.location.hash = '#/workouts'
    })
  }

  private render(): void {
    const workoutId = this.workoutIdValue

    if (!workoutId) {
      this.renderMissing('No workout id was provided for the logging flow.')
      return
    }

    const data = storageService.getData()
    const workout = data.workouts.find((entry) => entry.id === workoutId)

    if (!workout) {
      this.renderMissing('The requested workout was not found.')
      return
    }

    const mapped = buildWorkoutLoggingPrototypeData(data, workout)

    if (mapped.exercises.length === 0) {
      this.renderMissing('This workout has no sets to log yet. Add sets first, then start logging.')
      return
    }

    configureWorkoutLoggingPrototypeModel({
      exercises: mapped.exercises,
      timeline: mapped.timeline,
    })
    this.exerciseEntryIds = mapped.exerciseEntryIds

    this.innerHTML = ''
    this.append(document.createElement('rrr-workout-logging-prototype'))
  }
}

customElements.define('rrr-workout-logging', RrrWorkoutLogging)
