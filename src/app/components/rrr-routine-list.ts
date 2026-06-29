import { storageService } from '../storage-instance.ts'
import {
  getRoutineListSections,
  type RoutineSummary,
} from '../../domain/routine-summary-service.ts'
import { formatDate, t } from '../../i18n/index.ts'
import type { Muscle } from '../../domain/types.ts'
import styles from './rrr-routine-list.css?inline'

const previewExerciseCount = 3
const previewMuscleCount = 3

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
    const musclePreview = t('routineList.muscles', {
      muscles: this.getMusclePreview(summary.primaryMuscles),
    })
    const lastStarted = summary.lastStartedAt
      ? t('routineList.lastStarted', {
          date: formatDate(new Date(summary.lastStartedAt), {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        })
      : t('routineList.lastStartedNever')

    return `
      <rrr-list-row
        href="#/routines/${encodeURIComponent(summary.routine.id)}"
        label="${escapeHtml(summary.routine.name)}"
        description="${escapeHtml(exercisePreview)}"
        accessory="chevron"
      >
        <span slot="body" class="routine-row-body">
          <span>${escapeHtml(musclePreview)}</span>
          <span>${escapeHtml(lastStarted)}</span>
        </span>
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

  private getMusclePreview(muscles: Muscle[]): string {
    if (muscles.length === 0) {
      return t('routineList.muscles.none')
    }

    const names = muscles
      .slice(0, previewMuscleCount)
      .map(getMuscleLabel)
      .join(', ')
    const remaining = muscles.length - previewMuscleCount

    return remaining > 0
      ? t('routineList.muscles.more', { names, count: remaining })
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

function getMuscleLabel(muscle: Muscle): string {
  return t(`exercise.muscle.${muscle}`)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-routine-list', RrrRoutineList)
