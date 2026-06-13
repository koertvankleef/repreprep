import { storageService } from '../app/storage-instance.ts'
import { getActiveRoutines } from '../domain/routine-service.ts'
import { todayIso } from '../utils/date.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'

const styles = `
  .list {
    display: grid;
    gap: var(--rrr-space-md);
  }

  .card-title {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .card-meta {
    color: var(--rrr-color-text-secondary, #666);
    font-size: 0.9rem;
  }
`

export class RrrRoutineList extends HTMLElement {
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
    const data = storageService.getData()
    const routines = getActiveRoutines(data)

    this.innerHTML = `
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
                      <rrr-card size="md">
                        <div class="card-title">${escapeHtml(routine.name)}</div>
                        <div class="card-meta">${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}</div>
                        <div class="actions">
                          <button type="button" data-action="start" data-id="${routine.id}">Start Workout</button>
                          <button type="button" data-action="edit" data-id="${routine.id}">Edit Routine</button>
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
      window.location.hash = '#/routines/new'
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="start"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id

        if (id) {
          this.startWorkout(id)
        }
      })
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]').forEach((btn) => {
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
