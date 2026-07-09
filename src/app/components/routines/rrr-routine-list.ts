import { storageService } from '../../storage-instance.ts'
import {
  getRoutineListSections,
  type RoutineSummary,
} from '../../../domain/routine-summary-service.ts'
import { t } from '../../../i18n/index.ts'
import { escapeHtml, formatShortDate } from '../../render-helpers.ts'
import styles from './rrr-routine-list.css?inline'

const previewExerciseCount = 2

export class RrrRoutineList extends HTMLElement {
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

  private renderRoutineRow(summary: RoutineSummary): string {
    const exercisePreview = this.getExercisePreview(summary)
    const lastStarted = summary.lastStartedAt
      ? formatShortDate(new Date(summary.lastStartedAt))
      : null

    return `
      <rrr-list-row
        activation="button"
        data-action="navigate"
        data-href="#/routines/${encodeURIComponent(summary.routine.id)}"
        description="${escapeHtml(exercisePreview)}"
        accessory="chevron"
      >
        <rrr-icon slot="leading" name="clipboard-task-list-ltr"></rrr-icon>
        <span slot="label" class="rrr-domain-heading">${escapeHtml(summary.routine.name)}</span>
        ${lastStarted
    ? `
            <span slot="body" class="routine-row-body">
              <rrr-icon name="timer"></rrr-icon>
              <span>${escapeHtml(lastStarted)}</span>
            </span>
          `
    : ''}
      </rrr-list-row>
    `
  }

  private getExercisePreview(summary: RoutineSummary): string {
    if (summary.exerciseNames.length === 0) {
      return t('routineList.exercises.none')
    }

    const names = summary.exerciseNames
      .slice(0, previewExerciseCount)
      .map((name) => name ?? t('routineList.exercises.unknown'))
      .join(', ')
    const remaining = summary.exerciseNames.length - previewExerciseCount

    return remaining > 0
      ? t('routineList.exercises.more', { names, count: remaining })
      : names
  }

  private render(): void {
    const { featured, others } = getRoutineListSections(storageService.getData())

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <p>${t('routineList.subtitle')}</p>
        ${
          featured
            ? `
              <rrr-section>
                <span slot="heading">${t('routineList.section.featured')}</span>
                <div class="rrr-list-card">
                  ${this.renderRoutineRow(featured)}
                </div>
              </rrr-section>
              ${
                others.length > 0
                  ? `
                    <rrr-section>
                      <span slot="heading">${t('routineList.section.others')}</span>
                      <div class="rrr-list-card">
                        ${others.map((summary) => this.renderRoutineRow(summary)).join('')}
                      </div>
                    </rrr-section>
                  `
                  : ''
              }
            `
            : `<p>${t('routineList.empty')}</p>`
        }
      </section>
    `
  }
}

customElements.define('rrr-routine-list', RrrRoutineList)
