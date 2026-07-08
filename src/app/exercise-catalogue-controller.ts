import type { Equipment, ExerciseCategory } from '../domain/types.ts'
import type { ExerciseFilters } from '../domain/exercise-service.ts'
import type { AppRoute } from './app-routes.ts'
import { updateExerciseFilterRailOverflow } from './exercise-catalogue-header.ts'

function toggleArrayValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export class ExerciseCatalogueController {
  private searchQueryValue = ''
  private filtersOpenValue = false
  private filtersValue: ExerciseFilters = { categories: [], equipment: [] }
  private focusedIdValue: string | null = null
  private searchDebounceId: number | null = null
  private filterRailController: AbortController | null = null
  private filterRailResizeObserver: ResizeObserver | null = null

  constructor(
    private readonly requestRender: () => void,
    private readonly syncCatalogueState: () => void,
  ) {}

  get searchQuery(): string {
    return this.searchQueryValue
  }

  get filtersOpen(): boolean {
    return this.filtersOpenValue
  }

  get focusedId(): string | null {
    return this.focusedIdValue
  }

  get filters(): ExerciseFilters {
    return {
      categories: [...this.filtersValue.categories],
      equipment: [...this.filtersValue.equipment],
    }
  }

  updateFocusedExercise(route: AppRoute): void {
    if (route.name === 'exercise-detail') {
      this.focusedIdValue = route.exerciseId
    }
  }

  toggleFilters(): void {
    this.filtersOpenValue = !this.filtersOpenValue
    this.requestRender()
  }

  clearFilters(): void {
    this.filtersValue = { categories: [], equipment: [] }
    this.filtersOpenValue = false
    this.syncCatalogueState()
    this.requestRender()
  }

  toggleFilter(target: HTMLElement): void {
    const filterType = target.dataset.filterType
    const value = target.dataset.filterValue

    if (!value) {
      return
    }

    if (filterType === 'category') {
      this.filtersValue = {
        ...this.filtersValue,
        categories: toggleArrayValue(this.filtersValue.categories, value as ExerciseCategory),
      }
      this.syncCatalogueState()
      this.requestRender()
      return
    }

    if (filterType === 'equipment') {
      this.filtersValue = {
        ...this.filtersValue,
        equipment: toggleArrayValue(this.filtersValue.equipment, value as Equipment),
      }
      this.syncCatalogueState()
      this.requestRender()
    }
  }

  handleSearchInputChange(value: string): void {
    this.searchQueryValue = value
    this.queueCatalogueSync()
  }

  handleSearchInputConfirm(value: string): void {
    this.searchQueryValue = value
    this.flushCatalogueSync()
  }

  dispose(): void {
    if (this.searchDebounceId !== null) {
      window.clearTimeout(this.searchDebounceId)
      this.searchDebounceId = null
    }
    this.clearFilterRailBinding()
  }

  clearFilterRailBinding(): void {
    this.filterRailController?.abort()
    this.filterRailController = null
    this.filterRailResizeObserver?.disconnect()
    this.filterRailResizeObserver = null
  }

  bindFilterRail(header: HTMLElement): void {
    this.clearFilterRailBinding()

    const rails = [...header.querySelectorAll<HTMLElement>('[data-filter-rail]')]
    if (rails.length === 0) {
      return
    }

    const controller = new AbortController()
    this.filterRailController = controller
    this.filterRailResizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        updateExerciseFilterRailOverflow(entry.target as HTMLElement)
      })
    })

    rails.forEach((rail) => {
      const updateOverflow = (): void => {
        updateExerciseFilterRailOverflow(rail)
      }

      rail.addEventListener('scroll', updateOverflow, { passive: true, signal: controller.signal })
      this.filterRailResizeObserver?.observe(rail)
      requestAnimationFrame(updateOverflow)
    })
  }

  private queueCatalogueSync(): void {
    if (this.searchDebounceId !== null) {
      window.clearTimeout(this.searchDebounceId)
    }

    this.searchDebounceId = window.setTimeout(() => {
      this.searchDebounceId = null
      this.syncCatalogueState()
    }, 150)
  }

  private flushCatalogueSync(): void {
    if (this.searchDebounceId !== null) {
      window.clearTimeout(this.searchDebounceId)
      this.searchDebounceId = null
    }

    this.syncCatalogueState()
  }
}
