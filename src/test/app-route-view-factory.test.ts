import { beforeAll, describe, expect, test } from 'vitest'
import {
  createAppRouteViewElement,
  type RouteViewFactoryContext,
} from '../app/app-route-view-factory.ts'
import type { RrrExerciseCatalogue } from '../app/components/exercises/rrr-exercise-catalogue.ts'

type StylesheetHost = (Document | ShadowRoot) & {
  __adoptedStyleSheets?: CSSStyleSheet[]
}

function installConstructableStylesheetShim(): void {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      value: () => {},
    })
  }

  const descriptor = {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      return (this as StylesheetHost).__adoptedStyleSheets ?? []
    },
    set(this: Document | ShadowRoot, value: CSSStyleSheet[]): void {
      (this as StylesheetHost).__adoptedStyleSheets = value
    },
  }

  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', descriptor)
  }

  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', descriptor)
  }
}

function createContext(overrides: Partial<RouteViewFactoryContext> = {}): RouteViewFactoryContext {
  return {
    displayPreferences: { theme: 'dark', contrast: 'high' },
    languagePreference: 'nl-NL',
    styleguideEnabled: true,
    exerciseSearchQuery: 'press',
    exerciseFilters: { categories: ['strength'], equipment: ['dumbbell'] },
    exerciseCatalogueFocusedId: 'arnold-dumbbell-press',
    ...overrides,
  }
}

describe('app route view factory', () => {
  beforeAll(async () => {
    installConstructableStylesheetShim()
    await import('../app/components/exercises/rrr-exercise-catalogue.ts')
  })

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
    const catalogue = createAppRouteViewElement({ name: 'exercises' }, context) as RrrExerciseCatalogue

    expect(catalogue.tagName.toLowerCase()).toBe('rrr-exercise-catalogue')
    expect(catalogue.searchQuery).toBe('press')
    expect(catalogue.filters).toEqual({ categories: ['strength'], equipment: ['dumbbell'] })
    expect(catalogue.filters).not.toBe(context.exerciseFilters)
    expect(catalogue.focusedExerciseId).toBe('arnold-dumbbell-press')
  })
})
