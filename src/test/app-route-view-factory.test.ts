import { describe, expect, test } from 'vitest'
import {
  createAppRouteViewElement,
  type ExerciseCatalogueElement,
  type RouteViewFactoryContext,
} from '../app/app-route-view-factory.ts'

function createContext(overrides: Partial<RouteViewFactoryContext> = {}): RouteViewFactoryContext {
  return {
    displayPreferences: { theme: 'dark', contrast: 'high' },
    languagePreference: 'nl-NL',
    styleguideEnabled: true,
    exerciseSearchQuery: 'press',
    exerciseFilters: { categories: ['strength'], equipment: ['dumbbell'] },
    exerciseCatalogueFocusedId: 'bench-press',
    ...overrides,
  }
}

describe('app route view factory', () => {
  test('creates route elements and assigns route params', () => {
    const workoutEditor = createAppRouteViewElement(
      { name: 'workout-edit', workoutId: 'workout-1' },
      createContext(),
    ) as HTMLElement & { workoutId: string | null }

    const routineDetail = createAppRouteViewElement(
      { name: 'routine-detail', routineId: 'routine-1' },
      createContext(),
    ) as HTMLElement & { routineId: string | null }

    expect(workoutEditor.tagName.toLowerCase()).toBe('rrr-workout-editor')
    expect(workoutEditor.workoutId).toBe('workout-1')
    expect(routineDetail.tagName.toLowerCase()).toBe('rrr-routine-detail')
    expect(routineDetail.routineId).toBe('routine-1')
  })

  test('passes settings preferences as attributes', () => {
    const settings = createAppRouteViewElement({ name: 'settings' }, createContext())
    const appearance = createAppRouteViewElement({ name: 'settings-appearance' }, createContext())
    const language = createAppRouteViewElement({ name: 'settings-language' }, createContext())

    expect(settings.getAttribute('theme')).toBe('dark')
    expect(settings.getAttribute('language')).toBe('nl-NL')
    expect(settings.getAttribute('styleguide-enabled')).toBe('true')
    expect(appearance.getAttribute('theme')).toBe('dark')
    expect(appearance.getAttribute('contrast')).toBe('high')
    expect(language.getAttribute('language')).toBe('nl-NL')
  })

  test('passes cloned exercise catalogue state', () => {
    const context = createContext()
    const catalogue = createAppRouteViewElement({ name: 'exercises' }, context) as ExerciseCatalogueElement

    expect(catalogue.tagName.toLowerCase()).toBe('rrr-exercise-catalogue')
    expect(catalogue.searchQuery).toBe('press')
    expect(catalogue.filters).toEqual({ categories: ['strength'], equipment: ['dumbbell'] })
    expect(catalogue.filters).not.toBe(context.exerciseFilters)
    expect(catalogue.focusedExerciseId).toBe('bench-press')
  })
})
