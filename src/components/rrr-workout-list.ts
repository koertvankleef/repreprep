import { storageService } from '../app/storage-instance.ts'
import { getExercise } from '../domain/exercise-service.ts'
import { formatDate } from '../utils/date.ts'

const styles = `
  :host {
    display: block;
  }

  .page {
    display: grid;
    gap: var(--rrr-space-lg);
  }

  .header {
    display: flex;
    justify-content: space-between;
    gap: var(--rrr-space-md);
    align-items: center;
    flex-wrap: wrap;
  }

  .list {
    display: grid;
    gap: var(--rrr-space-md);
  }

  .card {
    background: var(--rrr-color-surface);
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: var(--rrr-space-md);
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .actions {
    display: flex;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }
`

export class RrrWorkoutList extends HTMLElement {
  private readonly handleDataChanged = (): void => {
    this.render()
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
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
    if (!this.shadowRoot) {
      return
    }

    const data = storageService.getData()
    const workouts = [...data.workouts].sort((left, right) => right.date.localeCompare(left.date))

    this.shadowRoot.innerHTML = `
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
                      <article class="card">
                        <h3>${formatDate(workout.date)}</h3>
                        <p>${summary || 'No exercises added yet'}</p>
                        <p>${workout.notes || 'No notes'}</p>
                        <div class="actions">
                          <button type="button" data-action="edit" data-id="${workout.id}">Edit</button>
                          <button type="button" data-action="delete" data-id="${workout.id}">Delete</button>
                        </div>
                      </article>
                    `
                  })
                  .join('')
          }
        </div>
      </section>
    `

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="new"]')?.addEventListener('click', () => {
      window.location.hash = '#/workouts/new'
    })

    this.shadowRoot.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          window.location.hash = `#/workouts/${id}`
        }
      })
    })

    this.shadowRoot.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]').forEach((button) => {
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
