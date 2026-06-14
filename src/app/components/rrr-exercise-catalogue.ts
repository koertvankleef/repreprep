import { storageService } from '../storage-instance.ts'
import { createNewExercise, isExerciseUsedInWorkouts } from '../../domain/exercise-service.ts'
import { confirmDialog, promptDialog } from '../../utils/dialog-service.ts'
import { t } from '../../i18n/index.ts'
import styles from './rrr-exercise-catalogue.css?inline'

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
      this.setStatus(t('exercise.validation.nameRequired'), 'error')
      nameField.setAttribute('aria-invalid', 'true')
      nameField.focus()
      return
    }

    nameField.removeAttribute('aria-invalid')

    storageService.saveExercise(createNewExercise(name, kind))
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.setStatus(t('exercise.status.created', { name }), 'success')

    this.render()
  }

  private async editExercise(id: string): Promise<void> {
    const data = storageService.getData()
    const exercise = data.exercises.find((item) => item.id === id)

    if (!exercise) {
      return
    }

    const nextName = await promptDialog({
      title: t('exercise.dialog.rename.title'),
      message: t('exercise.dialog.rename.message', { name: exercise.name }),
      label: t('exercise.dialog.rename.label'),
      initialValue: exercise.name,
      confirmLabel: t('action.save'),
      cancelLabel: t('action.cancel'),
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
    this.setStatus(t('exercise.status.renamed', { name: nextName }), 'success')
  }

  private async archiveExercise(id: string): Promise<void> {
    const confirmed = await confirmDialog({
      title: t('exercise.dialog.archive.title'),
      message: t('exercise.dialog.archive.message'),
      confirmLabel: t('action.archive'),
      cancelLabel: t('action.cancel'),
    })

    if (!confirmed) {
      return
    }

    storageService.archiveExercise(id)
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.setStatus(t('exercise.status.archived'), 'success')
  }

  private renderList(showArchived: boolean): string {
    const data = storageService.getData()
    const exercises = data.exercises
      .filter((exercise) => exercise.archived === showArchived)
      .sort((left, right) => left.name.localeCompare(right.name))

    if (exercises.length === 0) {
      return `<p>${t('exercise.list.empty')}</p>`
    }

    return exercises
      .map((exercise) => {
        const used = isExerciseUsedInWorkouts(data, exercise.id)
        const kindLabel = exercise.kind === 'duration' ? t('exercise.kind.duration') : t('exercise.kind.repsWeight')

        return `
          <article class="item">
            <div>
              <strong>${exercise.name}</strong>
              <div class="meta">
                <span class="badge">${kindLabel}</span>
                ${used ? `<span class="badge">${t('exercise.badge.used')}</span>` : ''}
              </div>
            </div>
            <div class="actions">
              ${showArchived ? '' : `<button type="button" data-action="edit" data-id="${exercise.id}" aria-label="${escapeHtml(t('exercise.action.editAria', { name: exercise.name }))}">${t('action.edit')}</button>`}
              ${showArchived ? '' : `<button type="button" data-action="archive" data-id="${exercise.id}" aria-label="${escapeHtml(t('exercise.action.archiveAria', { name: exercise.name }))}">${t('action.archive')}</button>`}
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
            <h2>${t('exercise.title')}</h2>
            <p>${t('exercise.subtitle')}</p>
          </div>
          <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || t('exercise.status.default')}</p>
          <div class="form">
            <label>
              ${t('field.name')}
              <input name="name" type="text" placeholder="${t('exercise.form.name.placeholder')}" autocomplete="off" />
            </label>
            <label>
              ${t('exercise.form.kind.label')}
              <select name="kind">
                <option value="reps-weight">${t('exercise.form.kind.repsWeight')}</option>
                <option value="duration">${t('exercise.form.kind.duration')}</option>
              </select>
            </label>
            <button type="button" data-action="add">${t('exercise.form.add')}</button>
          </div>
        </rrr-card>
        <rrr-card size="lg">
          <h3>${t('exercise.list.active')}</h3>
          <div class="list">${this.renderList(false)}</div>
        </rrr-card>
        <rrr-card size="lg">
          <details>
            <summary>${t('exercise.list.archived')}</summary>
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
