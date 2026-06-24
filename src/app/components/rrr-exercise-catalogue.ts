import { storageService } from '../storage-instance.ts'
import { isExerciseUsedInWorkouts, searchExercises } from '../../domain/exercise-service.ts'
import type { AppData, ExerciseDefinition } from '../../domain/types.ts'
import { t } from '../../i18n/index.ts'
import styles from './rrr-exercise-catalogue.css?inline'

type ExerciseSection = {
  title: string
  exercises: ExerciseDefinition[]
}

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
      .sort(compareExerciseNames)

    if (exercises.length === 0) {
      return `<p>${t('exercise.list.empty')}</p>`
    }

    return groupExercisesByInitial(exercises)
      .map((section) => `
        <section class="section">
          <h2 class="section-title">${escapeHtml(section.title)}</h2>
          <div class="section-card">
            ${section.exercises.map((exercise) => this.renderExerciseItem(exercise, data)).join('')}
          </div>
        </section>
      `)
      .join('')
  }

  private renderExerciseItem(exercise: ExerciseDefinition, data: AppData): string {
    const used = isExerciseUsedInWorkouts(data, exercise.id)
    const kindLabel = exercise.kind === 'time' ? t('exercise.kind.duration') : t('exercise.kind.repsWeight')
    const href = `#/exercises/${encodeURIComponent(exercise.id)}`

    return `
      <a class="exercise-cat-item section-link" href="${href}">
        <h4>${escapeHtml(exercise.name)}</h4>
        <div class="meta">
          ${exercise.createdByUser ? `<rrr-badge tone="accent">${t('exercise.badge.custom')}</rrr-badge>` : ''}
          <rrr-badge>${kindLabel}</rrr-badge>
          ${used ? `<rrr-badge>${t('exercise.badge.used')}</rrr-badge>` : ''}
        </div>
      </a>
    `
  }

  private updateLists(): void {
    const activeList = this.querySelector<HTMLElement>('[data-list="active"]')

    if (activeList) {
      activeList.innerHTML = this.renderList()
    }
  }

  private render(): void {
    const addExerciseLabel = escapeHtml(t('exercise.form.add'))

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="list" data-list="active">
          ${this.renderList()}
        </div>
        <rrr-button
          type="button"
          tone="accent"
          rounded
          data-action="new-exercise"
          aria-label="${addExerciseLabel}"
          title="${addExerciseLabel}"
        ><rrr-icon name="add"></rrr-icon></rrr-button>
      </section>
    `
  }
}

function groupExercisesByInitial(exercises: ExerciseDefinition[]): ExerciseSection[] {
  const groups = new Map<string, ExerciseDefinition[]>()

  exercises.forEach((exercise) => {
    const title = getExerciseSectionTitle(exercise.name)
    groups.set(title, [...(groups.get(title) ?? []), exercise])
  })

  return Array.from(groups, ([title, groupedExercises]) => ({ title, exercises: groupedExercises }))
    .sort((left, right) => compareSectionTitles(left.title, right.title))
}

function compareExerciseNames(left: ExerciseDefinition, right: ExerciseDefinition): number {
  return left.name.localeCompare(right.name)
}

function compareSectionTitles(left: string, right: string): number {
  const rankDelta = getSectionRank(left) - getSectionRank(right)

  if (rankDelta !== 0) {
    return rankDelta
  }

  return left.localeCompare(right)
}

function getSectionRank(title: string): number {
  if (title === '?!') {
    return 0
  }

  if (title === '#') {
    return 1
  }

  return 2
}

function getExerciseSectionTitle(name: string): string {
  const firstCharacter = normalizeSectionCharacter(name.trim().charAt(0))

  if (!firstCharacter) {
    return '?!'
  }

  if (/^\d$/.test(firstCharacter)) {
    return '#'
  }

  if (/^[A-Z]$/.test(firstCharacter)) {
    return firstCharacter
  }

  return '?!'
}

function normalizeSectionCharacter(character: string): string {
  return character
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase()
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
