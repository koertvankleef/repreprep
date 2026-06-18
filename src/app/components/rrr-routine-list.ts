import { storageService } from '../storage-instance.ts'
import { getActiveRoutines } from '../../domain/routine-service.ts'
import { t, tPlural } from '../../i18n/index.ts'
import { todayIso } from '../../utils/date.ts'
import { createWorkoutFromRoutine } from '../../domain/workout-service.ts'
import styles from './rrr-routine-list.css?inline'

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
    window.location.hash = `#/workouts/${workout.id}/log`
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
          <rrr-button type="button" tone="accent" data-action="new"><rrr-icon name="add"></rrr-icon>${t('routineList.new')}</rrr-button>
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
                          <rrr-button type="button" data-action="start" data-id="${routine.id}" aria-label="${escapeHtml(t('routineList.action.startAria', { name: routine.name }))}">${t('routineList.action.start')}</rrr-button>
                          <rrr-button type="button" variant="ghost" data-action="edit" data-id="${routine.id}" aria-label="${escapeHtml(t('routineList.action.editAria', { name: routine.name }))}"><rrr-icon name="edit"></rrr-icon></rrr-button>
                        </div>
                      </rrr-card>
                    `
                  })
                  .join('')
          }
        </div>
      </section>
    `

    this.querySelector<HTMLElement>('rrr-button[data-action="new"]')?.addEventListener('click', () => {
      window.location.hash = '#/routines/new'
    })

    this.querySelectorAll<HTMLElement>('rrr-button[data-action="start"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id

        if (id) {
          this.startWorkout(id)
        }
      })
    })

    this.querySelectorAll<HTMLElement>('rrr-button[data-action="edit"]').forEach((btn) => {
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
