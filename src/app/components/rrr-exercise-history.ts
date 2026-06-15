import { storageService } from '../storage-instance.ts'
import { getExerciseHistory, getPersonalRecord } from '../../domain/history-service.ts'
import { formatDate, t } from '../../i18n/index.ts'
import styles from './rrr-exercise-history.css?inline'

export class RrrExerciseHistory extends HTMLElement {
  private selectedExerciseId: string | null = null
  private readonly handleDataChanged = (): void => {
    this.ensureSelectedExercise()
    this.render()
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.ensureSelectedExercise()
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private ensureSelectedExercise(): void {
    const exercises = storageService.getData().exercises.filter((exercise) => !exercise.archived)

    if (exercises.length === 0) {
      this.selectedExerciseId = null
      return
    }

    if (!this.selectedExerciseId || !exercises.some((exercise) => exercise.id === this.selectedExerciseId)) {
      this.selectedExerciseId = exercises[0]?.id ?? null
    }
  }

  private renderSets(): string {
    if (!this.selectedExerciseId) {
      return `<p>${t('history.empty.exerciseSelected')}</p>`
    }

    const history = getExerciseHistory(storageService.getData(), this.selectedExerciseId).sort((left, right) =>
      right.date.localeCompare(left.date),
    )

    if (history.length === 0) {
      return `<p>${t('history.empty.exerciseHistory')}</p>`
    }

    return history
      .map((item) => {
        const dateLabel = this.formatHistoryDate(item.date)
        const setSummary = item.sets
          .map((set) =>
            set.kind === 'duration'
              ? t('history.set.duration', { seconds: set.seconds })
              : t('history.set.repsWeight', { reps: set.reps, weightKg: set.weightKg ?? 0 }),
          )
          .join(', ')

        return `
          <article class="history-item">
            <strong>${dateLabel}</strong>
            <p>${setSummary || t('history.empty.setsRecorded')}</p>
          </article>
        `
      })
      .join('')
  }

  private renderPersonalRecord(): string {
    if (!this.selectedExerciseId) {
      return `<p>${t('history.empty.personalRecordAvailable')}</p>`
    }

    const record = getPersonalRecord(storageService.getData(), this.selectedExerciseId)

    if (!record) {
      return `<p>${t('history.empty.personalRecord')}</p>`
    }

    const dateLabel = this.formatHistoryDate(record.date)

    if (record.kind === 'duration') {
      return `<p>${t('history.record.duration', { seconds: record.seconds, date: dateLabel })}</p>`
    }

    return `<p>${t('history.record.bestSet', { reps: record.reps, weightKg: record.weightKg, date: dateLabel })}</p>`
  }

  private formatHistoryDate(value: string): string {
    const date = new Date(`${value}T00:00:00Z`)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return formatDate(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  private render(): void {
    const exercises = storageService.getData().exercises.filter((exercise) => !exercise.archived)

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <h2>${t('history.title')}</h2>
          ${
            exercises.length === 0
              ? `<p>${t('history.empty.addExercise')}</p>`
              : `
                <rrr-select label="${t('history.field.exercise')}" name="exercise" value="${this.selectedExerciseId ?? ''}">
                  ${exercises
                    .map(
                      (exercise) =>
                        `<option value="${exercise.id}">${exercise.name}</option>`,
                    )
                    .join('')}
                </rrr-select>
                <div role="status" aria-live="polite" aria-atomic="true">${this.renderPersonalRecord()}</div>
                <div class="history-list" aria-live="polite">${this.renderSets()}</div>
              `
          }
        </rrr-card>
      </section>
    `

    this.querySelector<HTMLElement & { value: string }>('rrr-select[name="exercise"]')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLElement & { value: string }
      this.selectedExerciseId = target.value
      this.render()
    })
  }
}

customElements.define('rrr-exercise-history', RrrExerciseHistory)
