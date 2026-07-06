import { searchExercises, type ExerciseFilters } from '../../../domain/exercise-service.ts'
import { equipmentValues, exerciseCategories } from '../../../domain/exercise-metadata.ts'
import type { Equipment, ExerciseCategory, ExerciseDefinition } from '../../../domain/types.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { getLocale, t, tPlural } from '../../../i18n/index.ts'
import { presentSheet } from '../../../foundation/sheet-service.ts'
import { toastService } from '../../../foundation/toast.ts'
import { getEquipmentLabel, getExerciseCategoryLabel } from '../../exercise-labels.ts'
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

export type RoutineExercisePickerFilterDetail = {
  filters: ExerciseFilters
}

export class RrrRoutineExercisePicker extends HTMLElement {
  private exercisesValue: ExerciseDefinition[] = []
  private searchQuery = ''
  private filtersValue: ExerciseFilters = { categories: [], equipment: [] }

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
    const filterTrigger = event
      .composedPath()
      .find((node): node is HTMLElement =>
        node instanceof HTMLElement && node.matches('[data-routine-exercise-filter-trigger]'))

    if (filterTrigger) {
      this.dispatchEvent(new CustomEvent<RoutineExercisePickerFilterDetail>(
        'rrr-routine-exercise-picker-filter',
        {
          bubbles: true,
          composed: true,
          detail: { filters: this.filters },
        },
      ))
      return
    }

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

  set filters(value: ExerciseFilters) {
    this.filtersValue = cloneFilters(value)
    if (this.isConnected) {
      this.syncFilterTrigger()
      this.renderResults()
    }
  }

  get filters(): ExerciseFilters {
    return cloneFilters(this.filtersValue)
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
    return filterPickerExercises(
      searchExercises(this.exercisesValue, this.searchQuery),
      this.filtersValue,
    )
      .sort((left, right) =>
        left.name.localeCompare(right.name, getLocale(), {
          numeric: true,
          sensitivity: 'base',
        }))
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <div class="routine-exercise-picker-controls">
        <rrr-input
          autofocus
          data-routine-exercise-search
          label="${escapeHtml(t('exercise.search.label'))}"
          placeholder="${escapeHtml(t('exercise.search.placeholder'))}"
          type="search"
          value="${escapeHtml(this.searchQuery)}"
        ></rrr-input>
        ${this.renderFilterTrigger()}
      </div>
      <div class="routine-exercise-picker-results" data-picker-results></div>
      <p
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-picker-status
      ></p>
    `
    this.syncFilterTrigger()
    this.renderResults()
  }

  private renderFilterTrigger(): string {
    const hasActiveFilters = getActiveFilterCount(this.filtersValue) > 0
    const label = hasActiveFilters
      ? t('exercise.filter.openActive')
      : t('exercise.filter.open')

    return `
      <rrr-button
        type="button"
        variant="ghost"
        rounded
        class="routine-exercise-picker-filter-trigger"
        data-routine-exercise-filter-trigger
        data-has-active-filters="${hasActiveFilters}"
        aria-label="${escapeHtml(label)}"
        title="${escapeHtml(label)}"
      ><rrr-icon name="filter"></rrr-icon></rrr-button>
    `
  }

  private syncFilterTrigger(): void {
    const trigger = this.querySelector<HTMLElement>('[data-routine-exercise-filter-trigger]')
    if (!trigger) {
      return
    }

    const hasActiveFilters = getActiveFilterCount(this.filtersValue) > 0
    const label = hasActiveFilters
      ? t('exercise.filter.openActive')
      : t('exercise.filter.open')
    trigger.dataset.hasActiveFilters = String(hasActiveFilters)
    trigger.setAttribute('aria-label', label)
    trigger.setAttribute('title', label)
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

async function promptRoutineExerciseFilterSheet(
  filters: ExerciseFilters,
  onChange: (filters: ExerciseFilters) => void,
): Promise<void> {
  const sheet = document.createElement('rrr-sheet') as RrrSheet
  const heading = document.createElement('h3')
  heading.slot = 'heading'
  heading.className = 'sheet-title'
  heading.textContent = t('exercise.filter.railLabel')

  const body = document.createElement('div')
  body.slot = 'body'
  body.className = 'routine-exercise-filter-sheet'

  let currentFilters = cloneFilters(filters)
  const render = (): void => {
    const hasActiveFilters = getActiveFilterCount(currentFilters) > 0
    body.innerHTML = `
      ${renderFilterGroup(
        t('exercise.filter.category'),
        exerciseCategories,
        currentFilters.categories,
        'category',
        getExerciseCategoryLabel,
      )}
      ${renderFilterGroup(
        t('exercise.filter.equipment'),
        equipmentValues,
        currentFilters.equipment,
        'equipment',
        getEquipmentLabel,
      )}
      <div class="routine-exercise-filter-actions">
        <rrr-button
          type="button"
          size="s"
          rounded
          variant="ghost"
          data-routine-exercise-filter-clear
          ${hasActiveFilters ? '' : 'disabled'}
        >${escapeHtml(t('exercise.filter.clear'))}</rrr-button>
      </div>
    `
  }

  body.addEventListener('click', (event) => {
    const toggle = event
      .composedPath()
      .find((node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.routineExerciseFilterValue !== undefined)

    if (toggle) {
      const filterType = toggle.dataset.routineExerciseFilterType
      const value = toggle.dataset.routineExerciseFilterValue
      if (filterType === 'category' && value) {
        currentFilters = {
          ...currentFilters,
          categories: toggleArrayValue(currentFilters.categories, value as ExerciseCategory),
        }
      }
      if (filterType === 'equipment' && value) {
        currentFilters = {
          ...currentFilters,
          equipment: toggleArrayValue(currentFilters.equipment, value as Equipment),
        }
      }
      onChange(cloneFilters(currentFilters))
      render()
      return
    }

    const clear = event
      .composedPath()
      .find((node): node is HTMLElement =>
        node instanceof HTMLElement && node.matches('[data-routine-exercise-filter-clear]'))
    if (clear && !clear.hasAttribute('disabled')) {
      currentFilters = { categories: [], equipment: [] }
      onChange(cloneFilters(currentFilters))
      render()
    }
  })

  render()
  sheet.append(heading, body)
  await presentSheet(sheet)
}

function renderFilterGroup<T extends string>(
  label: string,
  values: readonly T[],
  selectedValues: readonly T[],
  filterType: 'category' | 'equipment',
  labelForValue: (value: T) => string,
): string {
  const selected = new Set(selectedValues)

  return `
    <div class="routine-exercise-filter-group" role="group" aria-label="${escapeHtml(label)}">
      <span class="routine-exercise-filter-group-label">${escapeHtml(label)}</span>
      <div class="routine-exercise-filter-options">
        ${values.map((value, index) => {
          const active = selected.has(value)

          return `
            <rrr-button
              type="button"
              size="s"
              rounded
              ${index === 0 ? 'autofocus' : ''}
              ${active ? '' : 'variant="outline"'}
              data-routine-exercise-filter-type="${filterType}"
              data-routine-exercise-filter-value="${escapeHtml(value)}"
              aria-pressed="${active}"
            >${escapeHtml(labelForValue(value))}</rrr-button>
          `
        }).join('')}
      </div>
    </div>
  `
}

function cloneFilters(filters: ExerciseFilters): ExerciseFilters {
  return {
    categories: [...filters.categories],
    equipment: [...filters.equipment],
  }
}

function getActiveFilterCount(filters: ExerciseFilters): number {
  return filters.categories.length + filters.equipment.length
}

function filterPickerExercises(
  exercises: ExerciseDefinition[],
  filters: ExerciseFilters,
): ExerciseDefinition[] {
  return exercises.filter((exercise) =>
    includesEvery(exercise.categories, filters.categories)
    && includesEvery(exercise.equipment, filters.equipment))
}

function includesEvery<T>(values: readonly T[], selectedValues: readonly T[]): boolean {
  return selectedValues.every((value) => values.includes(value))
}

function toggleArrayValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
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
  let filterOpen = false

  picker.addEventListener('rrr-routine-exercise-picker-filter', async (event) => {
    if (configureOpen || filterOpen) {
      return
    }

    filterOpen = true
    try {
      const detail = (event as CustomEvent<RoutineExercisePickerFilterDetail>).detail
      await promptRoutineExerciseFilterSheet(detail.filters, (filters) => {
        picker.filters = filters
      })
    } finally {
      filterOpen = false
    }
  })

  picker.addEventListener('rrr-routine-exercise-picker-select', async (event) => {
    if (configureOpen || filterOpen) {
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
