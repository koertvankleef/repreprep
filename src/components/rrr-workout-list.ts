import { storageService } from '../app/storage-instance.ts'
import { getExercise } from '../domain/exercise-service.ts'
import { formatDate } from '../utils/date.ts'

const styles = `
  .list {
    display: grid;
    gap: var(--rrr-space-md);
  }
`

export class RrrWorkoutList extends HTMLElement {
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

  private deleteWorkout(id: string): void {
    if (!window.confirm('Delete this workout?')) {
      return
    }

    storageService.deleteWorkout(id)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private render(): void {
    const data = storageService.getData()
    const workouts = [...data.workouts].sort((left, right) => right.date.localeCompare(left.date))

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="header">
          <div>
            <h2>Workouts</h2>
            <p>Your logged training sessions</p>
          </div>
          <button type="button" data-action="new">New Workout</button>
        </div>
        <div class="list">
          ${
            workouts.length === 0
              ? '<p>No workouts logged yet. Start your first session.</p>'
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

    this.querySelector<HTMLButtonElement>('button[data-action="new"]')?.addEventListener('click', () => {
      window.location.hash = '#/workouts/new'
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
          this.deleteWorkout(id)
        }
      })
    })
  }
}

customElements.define('rrr-workout-list', RrrWorkoutList)
