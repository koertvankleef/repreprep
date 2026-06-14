import { storageService } from '../app/storage-instance.ts'
import { getExercise } from '../domain/exercise-service.ts'
import { getActiveRoutines } from '../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'
import { formatDate as formatLocalizedDate, t } from '../i18n/index.ts'
import { confirmDialog } from '../utils/dialog-service.ts'
import { todayIso } from '../utils/date.ts'

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
      title: t('workoutList.dialog.delete.title'),
      message: t('workoutList.dialog.delete.message'),
      confirmLabel: t('action.delete'),
      cancelLabel: t('action.cancel'),
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

  private formatWorkoutDate(value: string): string {
    const date = new Date(`${value}T00:00:00Z`)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return formatLocalizedDate(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
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
            <h2>${t('workoutList.title')}</h2>
            <p>${t('workoutList.subtitle')}</p>
          </div>
          ${
            routines.length === 0
              ? `<button type="button" data-action="create-routine">${t('workoutList.createRoutine')}</button>`
              : `
                <div class="start-panel">
                  <label>
                    ${t('workoutList.routineLabel')}
                    <select name="routine">
                      ${routines
                        .map(
                          (routine) =>
                            `<option value="${routine.id}" ${routine.id === this.selectedRoutineId ? 'selected' : ''}>${routine.name}</option>`,
                        )
                        .join('')}
                    </select>
                  </label>
                  <button type="button" data-action="start">${t('workoutList.startWorkout')}</button>
                </div>
              `
          }
        </div>
        <div class="list">
          ${
            workouts.length === 0
              ? routines.length === 0
                ? `<p>${t('workoutList.empty.noRoutine')}</p>`
                : `<p>${t('workoutList.empty.withRoutine')}</p>`
              : workouts
                  .map((workout) => {
                    const workoutDate = this.formatWorkoutDate(workout.date)
                    const summary = workout.exercises
                      .map((entry) => getExercise(data, entry.exerciseId)?.name ?? t('workoutList.exercise.unknown'))
                      .join(', ')

                    return `
                      <rrr-card size="md">
                        <h3>${workoutDate}</h3>
                        <p>${summary || t('workoutList.exercise.none')}</p>
                        <p>${workout.notes || t('workoutList.notes.none')}</p>
                        <div class="actions">
                          <button type="button" data-action="edit" data-id="${workout.id}" aria-label="${t('workoutList.action.editAria', { date: workoutDate })}">${t('action.edit')}</button>
                          <button type="button" data-action="delete" data-id="${workout.id}" aria-label="${t('workoutList.action.deleteAria', { date: workoutDate })}">${t('action.delete')}</button>
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
