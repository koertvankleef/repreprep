import { storageService } from '../../storage-instance.ts'
import {
  createRepsPlannedSet,
  createTimePlannedSet,
  getActiveRoutineVersion,
  getRoutine,
} from '../../../domain/routine-service.ts'
import type {
  ExerciseDefinition,
  PlannedSet,
  Routine,
  RoutineExercise,
  RoutineVersion,
} from '../../../domain/types.ts'
import { t, tPlural } from '../../../i18n/index.ts'
import { escapeHtml } from '../../render-helpers.ts'
import {
  promptExerciseRestSeconds,
  promptPlannedSet,
} from './routine-exercise-sheets.ts'

type RoutineExerciseContext = {
  routine: Routine
  version: RoutineVersion
  routineExercise: RoutineExercise
  exercise: ExerciseDefinition
}

function plannedSetsEqual(left: PlannedSet, right: PlannedSet): boolean {
  if (left.id !== right.id || left.kind !== right.kind) {
    return false
  }

  return left.kind === 'time' && right.kind === 'time'
    ? left.targetSeconds === right.targetSeconds
    : left.kind === 'reps' && right.kind === 'reps'
      ? left.targetReps === right.targetReps
        && left.targetWeightKg === right.targetWeightKg
      : false
}

export class RrrRoutineExerciseEditor extends HTMLElement {
  private routineIdValue: string | null = null
  private routineExerciseIdValue: string | null = null
  private sheetActive = false

  private readonly handleDataChanged = (): void => {
    this.render()
  }

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
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.render()
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
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
            activation="button"
            label="${escapeHtml(t('routineExercise.set.label', { index: index + 1 }))}"
            description="${escapeHtml(this.renderSetDescription(set))}"
            accessory="chevron"
            data-set-id="${escapeHtml(set.id)}"
          ></rrr-list-row>
        `

        if (index === sets.length - 1) {
          return [row]
        }

        const duration = tPlural('routineExercise.rest.durationLong', restSeconds)
        const gutter = `
          <rrr-sequence-gutter
            icon="water-bottle"
            value="${restSeconds}"
            unit="s"
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

  private getContext(): RoutineExerciseContext | null {
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

    return routine && version && routineExercise && exercise
      ? { routine, version, routineExercise, exercise }
      : null
  }

  private saveRoutineExercise(
    context: RoutineExerciseContext,
    updatedExercise: RoutineExercise,
  ): void {
    storageService.saveRoutine(
      context.routine.id,
      context.routine.name,
      context.version.exercises.map((exercise) => exercise.id === updatedExercise.id
        ? updatedExercise
        : exercise),
      context.version.transitionSeconds,
    )
    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
  }

  private async editRestSeconds(): Promise<void> {
    const context = this.getContext()
    if (!context || this.sheetActive) {
      return
    }

    this.sheetActive = true
    try {
      const restSeconds = await promptExerciseRestSeconds(
        context.routineExercise.restSeconds,
      )
      if (
        restSeconds === undefined
        || restSeconds === context.routineExercise.restSeconds
      ) {
        return
      }

      const latest = this.getContext()
      if (latest) {
        this.saveRoutineExercise(latest, {
          ...latest.routineExercise,
          restSeconds,
        })
      }
    } finally {
      this.sheetActive = false
    }
  }

  private async editSet(setId: string): Promise<void> {
    const context = this.getContext()
    const setIndex = context?.routineExercise.plannedSets.findIndex(
      (set) => set.id === setId,
    ) ?? -1
    const set = context?.routineExercise.plannedSets[setIndex]
    if (!context || !set || this.sheetActive) {
      return
    }

    this.sheetActive = true
    try {
      const updatedSet = await promptPlannedSet({
        set,
        exerciseName: context.exercise.name,
        setNumber: setIndex + 1,
        adding: false,
      })
      if (!updatedSet || plannedSetsEqual(set, updatedSet)) {
        return
      }

      const latest = this.getContext()
      if (latest) {
        this.saveRoutineExercise(latest, {
          ...latest.routineExercise,
          plannedSets: latest.routineExercise.plannedSets.map((candidate) =>
            candidate.id === setId ? updatedSet : candidate),
        })
      }
    } finally {
      this.sheetActive = false
    }
  }

  private async addSet(): Promise<void> {
    const context = this.getContext()
    if (!context || this.sheetActive) {
      return
    }

    const set = context.exercise.kind === 'time'
      ? createTimePlannedSet()
      : createRepsPlannedSet()
    this.sheetActive = true

    try {
      const addedSet = await promptPlannedSet({
        set,
        exerciseName: context.exercise.name,
        setNumber: context.routineExercise.plannedSets.length + 1,
        adding: true,
      })
      if (!addedSet) {
        return
      }

      const latest = this.getContext()
      if (latest) {
        this.saveRoutineExercise(latest, {
          ...latest.routineExercise,
          plannedSets: [...latest.routineExercise.plannedSets, addedSet],
        })
      }
    } finally {
      this.sheetActive = false
    }
  }

  private render(): void {
    const context = this.getContext()

    if (!context) {
      this.innerHTML = `
        <section class="page">
          <p>${escapeHtml(t('routineExercise.notFound.description'))}</p>
        </section>
      `
      return
    }

    const { routineExercise, exercise } = context
    this.innerHTML = `
      <section class="page">
        ${routineExercise.notes ? `<p>${escapeHtml(routineExercise.notes)}</p>` : ''}

        <rrr-section>
          <span slot="heading">${escapeHtml(t('routineExercise.section.timing'))}</span>
          <div class="rrr-list-card">
            <rrr-list-row
              activation="button"
              label="${escapeHtml(t('routineExercise.rest.label'))}"
              value-text="${escapeHtml(tPlural(
                'routineExercise.rest.duration',
                routineExercise.restSeconds,
              ))}"
              accessory="value-chevron"
              data-action="edit-rest"
            >
              <rrr-icon slot="leading" name="timer"></rrr-icon>
            </rrr-list-row>
          </div>
        </rrr-section>

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
          <div class="rrr-list-card">
            <rrr-list-row
              activation="button"
              label="${escapeHtml(t('routineExercise.set.action.add'))}"
              data-action="add-set"
            >
              <rrr-icon slot="leading" name="add"></rrr-icon>
            </rrr-list-row>
          </div>
        </rrr-section>
      </section>
    `

    this.querySelector<HTMLElement>('rrr-list-row[data-action="edit-rest"]')
      ?.addEventListener('click', () => void this.editRestSeconds())
    this.querySelector<HTMLElement>('rrr-list-row[data-action="add-set"]')
      ?.addEventListener('click', () => void this.addSet())
    this.querySelectorAll<HTMLElement>('rrr-list-row[data-set-id]')
      .forEach((row) => {
        row.addEventListener('click', () => {
          const setId = row.dataset.setId
          if (setId) {
            void this.editSet(setId)
          }
        })
      })
  }
}

customElements.define('rrr-routine-exercise-editor', RrrRoutineExerciseEditor)
