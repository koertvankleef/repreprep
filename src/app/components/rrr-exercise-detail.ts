import { getExercise, isExerciseUsedInRoutines } from '../../domain/exercise-service.ts'
import type {
  Equipment,
  ExerciseCategory,
  ExerciseDefinition,
  MeasurementProfile,
  MeasurementType,
  Muscle,
} from '../../domain/types.ts'
import { formatDate, t } from '../../i18n/index.ts'
import { storageService } from '../storage-instance.ts'
import styles from './rrr-exercise-detail.css?inline'

type DetailRow = {
  label: string
  value: string
}

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
        <section class="rrr-section">
          <h2 class="rrr-section-title">${t('exercise.detail.notFoundTitle')}</h2>
          <div class="rrr-section-card rrr-section-card--flush">
            <p class="rrr-section-row">${t('exercise.detail.notFound')}</p>
          </div>
        </section>
      </section>
    `
  }

  private renderExercise(exercise: ExerciseDefinition, usedInRoutines: boolean): string {
    const overviewRows: DetailRow[] = [
      { label: t('exercise.detail.description'), value: this.renderText(exercise.description) },
      { label: t('exercise.detail.aliases'), value: this.renderBadgeList(exercise.aliases, (alias) => alias) },
      { label: t('exercise.detail.origin'), value: this.renderOrigin(exercise.createdByUser) },
      { label: t('exercise.detail.type'), value: this.renderBadge(this.getKindLabel(exercise)) },
      { label: t('exercise.detail.defaultUnit'), value: this.renderText(this.getDefaultUnitLabel(exercise.defaultUnit)) },
      { label: t('exercise.detail.status'), value: this.renderBadge(exercise.archived ? t('exercise.detail.archived') : t('exercise.detail.active')) },
      { label: t('exercise.detail.usedInRoutines'), value: this.renderText(usedInRoutines ? t('exercise.detail.yes') : t('exercise.detail.no')) },
    ]

    const classificationRows: DetailRow[] = [
      { label: t('exercise.detail.categories'), value: this.renderBadgeList(exercise.categories, getCategoryLabel) },
      { label: t('exercise.detail.equipment'), value: this.renderBadgeList(exercise.equipment, getEquipmentLabel) },
      { label: t('exercise.detail.primaryMuscles'), value: this.renderBadgeList(exercise.primaryMuscles, getMuscleLabel) },
      { label: t('exercise.detail.secondaryMuscles'), value: this.renderBadgeList(exercise.secondaryMuscles, getMuscleLabel) },
      { label: t('exercise.detail.measurementProfiles'), value: this.renderMeasurementProfiles(exercise.measurementProfiles) },
    ]

    const recordRows: DetailRow[] = [
      { label: t('exercise.detail.id'), value: this.renderCode(exercise.id) },
      { label: t('exercise.detail.created'), value: this.renderText(this.formatTimestamp(exercise.createdAt)) },
      { label: t('exercise.detail.updated'), value: this.renderText(this.formatTimestamp(exercise.updatedAt)) },
    ]

    return `
      <section class="page detail-page">
        ${this.renderDetailSection(t('exercise.detail.overview'), overviewRows)}
        ${this.renderDetailSection(t('exercise.detail.classification'), classificationRows)}
        ${this.renderDetailSection(t('exercise.detail.record'), recordRows)}
      </section>
    `
  }

  private renderDetailSection(title: string, rows: DetailRow[]): string {
    return `
      <section class="rrr-section">
        <h2 class="rrr-section-title">${escapeHtml(title)}</h2>
        <dl class="rrr-section-card rrr-section-card--flush detail-list">
          ${rows.map((row) => this.renderDetailRow(row)).join('')}
        </dl>
      </section>
    `
  }

  private renderDetailRow(row: DetailRow): string {
    return `
      <div class="rrr-detail-row rrr-section-row">
        <dt>${escapeHtml(row.label)}</dt>
        <dd>${row.value}</dd>
      </div>
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

function getCategoryLabel(category: ExerciseCategory): string {
  return t(`exercise.category.${category}`)
}

function getEquipmentLabel(equipment: Equipment): string {
  return t(`exercise.equipment.${equipment}`)
}

function getMuscleLabel(muscle: Muscle): string {
  return t(`exercise.muscle.${muscle}`)
}

function getMeasurementTypeLabel(type: MeasurementType): string {
  return t(`exercise.measurement.${type}`)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-detail', RrrExerciseDetail)
