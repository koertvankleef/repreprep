import { storageService } from '../app/storage-instance.ts'
import { getExercise } from '../domain/exercise-service.ts'
import { getActiveRoutines } from '../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'
import { confirmDialog } from '../utils/dialog-service.ts'
import { formatDate, todayIso } from '../utils/date.ts'

const styles = `
  .list {
    display: grid;
    gap: var(--rrr-space-md);
  }

  .start-panel {
    display: flex;
    gap: var(--rrr-space-sm);
    align-items: end;
    flex-wrap: wrap;
  }

  .start-panel label {
    min-width: 14rem;
  }
`

export class RrrWorkoutList extends HTMLElement {
  private selectedRoutineId: string | null = null

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private async deleteWorkout(id: string): Promise<void> {
    const confirmed = await confirmDialog({
      title: 'Delete Workout',
      message: 'Delete this workout? This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })

    if (!confirmed) {
      return
    }

    storageService.deleteWorkout(id)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private startWorkout(routineId: string): void {
    const data = storageService.getData()
    const workout = createWorkoutFromRoutine(data, routineId, todayIso())

    if (!workout) {
      return
    }

    storageService.saveWorkout(workout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = `#/workouts/${workout.id}`
  }

  private render(): void {
    const data = storageService.getData()
    const routines = getActiveRoutines(data)
    const workouts = [...data.workouts].sort((left, right) => right.date.localeCompare(left.date))

    if (!this.selectedRoutineId || !routines.some((routine) => routine.id === this.selectedRoutineId)) {
      this.selectedRoutineId = routines[0]?.id ?? null
    }

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="header">
          <div>
            <h2>Workouts</h2>
            <p>Your logged training sessions</p>
          </div>
          ${
            routines.length === 0
              ? '<button type="button" data-action="create-routine">Create Routine</button>'
              : `
                <div class="start-panel">
                  <label>
                    Routine
                    <select name="routine">
                      ${routines
                        .map(
                          (routine) =>
                            `<option value="${routine.id}" ${routine.id === this.selectedRoutineId ? 'selected' : ''}>${routine.name}</option>`,
                        )
                        .join('')}
                    </select>
                  </label>
                  <button type="button" data-action="start">Start Workout</button>
                </div>
              `
          }
        </div>
        <div class="list">
          ${
            workouts.length === 0
              ? routines.length === 0
                ? '<p>No workouts logged yet. Create a routine first, then start your session from it.</p>'
                : '<p>No workouts logged yet. Start your first session from a routine.</p>'
              : workouts
                  .map((workout) => {
                    const summary = workout.exercises
                      .map((entry) => getExercise(data, entry.exerciseId)?.name ?? 'Unknown exercise')
                      .join(', ')

                    return `
                      <rrr-card size="md">
                        <h3>${formatDate(workout.date)}</h3>
                        <p>${summary || 'No exercises added yet'}</p>
                        <p>${workout.notes || 'No notes'}</p>
                        <div class="actions">
                          <button type="button" data-action="edit" data-id="${workout.id}" aria-label="Edit workout on ${formatDate(workout.date)}">Edit</button>
                          <button type="button" data-action="delete" data-id="${workout.id}" aria-label="Delete workout on ${formatDate(workout.date)}">Delete</button>
                        </div>
                      </rrr-card>
                    `
                  })
                  .join('')
          }
        </div>
      </section>
    `

    this.querySelector<HTMLButtonElement>('button[data-action="create-routine"]')?.addEventListener('click', () => {
      window.location.hash = '#/routines/new'
    })

    this.querySelector<HTMLSelectElement>('select[name="routine"]')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement
      this.selectedRoutineId = target.value
    })

    this.querySelector<HTMLButtonElement>('button[data-action="start"]')?.addEventListener('click', () => {
      if (this.selectedRoutineId) {
        this.startWorkout(this.selectedRoutineId)
      }
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          window.location.hash = `#/workouts/${id}`
        }
      })
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          void this.deleteWorkout(id)
        }
      })
    })
  }
}

customElements.define('rrr-workout-list', RrrWorkoutList)
