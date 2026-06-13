import { storageService } from '../app/storage-instance.ts'
import { createNewExercise, isExerciseUsedInWorkouts } from '../domain/exercise-service.ts'

const styles = `
  .list {
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .item {
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-md);
    padding: var(--rrr-space-md);
    display: flex;
    justify-content: space-between;
    gap: var(--rrr-space-md);
    align-items: center;
    flex-wrap: wrap;
  }

  .meta {
    display: flex;
    gap: var(--rrr-space-sm);
    align-items: center;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--rrr-space-xs) var(--rrr-space-sm);
    border-radius: 999px;
    background: var(--rrr-color-background);
    color: var(--rrr-color-text-muted);
    font-size: var(--rrr-font-size-sm);
  }
`

export class RrrExerciseCatalogue extends HTMLElement {
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

  private addExercise(): void {
    const nameInput = this.querySelector<HTMLInputElement>('input[name="name"]')
    const kindInput = this.querySelector<HTMLSelectElement>('select[name="kind"]')
    const name = nameInput?.value.trim() ?? ''
    const kind = kindInput?.value === 'duration' ? 'duration' : 'reps-weight'

    if (!name) {
      window.alert('Please enter an exercise name')
      return
    }

    storageService.saveExercise(createNewExercise(name, kind))
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))

    if (nameInput) {
      nameInput.value = ''
    }
  }

  private editExercise(id: string): void {
    const data = storageService.getData()
    const exercise = data.exercises.find((item) => item.id === id)

    if (!exercise) {
      return
    }

    const nextName = window.prompt('Rename exercise', exercise.name)?.trim()

    if (!nextName) {
      return
    }

    storageService.saveExercise({
      ...exercise,
      name: nextName,
      updatedAt: new Date().toISOString(),
    })
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private archiveExercise(id: string): void {
    if (!window.confirm('Archive this exercise?')) {
      return
    }

    storageService.archiveExercise(id)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private renderList(showArchived: boolean): string {
    const data = storageService.getData()
    const exercises = data.exercises
      .filter((exercise) => exercise.archived === showArchived)
      .sort((left, right) => left.name.localeCompare(right.name))

    if (exercises.length === 0) {
      return '<p>No exercises in this section.</p>'
    }

    return exercises
      .map((exercise) => {
        const used = isExerciseUsedInWorkouts(data, exercise.id)

        return `
          <article class="item">
            <div>
              <strong>${exercise.name}</strong>
              <div class="meta">
                <span class="badge">${exercise.kind}</span>
                ${used ? '<span class="badge">used in workouts</span>' : ''}
              </div>
            </div>
            <div class="actions">
              ${showArchived ? '' : `<button type="button" data-action="edit" data-id="${exercise.id}">Edit</button>`}
              ${showArchived ? '' : `<button type="button" data-action="archive" data-id="${exercise.id}">Archive</button>`}
            </div>
          </article>
        `
      })
      .join('')
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <div>
            <h2>Exercises</h2>
            <p>Manage your exercise catalogue.</p>
          </div>
          <div class="form">
            <label>
              Name
              <input type="text" name="name" placeholder="Exercise name" />
            </label>
            <label>
              Kind
              <select name="kind">
                <option value="reps-weight">Reps + weight</option>
                <option value="duration">Duration</option>
              </select>
            </label>
            <button type="button" data-action="add">Add Exercise</button>
          </div>
        </rrr-card>
        <rrr-card size="lg">
          <h3>Active Exercises</h3>
          <div class="list">${this.renderList(false)}</div>
        </rrr-card>
        <rrr-card size="lg">
          <details>
            <summary>Archived Exercises</summary>
            <div class="list">${this.renderList(true)}</div>
          </details>
        </rrr-card>
      </section>
    `

    this.querySelector<HTMLButtonElement>('button[data-action="add"]')?.addEventListener('click', () => {
      this.addExercise()
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          this.editExercise(id)
        }
      })
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="archive"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          this.archiveExercise(id)
        }
      })
    })
  }
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
