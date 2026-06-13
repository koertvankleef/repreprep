import { storageService } from '../app/storage-instance.ts'
import { getExerciseHistory, getPersonalRecord } from '../domain/history-service.ts'
import { formatDate } from '../utils/date.ts'

const styles = `
  .history-list {
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .history-item {
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-md);
    padding: var(--rrr-space-md);
  }
`

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
      return '<p>No exercise selected.</p>'
    }

    const history = getExerciseHistory(storageService.getData(), this.selectedExerciseId).sort((left, right) =>
      right.date.localeCompare(left.date),
    )

    if (history.length === 0) {
      return '<p>No history yet for this exercise.</p>'
    }

    return history
      .map((item) => {
        const setSummary = item.sets
          .map((set) => (set.kind === 'duration' ? `${set.seconds}s` : `${set.reps} reps @ ${set.weightKg ?? 0} kg`))
          .join(', ')

        return `
          <article class="history-item">
            <strong>${formatDate(item.date)}</strong>
            <p>${setSummary || 'No sets recorded'}</p>
          </article>
        `
      })
      .join('')
  }

  private renderPersonalRecord(): string {
    if (!this.selectedExerciseId) {
      return '<p>No personal record available.</p>'
    }

    const record = getPersonalRecord(storageService.getData(), this.selectedExerciseId)

    if (!record) {
      return '<p>No personal record yet.</p>'
    }

    if (record.kind === 'duration') {
      return `<p>Longest duration: <strong>${record.seconds} seconds</strong> on ${formatDate(record.date)}</p>`
    }

    return `<p>Best set: <strong>${record.reps} reps @ ${record.weightKg} kg</strong> on ${formatDate(record.date)}</p>`
  }

  private render(): void {
    const exercises = storageService.getData().exercises.filter((exercise) => !exercise.archived)

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <h2>Exercise History</h2>
          ${
            exercises.length === 0
              ? '<p>Add an exercise to start tracking history.</p>'
              : `
                <label>
                  Exercise
                  <select name="exercise">
                    ${exercises
                      .map(
                        (exercise) =>
                          `<option value="${exercise.id}" ${exercise.id === this.selectedExerciseId ? 'selected' : ''}>${exercise.name}</option>`,
                      )
                      .join('')}
                  </select>
                </label>
                ${this.renderPersonalRecord()}
                <div class="history-list">${this.renderSets()}</div>
              `
          }
        </rrr-card>
      </section>
    `

    this.querySelector<HTMLSelectElement>('select[name="exercise"]')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement
      this.selectedExerciseId = target.value
      this.render()
    })
  }
}

customElements.define('rrr-exercise-history', RrrExerciseHistory)
