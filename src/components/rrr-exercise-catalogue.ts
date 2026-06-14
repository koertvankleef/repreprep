import { storageService } from '../app/storage-instance.ts'
import { createNewExercise, isExerciseUsedInWorkouts } from '../domain/exercise-service.ts'
import { confirmDialog, promptDialog } from '../utils/dialog-service.ts'

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

  .form input,
  .form select {
    display: block;
    width: 100%;
  }
`

export class RrrExerciseCatalogue extends HTMLElement {
  private readonly handleDataChanged = (): void => {
    this.render()
  }
  private statusMessage = ''
  private statusType: 'error' | 'success' | null = null

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private setStatus(message: string, type: 'error' | 'success'): void {
    this.statusMessage = message
    this.statusType = type
  }

  private addExercise(): void {
    const nameField = this.querySelector<HTMLInputElement>('input[name="name"]')
    const kindField = this.querySelector<HTMLSelectElement>('select[name="kind"]')

    if (!nameField || !kindField) {
      return
    }

    const name = nameField.value.trim()
    const kind = kindField.value === 'duration' ? 'duration' : 'reps-weight'

    if (!name) {
      this.setStatus('Please enter an exercise name.', 'error')
      nameField.setAttribute('aria-invalid', 'true')
      nameField.focus()
      return
    }

    nameField.removeAttribute('aria-invalid')

    storageService.saveExercise(createNewExercise(name, kind))
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.setStatus(`Created exercise ${name}.`, 'success')

    this.render()
  }

  private async editExercise(id: string): Promise<void> {
    const data = storageService.getData()
    const exercise = data.exercises.find((item) => item.id === id)

    if (!exercise) {
      return
    }

    const nextName = await promptDialog({
      title: 'Rename Exercise',
      message: `Choose a new name for ${exercise.name}.`,
      label: 'Exercise name',
      initialValue: exercise.name,
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      required: true,
    })

    if (!nextName) {
      return
    }

    storageService.saveExercise({
      ...exercise,
      name: nextName,
      updatedAt: new Date().toISOString(),
    })
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.setStatus(`Renamed exercise to ${nextName}.`, 'success')
  }

  private async archiveExercise(id: string): Promise<void> {
    const confirmed = await confirmDialog({
      title: 'Archive Exercise',
      message: 'Archive this exercise? Existing workout history will be preserved.',
      confirmLabel: 'Archive',
      cancelLabel: 'Cancel',
    })

    if (!confirmed) {
      return
    }

    storageService.archiveExercise(id)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.setStatus('Exercise archived.', 'success')
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
              ${showArchived ? '' : `<button type="button" data-action="edit" data-id="${exercise.id}" aria-label="Edit ${exercise.name}">Edit</button>`}
              ${showArchived ? '' : `<button type="button" data-action="archive" data-id="${exercise.id}" aria-label="Archive ${exercise.name}">Archive</button>`}
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
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || 'Create, rename, or archive exercises used across workouts and routines.'}</p>
          <div class="form">
            <label>
              Name
              <input name="name" type="text" placeholder="Exercise name" autocomplete="off" />
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

    const nameField = this.querySelector<HTMLInputElement>('input[name="name"]')
    const kindField = this.querySelector<HTMLSelectElement>('select[name="kind"]')

    if (nameField) {
      nameField.value = ''
      nameField.removeAttribute('aria-invalid')
    }

    if (kindField) {
      kindField.value = 'reps-weight'
    }

    this.querySelector<HTMLButtonElement>('button[data-action="add"]')?.addEventListener('click', () => {
      this.addExercise()
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          void this.editExercise(id)
        }
      })
    })

    this.querySelectorAll<HTMLButtonElement>('button[data-action="archive"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.id

        if (id) {
          void this.archiveExercise(id)
        }
      })
    })
  }
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
