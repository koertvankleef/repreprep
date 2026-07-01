import { getExercise, isExerciseUsedInRoutines } from '../../../domain/exercise-service.ts'
import type {
  ExerciseDefinition,
  MeasurementProfile,
} from '../../../domain/types.ts'
import { formatDate, t } from '../../../i18n/index.ts'
import {
  escapeHtml,
  getEquipmentLabel,
  getExerciseCategoryLabel,
  getMeasurementTypeLabel,
  getMuscleLabel,
  renderPropertyRow,
  type PropertyRow,
} from '../../render-helpers.ts'
import { storageService } from '../../storage-instance.ts'
import styles from './rrr-exercise-detail.css?inline'

export class RrrExerciseDetail extends HTMLElement {
  private exerciseIdValue: string | null = null

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  set exerciseId(value: string | null) {
    this.exerciseIdValue = value

    if (this.isConnected) {
      this.render()
    }
  }

  get exerciseId(): string | null {
    return this.exerciseIdValue
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
  }

  private render(): void {
    const data = storageService.getData()
    const exercise = this.exerciseIdValue ? getExercise(data, this.exerciseIdValue) : undefined

    this.innerHTML = `
      <style>${styles}</style>
      ${exercise ? this.renderExercise(exercise, isExerciseUsedInRoutines(data, exercise.id)) : this.renderNotFound()}
    `
  }

  private renderNotFound(): string {
    return `
      <section class="page detail-page">
        <rrr-section>
          <span slot="heading">${t('exercise.detail.notFoundTitle')}</span>
          <div class="rrr-card">
            <p>${t('exercise.detail.notFound')}</p>
          </div>
        </rrr-section>
      </section>
    `
  }

  private renderExercise(exercise: ExerciseDefinition, usedInRoutines: boolean): string {
    const overviewRows: PropertyRow[] = [
      { label: t('exercise.detail.description'), htmlString: this.renderText(exercise.description) },
      { label: t('exercise.detail.aliases'), htmlString: this.renderBadgeList(exercise.aliases, (alias) => alias) },
      { label: t('exercise.detail.origin'), htmlString: this.renderOrigin(exercise.createdByUser) },
      { label: t('exercise.detail.type'), htmlString: this.renderBadge(this.getKindLabel(exercise)) },
      { label: t('exercise.detail.defaultUnit'), htmlString: this.renderText(this.getDefaultUnitLabel(exercise.defaultUnit)) },
      { label: t('exercise.detail.status'), htmlString: this.renderBadge(exercise.archived ? t('exercise.detail.archived') : t('exercise.detail.active')) },
      { label: t('exercise.detail.usedInRoutines'), htmlString: this.renderText(usedInRoutines ? t('exercise.detail.yes') : t('exercise.detail.no')) },
    ]

    const classificationRows: PropertyRow[] = [
      { label: t('exercise.detail.categories'), htmlString: this.renderBadgeList(exercise.categories, getExerciseCategoryLabel) },
      { label: t('exercise.detail.equipment'), htmlString: this.renderBadgeList(exercise.equipment, getEquipmentLabel) },
      { label: t('exercise.detail.primaryMuscles'), htmlString: this.renderBadgeList(exercise.primaryMuscles, getMuscleLabel) },
      { label: t('exercise.detail.secondaryMuscles'), htmlString: this.renderBadgeList(exercise.secondaryMuscles, getMuscleLabel) },
      { label: t('exercise.detail.measurementProfiles'), htmlString: this.renderMeasurementProfiles(exercise.measurementProfiles) },
    ]

    const recordRows: PropertyRow[] = [
      { label: t('exercise.detail.id'), htmlString: this.renderCode(exercise.id) },
      { label: t('exercise.detail.created'), htmlString: this.renderText(this.formatTimestamp(exercise.createdAt)) },
      { label: t('exercise.detail.updated'), htmlString: this.renderText(this.formatTimestamp(exercise.updatedAt)) },
    ]

    return `
      <section class="page detail-page">
        ${this.renderPropertySection(t('exercise.detail.overview'), overviewRows)}
        ${this.renderPropertySection(t('exercise.detail.classification'), classificationRows)}
        ${this.renderPropertySection(t('exercise.detail.record'), recordRows)}
      </section>
    `
  }

  private renderPropertySection(title: string, rows: PropertyRow[]): string {
    return `
      <rrr-section>
        <span slot="heading">${escapeHtml(title)}</span>
        <dl class="rrr-property-list">
          ${rows.map((row) => renderPropertyRow(row)).join('')}
        </dl>
      </rrr-section>
    `
  }

  private renderBadgeList<T extends string>(values: readonly T[], labelForValue: (value: T) => string): string {
    if (values.length === 0) {
      return this.renderEmpty()
    }

    return `
      <div class="badge-list">
        ${values.map((value) => this.renderBadge(labelForValue(value))).join('')}
      </div>
    `
  }

  private renderMeasurementProfiles(profiles: MeasurementProfile[]): string {
    if (profiles.length === 0) {
      return this.renderEmpty()
    }

    return `
      <div class="profile-list">
        ${profiles.map((profile) => `
          <div class="profile">
            ${profile.map((type) => this.renderBadge(getMeasurementTypeLabel(type))).join('')}
          </div>
        `).join('')}
      </div>
    `
  }

  private renderOrigin(createdByUser: boolean): string {
    if (createdByUser) {
      return `<rrr-badge tone="accent">${t('exercise.detail.origin.custom')}</rrr-badge>`
    }

    return this.renderBadge(t('exercise.detail.origin.library'))
  }

  private renderBadge(label: string): string {
    return `<rrr-badge>${escapeHtml(label)}</rrr-badge>`
  }

  private renderText(value: string): string {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return this.renderEmpty()
    }

    return `<span>${escapeHtml(trimmedValue)}</span>`
  }

  private renderCode(value: string): string {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return this.renderEmpty()
    }

    return `<code>${escapeHtml(trimmedValue)}</code>`
  }

  private renderEmpty(): string {
    return `<span class="empty-value">${t('exercise.detail.none')}</span>`
  }

  private getKindLabel(exercise: ExerciseDefinition): string {
    return exercise.kind === 'time' ? t('exercise.kind.duration') : t('exercise.kind.repsWeight')
  }

  private getDefaultUnitLabel(unit: string | null): string {
    if (!unit) {
      return ''
    }

    if (unit === 'kg') {
      return t('exercise.unit.kg')
    }

    if (unit === 'seconds') {
      return t('exercise.unit.seconds')
    }

    return unit
  }

  private formatTimestamp(value: string): string {
    return formatDate(value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
}

customElements.define('rrr-exercise-detail', RrrExerciseDetail)
