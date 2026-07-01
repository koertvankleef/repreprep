import { storageService } from '../storage-instance.ts'
import { getExercise } from '../../domain/exercise-service.ts'
import { getActiveRoutines } from '../../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../../domain/workout-service.ts'
import { formatDate as formatLocalizedDate, t } from '../../i18n/index.ts'
import { todayIso } from '../../utils/date.ts'
import styles from './rrr-workout-list.css?inline'
import { confirmSheet } from '../../utils/sheet-service.ts'

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
    const confirmed = await confirmSheet({
      title: t('workoutList.dialog.delete.title'),
      message: t('workoutList.dialog.delete.message'),
      confirmLabel: t('action.delete'),
      confirmTone: 'danger',
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
    window.location.hash = `#/workouts/${workout.id}/log`
  }

  private formatWorkoutDate(value: string): string {
    const date = new Date(`${value}T12:00:00`)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return formatLocalizedDate(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
            <p>${t('workoutList.subtitle')}</p>
          </div>
          ${
            routines.length === 0
              ? `<rrr-button type="button" data-action="create-routine">${t('workoutList.createRoutine')}</rrr-button>`
              : `
                <div class="start-panel">
                  <rrr-select label="${t('workoutList.routineLabel')}" name="routine" value="${this.selectedRoutineId ?? ''}">
                    ${routines
                      .map(
                        (routine) =>
                          `<option value="${routine.id}">${routine.name}</option>`,
                      )
                      .join('')}
                  </rrr-select>
                  <rrr-button type="button" data-action="start">${t('workoutList.startWorkout')}</rrr-button>
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
                      <article class="rrr-card">
                        <h3>${workoutDate}</h3>
                        <p>${summary || t('workoutList.exercise.none')}</p>
                        <p>${workout.notes || t('workoutList.notes.none')}</p>
                        <div class="actions">
                          <rrr-button type="button" variant="ghost" data-action="edit" data-id="${workout.id}" aria-label="${t('workoutList.action.editAria', { date: workoutDate })}"><rrr-icon name="edit"></rrr-icon></rrr-button>
                          <rrr-button type="button" variant="ghost" tone="danger" data-action="delete" data-id="${workout.id}" aria-label="${t('workoutList.action.deleteAria', { date: workoutDate })}"><rrr-icon name="delete"></rrr-icon></rrr-button>
                        </div>
                      </article>
                    `
                  })
                  .join('')
          }
        </div>
      </section>
    `

    this.querySelector<HTMLElement>('rrr-button[data-action="create-routine"]')?.addEventListener('click', () => {
      window.location.hash = '#/routines/new'
    })

    this.querySelector<HTMLElement & { value: string }>('rrr-select[name="routine"]')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLElement & { value: string }
      this.selectedRoutineId = target.value
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="start"]')?.addEventListener('click', () => {
      if (this.selectedRoutineId) {
        this.startWorkout(this.selectedRoutineId)
      }
    })

    this.querySelectorAll<HTMLElement>('rrr-button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          window.location.hash = `#/workouts/${id}`
        }
      })
    })

    this.querySelectorAll<HTMLElement>('rrr-button[data-action="delete"]').forEach((button) => {
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
