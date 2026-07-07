import type { ExerciseFilters } from '../domain/exercise-service.ts'
import type { DisplayPreferences } from './theme-preferences.ts'
import type { LanguagePreference } from './language-preferences.ts'
import type { AppRoute } from './app-routes.ts'

export type ExerciseCatalogueElement = HTMLElement & {
  searchQuery: string
  filters: ExerciseFilters
  focusedExerciseId: string | null
  setSearchAndFilters?: (searchQuery: string, filters: ExerciseFilters) => void
}

export type RoutineEditorElement = HTMLElement & {
  openRenameSheet(): Promise<boolean>
  getCurrentName?(): string
}

export type RouteViewFactoryContext = {
  displayPreferences: DisplayPreferences
  languagePreference: LanguagePreference
  styleguideEnabled: boolean
  exerciseSearchQuery: string
  exerciseFilters: ExerciseFilters
  exerciseCatalogueFocusedId: string | null
}

export function createAppRouteViewElement(route: AppRoute, context: RouteViewFactoryContext): HTMLElement {
  if (route.name === 'workouts') {
    return document.createElement('rrr-workout-list')
  }

  if (route.name === 'workout-edit') {
    const editor = document.createElement('rrr-workout-editor') as HTMLElement & { workoutId: string | null }
    editor.workoutId = route.workoutId
    return editor
  }

  if (route.name === 'workout-log') {
    const logger = document.createElement('rrr-workout-logging') as HTMLElement & { workoutId: string | null }
    logger.workoutId = route.workoutId
    return logger
  }

  if (route.name === 'exercises') {
    const catalogue = document.createElement('rrr-exercise-catalogue') as ExerciseCatalogueElement
    const filters = cloneExerciseFilters(context.exerciseFilters)
    catalogue.focusedExerciseId = context.exerciseCatalogueFocusedId

    if (catalogue.setSearchAndFilters) {
      catalogue.setSearchAndFilters(context.exerciseSearchQuery, filters)
    } else {
      catalogue.searchQuery = context.exerciseSearchQuery
      catalogue.filters = filters
    }
    return catalogue
  }

  if (route.name === 'exercise-detail') {
    const detail = document.createElement('rrr-exercise-detail') as HTMLElement & { exerciseId: string | null }
    detail.exerciseId = route.exerciseId
    return detail
  }

  if (route.name === 'history') {
    return document.createElement('rrr-exercise-history')
  }

  if (route.name === 'routines') {
    return document.createElement('rrr-routine-list')
  }

  if (route.name === 'routine-new') {
    return document.createElement('rrr-routine-editor') as RoutineEditorElement
  }

  if (route.name === 'routine-detail') {
    const detail = document.createElement('rrr-routine-detail') as HTMLElement & { routineId: string | null }
    detail.routineId = route.routineId
    return detail
  }

  if (route.name === 'settings-styleguide') {
    return document.createElement('rrr-styleguide')
  }

  if (route.name === 'settings-import-export') {
    return document.createElement('rrr-import-export')
  }

  if (route.name === 'settings') {
    const settingsEl = document.createElement('rrr-settings')
    settingsEl.setAttribute('theme', context.displayPreferences.theme)
    settingsEl.setAttribute('language', context.languagePreference)
    settingsEl.setAttribute('styleguide-enabled', context.styleguideEnabled ? 'true' : 'false')
    return settingsEl
  }

  if (route.name === 'settings-appearance') {
    const appearanceEl = document.createElement('rrr-appearance-settings')
    appearanceEl.setAttribute('theme', context.displayPreferences.theme)
    appearanceEl.setAttribute('contrast', context.displayPreferences.contrast)
    return appearanceEl
  }

  if (route.name === 'settings-language') {
    const languageEl = document.createElement('rrr-language-settings')
    languageEl.setAttribute('language', context.languagePreference)
    return languageEl
  }

  return document.createElement('rrr-import-export')
}

function cloneExerciseFilters(filters: ExerciseFilters): ExerciseFilters {
  return {
    categories: [...filters.categories],
    equipment: [...filters.equipment],
  }
}
