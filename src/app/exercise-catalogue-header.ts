import { equipmentValues, exerciseCategories } from '../domain/exercise-metadata.ts'
import type { ExerciseFilters } from '../domain/exercise-service.ts'
import type { Equipment, ExerciseCategory } from '../domain/types.ts'
import { t } from '../i18n/index.ts'
import { getEquipmentLabel, getExerciseCategoryLabel } from './exercise-labels.ts'
import { escapeHtml } from './render-helpers.ts'

export type ExerciseCatalogueHeaderState = {
  filtersOpen: boolean
  searchQuery: string
  filters: ExerciseFilters
}

export type ExerciseCatalogueHeaderMarkup = {
  className: string
  secondaryClassName: string
  html: string
  secondaryHtml: string
}

export function renderExerciseCatalogueHeader(state: ExerciseCatalogueHeaderState): ExerciseCatalogueHeaderMarkup {
  const hasActiveFilters = getActiveExerciseFilterCount(state.filters) > 0
  const filterLabel = hasActiveFilters
    ? t('exercise.filter.openActive')
    : t('exercise.filter.open')
  const escapedFilterLabel = escapeHtml(filterLabel)

  return {
    className: 'app-header-primary-exercises',
    secondaryClassName: 'app-header-secondary-exercises',
    secondaryHtml: state.filtersOpen ? renderExerciseFilterRail(state.filters) : '',
    html: `
      <div class="exercise-app-header">
      <rrr-input
        class="app-header-search"
        variant="outline"
        tone="neutral"
        rounded
        type="search"
        name="exercise-search"
        aria-label="${t('exercise.search.label')}"
        placeholder="${t('exercise.search.placeholder')}"
        value="${escapeHtml(state.searchQuery)}"
      >
        <rrr-icon slot="start" name="search"></rrr-icon>
      </rrr-input>
      <rrr-button
        type="button"
        variant="ghost"
        tone="neutral"
        rounded
        class="exercise-filter-trigger"
        data-action="toggle-exercise-filters"
        data-has-active-filters="${hasActiveFilters}"
        aria-pressed="${state.filtersOpen}"
        aria-label="${escapedFilterLabel}"
        title="${escapedFilterLabel}"
      ><rrr-icon name="filter"></rrr-icon></rrr-button>
      </div>
    `,
  }
}

export function getActiveExerciseFilterCount(filters: ExerciseFilters): number {
  return filters.categories.length + filters.equipment.length
}

export function updateExerciseFilterRailOverflow(rail: HTMLElement): void {
  const shell = rail.closest<HTMLElement>('.exercise-filter-shell')

  if (!shell) {
    return
  }

  const maxScrollLeft = rail.scrollWidth - rail.clientWidth
  shell.dataset.overflowLeft = String(rail.scrollLeft > 1)
  shell.dataset.overflowRight = String(rail.scrollLeft < maxScrollLeft - 1)
}

function renderExerciseFilterRail(filters: ExerciseFilters): string {
  const hasActiveFilters = getActiveExerciseFilterCount(filters) > 0

  return `
    <div class="exercise-filter-rows" aria-label="${t('exercise.filter.railLabel')}">
      ${renderExerciseFilterGroup(
        t('exercise.filter.category'),
        exerciseCategories,
        filters.categories,
        'category',
        getExerciseCategoryLabel,
      )}
      ${renderExerciseFilterGroup(
        t('exercise.filter.equipment'),
        equipmentValues,
        filters.equipment,
        'equipment',
        getEquipmentLabel,
      )}
      ${hasActiveFilters ? `
        <div class="exercise-filter-actions">
          <rrr-button type="button" size="s" rounded variant="ghost" data-action="clear-exercise-filters">
            ${t('exercise.filter.clear')}
          </rrr-button>
        </div>
      ` : ''}
    </div>
  `
}

function renderExerciseFilterGroup<T extends Equipment | ExerciseCategory>(
  label: string,
  values: readonly T[],
  selectedValues: readonly T[],
  filterType: 'category' | 'equipment',
  labelForValue: (value: T) => string,
): string {
  const selected = new Set(selectedValues)

  return `
    <div class="exercise-filter-row" role="group" aria-label="${escapeHtml(label)}">
      <span class="exercise-filter-group-label">${escapeHtml(label)}</span>
      <div class="exercise-filter-shell" data-overflow-left="false" data-overflow-right="false">
        <span class="exercise-filter-edge exercise-filter-edge-left" aria-hidden="true"></span>
        <div class="exercise-filter-rail" data-filter-rail>
          ${values.map((value) => {
            const active = selected.has(value)
            const buttonLabel = labelForValue(value)

            return `
              <rrr-button
                type="button"
                size="s"
                rounded
                ${active ? '' : 'variant="outline"'}
                data-action="toggle-exercise-filter"
                data-filter-type="${filterType}"
                data-filter-value="${escapeHtml(value)}"
                aria-pressed="${active}"
              >${escapeHtml(buttonLabel)}</rrr-button>
            `
          }).join('')}
        </div>
        <span class="exercise-filter-edge exercise-filter-edge-right" aria-hidden="true"></span>
      </div>
    </div>
  `
}
