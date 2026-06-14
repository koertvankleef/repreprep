import { storageService } from '../app/storage-instance.ts'
import { getActiveRoutines } from '../domain/routine-service.ts'
import { t, tPlural } from '../i18n/index.ts'
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
      window.alert(t('routineList.startError'))
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
            <h2>${t('routineList.title')}</h2>
            <p>${t('routineList.subtitle')}</p>
          </div>
          <button type="button" data-action="new">${t('routineList.new')}</button>
        </div>
        <div class="list">
          ${
            routines.length === 0
              ? `<p>${t('routineList.empty')}</p>`
              : routines
                  .map((routine) => {
                    const version = data.routineVersions.find((v) => v.id === routine.activeVersionId)
                    const exerciseCount = version?.exercises.length ?? 0
                    const exerciseSummary = tPlural('message.routine.exerciseCount', exerciseCount)

                    return `
                      <rrr-card size="md">
                        <div class="card-title">${escapeHtml(routine.name)}</div>
                        <div class="card-meta">${exerciseSummary}</div>
                        <div class="actions">
                          <button type="button" data-action="start" data-id="${routine.id}" aria-label="${escapeHtml(t('routineList.action.startAria', { name: routine.name }))}">${t('routineList.action.start')}</button>
                          <button type="button" data-action="edit" data-id="${routine.id}" aria-label="${escapeHtml(t('routineList.action.editAria', { name: routine.name }))}">${t('action.edit')}</button>
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
