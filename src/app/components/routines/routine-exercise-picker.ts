import { searchExercises } from '../../../domain/exercise-service.ts'
import type { ExerciseDefinition } from '../../../domain/types.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { getLocale, t, tPlural } from '../../../i18n/index.ts'
import { presentSheet } from '../../../foundation/sheet-service.ts'
import { toastService } from '../../../foundation/toast.ts'
import { escapeHtml } from '../../render-helpers.ts'
import { promptAddRoutineExerciseSettings, type RoutineExerciseSettings } from './routine-exercise-sheets.ts'
import styles from './routine-exercise-picker.css?inline'

export type RoutineExercisePickerSelectDetail = {
  exerciseId: string
}

export type PickerAddedExercise = {
  exerciseId: string
  settings: RoutineExerciseSettings
}

export class RrrRoutineExercisePicker extends HTMLElement {
  private exercisesValue: ExerciseDefinition[] = []
  private searchQuery = ''

  private readonly handleInput = (event: Event): void => {
    const searchInput = event
      .composedPath()
      .find((node): node is HTMLElement & { value: string } =>
        node instanceof HTMLElement && node.matches('[data-routine-exercise-search]'))

    if (!searchInput) {
      return
    }

    this.searchQuery = searchInput.value
    this.renderResults()
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const exerciseRow = event
      .composedPath()
      .find((node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.exerciseId !== undefined)
    const exerciseId = exerciseRow?.dataset.exerciseId

    if (!exerciseId) {
      return
    }

    this.dispatchEvent(new CustomEvent<RoutineExercisePickerSelectDetail>(
      'rrr-routine-exercise-picker-select',
      {
        bubbles: true,
        composed: true,
        detail: { exerciseId },
      },
    ))
  }

  set exercises(value: ExerciseDefinition[]) {
    this.exercisesValue = [...value]
    if (this.isConnected) {
      this.renderResults()
    }
  }

  get exercises(): ExerciseDefinition[] {
    return [...this.exercisesValue]
  }

  connectedCallback(): void {
    this.addEventListener('input', this.handleInput)
    this.addEventListener('click', this.handleClick)
    this.render()
  }

  disconnectedCallback(): void {
    this.removeEventListener('input', this.handleInput)
    this.removeEventListener('click', this.handleClick)
  }

  private getFilteredExercises(): ExerciseDefinition[] {
    return searchExercises(this.exercisesValue, this.searchQuery)
      .sort((left, right) =>
        left.name.localeCompare(right.name, getLocale(), {
          numeric: true,
          sensitivity: 'base',
        }))
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <rrr-input
        autofocus
        data-routine-exercise-search
        label="${escapeHtml(t('exercise.search.label'))}"
        placeholder="${escapeHtml(t('exercise.search.placeholder'))}"
        type="search"
        value="${escapeHtml(this.searchQuery)}"
      ></rrr-input>
      <div class="routine-exercise-picker-results" data-picker-results></div>
      <p
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-picker-status
      ></p>
    `
    this.renderResults()
  }

  private renderResults(): void {
    const results = this.querySelector<HTMLElement>('[data-picker-results]')
    const status = this.querySelector<HTMLElement>('[data-picker-status]')
    if (!results || !status) {
      return
    }

    const exercises = this.getFilteredExercises()
    results.dataset.resultCount = String(exercises.length)
    results.innerHTML = exercises.length > 0
      ? `
          <div
            class="rrr-list-card routine-exercise-picker-list"
            role="list"
            aria-label="${escapeHtml(t('label.addExercise'))}"
          >
            ${exercises.map((exercise) => this.renderExerciseRow(exercise)).join('')}
          </div>
        `
      : `<p class="routine-exercise-picker-empty">${escapeHtml(t('exercise.list.empty'))}</p>`
    status.textContent = tPlural('routineExercisePicker.results', exercises.length)
  }

  private renderExerciseRow(exercise: ExerciseDefinition): string {
    const name = escapeHtml(exercise.name)
    const actionLabel = escapeHtml(t('routineExercisePicker.addAria', {
      exercise: exercise.name,
    }))

    return `
      <rrr-list-row
        role="listitem"
        activation="button"
        accessory="custom"
        data-exercise-id="${escapeHtml(exercise.id)}"
      >
        <span slot="label">
          <span class="sr-only">${actionLabel}</span>
          <span aria-hidden="true">${name}</span>
        </span>
        <rrr-icon slot="trailing" name="add"></rrr-icon>
      </rrr-list-row>
    `
  }
}

export async function promptRoutineExercisePicker(
  exercises: ExerciseDefinition[],
  onAdd: (added: PickerAddedExercise) => void,
): Promise<void> {
  if (exercises.length === 0) {
    return
  }

  const sheet = document.createElement('rrr-sheet') as RrrSheet
  sheet.classList.add('routine-exercise-picker-sheet')

  const heading = document.createElement('h3')
  heading.slot = 'heading'
  heading.className = 'sheet-title'
  heading.textContent = t('label.addExercise')

  const picker = document.createElement(
    'rrr-routine-exercise-picker',
  ) as RrrRoutineExercisePicker
  picker.slot = 'body'
  picker.exercises = exercises

  let sessionDefaults: RoutineExerciseSettings = { setCount: 1, restSeconds: 60 }
  let configureOpen = false

  picker.addEventListener('rrr-routine-exercise-picker-select', async (event) => {
    if (configureOpen) {
      return
    }

    const selection = event as CustomEvent<RoutineExercisePickerSelectDetail>
    const { exerciseId } = selection.detail
    const exercise = exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) {
      return
    }

    configureOpen = true
    try {
      const settings = await promptAddRoutineExerciseSettings({
        exerciseName: exercise.name,
        setCount: sessionDefaults.setCount,
        restSeconds: sessionDefaults.restSeconds,
      })

      if (settings) {
        sessionDefaults = settings
        onAdd({ exerciseId, settings })
        toastService.success(t('routineExercisePicker.exerciseAdded', { exercise: exercise.name }))
      }
    } finally {
      configureOpen = false
    }
  })

  sheet.append(heading, picker)
  await presentSheet(sheet)
}

customElements.define('rrr-routine-exercise-picker', RrrRoutineExercisePicker)
