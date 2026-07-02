import { storageService } from '../../storage-instance.ts'
import { getActiveRoutineVersion, getRoutine } from '../../../domain/routine-service.ts'
import type { PlannedSet } from '../../../domain/types.ts'
import { t, tPlural } from '../../../i18n/index.ts'
import { escapeHtml } from '../../render-helpers.ts'

export class RrrRoutineExerciseEditor extends HTMLElement {
  private routineIdValue: string | null = null
  private routineExerciseIdValue: string | null = null

  set routineId(value: string | null) {
    this.routineIdValue = value
    this.render()
  }

  get routineId(): string | null {
    return this.routineIdValue
  }

  set routineExerciseId(value: string | null) {
    this.routineExerciseIdValue = value
    this.render()
  }

  get routineExerciseId(): string | null {
    return this.routineExerciseIdValue
  }

  connectedCallback(): void {
    this.render()
  }

  private renderSetDescription(set: PlannedSet): string {
    if (set.kind === 'time') {
      return set.targetSeconds === null
        ? t('routineExercise.set.noTarget')
        : tPlural('routineExercise.set.seconds', set.targetSeconds)
    }

    const targets: string[] = []

    if (set.targetReps !== null) {
      targets.push(tPlural('routineExercise.set.reps', set.targetReps))
    }

    if (set.targetWeightKg !== null) {
      targets.push(t('routineExercise.set.weight', { weight: set.targetWeightKg }))
    }

    return targets.length > 0
      ? targets.join(` ${t('routineExercise.set.targetSeparator')} `)
      : t('routineExercise.set.noTarget')
  }

  private renderSets(sets: PlannedSet[], restSeconds: number): string {
    return sets
      .flatMap((set, index) => {
        const row = `
          <rrr-list-row
            label="${escapeHtml(t('routineExercise.set.label', { index: index + 1 }))}"
            description="${escapeHtml(this.renderSetDescription(set))}"
          ></rrr-list-row>
        `

        if (index === sets.length - 1) {
          return [row]
        }

        const duration = tPlural('routineExercise.rest.duration', restSeconds)
        const gutter = `
          <rrr-sequence-gutter
            icon="water-bottle"
            label="${escapeHtml(duration)}"
            aria-label="${escapeHtml(t('routineExercise.rest.aria', {
              duration,
              from: index + 1,
              to: index + 2,
            }))}"
          ></rrr-sequence-gutter>
        `

        return [row, gutter]
      })
      .join('')
  }

  private render(): void {
    const routineId = this.routineIdValue
    const routineExerciseId = this.routineExerciseIdValue
    const data = storageService.getData()
    const routine = routineId ? getRoutine(data, routineId) : undefined
    const version = routineId ? getActiveRoutineVersion(data, routineId) : undefined
    const routineExercise = version?.exercises.find(
      (candidate) => candidate.id === routineExerciseId,
    )
    const exercise = routineExercise
      ? data.exercises.find((candidate) => candidate.id === routineExercise.exerciseId)
      : undefined

    if (!routine || !routineExercise || !exercise) {
      this.innerHTML = `
        <section class="page">
          <p>${escapeHtml(t('routineExercise.notFound.description'))}</p>
        </section>
      `
      return
    }

    this.innerHTML = `
      <section class="page">
        ${routineExercise.notes ? `<p>${escapeHtml(routineExercise.notes)}</p>` : ''}

        <rrr-section>
          <span slot="heading">${escapeHtml(t('routineExercise.section.sets'))}</span>
          ${
            routineExercise.plannedSets.length > 0
              ? `
                <rrr-sequence aria-label="${escapeHtml(t('routineExercise.sets.sequenceAria', {
                  exercise: exercise.name,
                }))}">
                  ${this.renderSets(routineExercise.plannedSets, routineExercise.restSeconds)}
                </rrr-sequence>
              `
              : `<p>${escapeHtml(t('routineExercise.sets.empty'))}</p>`
          }
        </rrr-section>
      </section>
    `
  }
}

customElements.define('rrr-routine-exercise-editor', RrrRoutineExerciseEditor)
