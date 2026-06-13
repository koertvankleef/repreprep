import { storageService } from '../app/storage-instance.ts'
import { getActiveRoutines } from '../domain/routine-service.ts'
import { todayIso } from '../utils/date.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'

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

  .card-title {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .card-meta {
    color: var(--rrr-color-text-secondary, #666);
    font-size: 0.9rem;
  }

  .actions {
    display: flex;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }
`

export class RrrRoutineList extends HTMLElement {
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

  private startWorkout(routineId: string): void {
    const data = storageService.getData()
    const workout = createWorkoutFromRoutine(data, routineId, todayIso())

    if (!workout) {
      window.alert('Could not start workout from this routine.')
      return
    }

    storageService.saveWorkout(workout)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    window.location.hash = `#/workouts/${workout.id}`
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    const data = storageService.getData()
    const routines = getActiveRoutines(data)

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="header">
          <div>
            <h2>Routines</h2>
            <p>Reusable workout templates</p>
          </div>
          <button type="button" data-action="new">New Routine</button>
        </div>
        <div class="list">
          ${
            routines.length === 0
              ? '<p>No routines yet. Create your first routine.</p>'
              : routines
                  .map((routine) => {
                    const version = data.routineVersions.find((v) => v.id === routine.activeVersionId)
                    const exerciseCount = version?.exercises.length ?? 0

                    return `
                      <div class="card">
                        <div class="card-title">${escapeHtml(routine.name)}</div>
                        <div class="card-meta">${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}</div>
                        <div class="actions">
                          <button type="button" data-action="start" data-id="${routine.id}">Start Workout</button>
                          <button type="button" data-action="edit" data-id="${routine.id}">Edit Routine</button>
                        </div>
                      </div>
                    `
                  })
                  .join('')
          }
        </div>
      </section>
    `

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="new"]')?.addEventListener('click', () => {
      window.location.hash = '#/routines/new'
    })

    this.shadowRoot.querySelectorAll<HTMLButtonElement>('button[data-action="start"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id

        if (id) {
          this.startWorkout(id)
        }
      })
    })

    this.shadowRoot.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id

        if (id) {
          window.location.hash = `#/routines/${id}`
        }
      })
    })
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-routine-list', RrrRoutineList)
