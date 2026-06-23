import { storageService } from '../storage-instance.ts'
import { isExerciseUsedInWorkouts, searchExercises } from '../../domain/exercise-service.ts'
import { t } from '../../i18n/index.ts'
import styles from './rrr-exercise-catalogue.css?inline'

export class RrrExerciseCatalogue extends HTMLElement {
  private readonly handleDataChanged = (): void => {
    this.render()
  }
  private searchQueryValue = ''

  set searchQuery(value: string) {
    this.searchQueryValue = value
    this.updateLists()
  }

  get searchQuery(): string {
    return this.searchQueryValue
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private renderList(): string {
    const data = storageService.getData()
    const exercises = searchExercises(
      data.exercises.filter((exercise) => !exercise.archived),
      this.searchQueryValue,
    )
      .sort((left, right) => left.name.localeCompare(right.name))

    if (exercises.length === 0) {
      return `<p>${t('exercise.list.empty')}</p>`
    }

    return exercises
      .map((exercise) => {
        const used = isExerciseUsedInWorkouts(data, exercise.id)
        const kindLabel = exercise.kind === 'time' ? t('exercise.kind.duration') : t('exercise.kind.repsWeight')
        const originLabel = exercise.createdByUser ? t('exercise.badge.custom') : t('exercise.badge.library')

        return `
          <article class="item">
            <div>
              <strong>${escapeHtml(exercise.name)}</strong>
              <div class="meta">
                <span class="badge">${originLabel}</span>
                <span class="badge">${kindLabel}</span>
                ${used ? `<span class="badge">${t('exercise.badge.used')}</span>` : ''}
              </div>
            </div>
          </article>
        `
      })
      .join('')
  }

  private updateLists(): void {
    const activeList = this.querySelector<HTMLElement>('[data-list="active"]')

    if (activeList) {
      activeList.innerHTML = this.renderList()
    }
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <section class="section">
          <h3>${t('exercise.list.active')}</h3>
          <div class="list" data-list="active">${this.renderList()}</div>
        </section>
      </section>
    `
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
