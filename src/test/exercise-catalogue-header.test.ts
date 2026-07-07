import { describe, expect, test } from 'vitest'
import {
  getActiveExerciseFilterCount,
  renderExerciseCatalogueHeader,
  updateExerciseFilterRailOverflow,
} from '../app/exercise-catalogue-header.ts'
import type { ExerciseFilters } from '../domain/exercise-service.ts'

describe('exercise catalogue header', () => {
  test('renders search and closed filter state', () => {
    const header = renderExerciseCatalogueHeader({
      filtersOpen: false,
      searchQuery: 'press <heavy>',
      filters: { categories: [], equipment: [] },
    })

    expect(header.className).toBe('app-header-primary-exercises')
    expect(header.secondaryHtml).toBe('')
    expect(header.html).toContain('value="press &lt;heavy&gt;"')
    expect(header.html).toContain('data-has-active-filters="false"')
  })

  test('renders open filter rail with active filters and clear action', () => {
    const filters: ExerciseFilters = { categories: ['strength'], equipment: ['dumbbell'] }
    const header = renderExerciseCatalogueHeader({
      filtersOpen: true,
      searchQuery: '',
      filters,
    })

    expect(getActiveExerciseFilterCount(filters)).toBe(2)
    expect(header.secondaryHtml).toContain('data-filter-type="category"')
    expect(header.secondaryHtml).toContain('data-filter-type="equipment"')
    expect(header.secondaryHtml).toContain('data-action="clear-exercise-filters"')
  })

  test('updates filter rail overflow flags', () => {
    const shell = document.createElement('div')
    const rail = document.createElement('div')
    shell.className = 'exercise-filter-shell'
    shell.append(rail)

    Object.defineProperties(rail, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, value: 50 },
    })

    updateExerciseFilterRailOverflow(rail)

    expect(shell.dataset.overflowLeft).toBe('true')
    expect(shell.dataset.overflowRight).toBe('true')
  })
})
