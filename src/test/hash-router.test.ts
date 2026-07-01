import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createHashRouter, type HashRouteMatch } from '../foundation/hash-router.ts'
import {
  appRoutes,
  getAppRouteBackHref,
  getAppRouteEndLink,
  getAppRouteMeta,
} from '../app/app-routes.ts'

type Meta = { title: string }

const routes = [
  { id: 'home', pattern: '/home', meta: { title: 'Home' } },
  { id: 'detail', pattern: '/workouts/:workoutId', meta: { title: 'Detail' } },
]

describe('createHashRouter', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '#')
  })

  test('resolves dynamic params from hash path', () => {
    const onRouteChange = vi.fn<(match: HashRouteMatch<Meta>) => void>()
    const router = createHashRouter({
      routes,
      notFoundRouteId: 'home',
      onRouteChange,
    })

    window.history.replaceState({}, '', '#/workouts/abc-123')
    router.start()

    const first = onRouteChange.mock.calls[0]?.[0]
    expect(first?.route.id).toBe('detail')
    expect(first?.params.workoutId).toBe('abc-123')

    router.dispose()
  })

  test('falls back to notFound route when hash path is unknown', () => {
    const onRouteChange = vi.fn<(match: HashRouteMatch<Meta>) => void>()
    const router = createHashRouter({
      routes,
      notFoundRouteId: 'home',
      onRouteChange,
    })

    window.history.replaceState({}, '', '#/missing/path')
    router.start()

    const first = onRouteChange.mock.calls[0]?.[0]
    expect(first?.route.id).toBe('home')
    expect(first?.pathname).toBe('/missing/path')

    router.dispose()
  })

  test('navigate updates hash and triggers route callback', () => {
    const onRouteChange = vi.fn<(match: HashRouteMatch<Meta>) => void>()
    const router = createHashRouter({
      routes,
      notFoundRouteId: 'home',
      onRouteChange,
    })

    router.start()
    router.navigate('/workouts/42')

    expect(window.location.hash).toBe('#/workouts/42')
    const last = onRouteChange.mock.calls.at(-1)?.[0]
    expect(last?.route.id).toBe('detail')
    expect(last?.params.workoutId).toBe('42')

    router.dispose()
  })
})

test('app routes include the appearance settings subpage', () => {
  const appearanceRoute = appRoutes.find((route) => route.id === 'settings-appearance')

  expect(appearanceRoute?.pattern).toBe('/settings/appearance')
  expect(appearanceRoute?.meta).toMatchObject({
    nav: 'settings',
    depth: 2,
    backHref: '#/settings',
  })
})

test('app routes include the language settings subpage', () => {
  const languageRoute = appRoutes.find((route) => route.id === 'settings-language')

  expect(languageRoute?.pattern).toBe('/settings/language')
  expect(languageRoute?.meta).toMatchObject({
    nav: 'settings',
    depth: 2,
    backHref: '#/settings',
  })
})

test('app route metadata defines route-specific header links', () => {
  expect(getAppRouteMeta('workouts').endLink).toEqual({
    href: '#/settings',
    icon: 'settings',
    labelKey: 'app.settings.title',
  })
  expect(getAppRouteMeta('routines').endLink).toEqual({
    href: '#/routines/new',
    icon: 'add',
    labelKey: 'routineList.new',
  })
  expect(getAppRouteEndLink({ name: 'routine-detail', routineId: 'routine 1' })).toBeUndefined()
  expect(getAppRouteBackHref({ name: 'routine-edit', routineId: 'routine 1' }))
    .toBe('#/routines/routine%201')
  expect(getAppRouteBackHref({
    name: 'routine-exercise',
    routineId: 'routine 1',
    routineExerciseId: 'entry 1',
  })).toBe('#/routines/routine%201')
})

test('app routes separate routine details from routine editing', () => {
  expect(appRoutes.find((route) => route.id === 'routine-detail')?.pattern)
    .toBe('/routines/:routineId')
  expect(appRoutes.find((route) => route.id === 'routine-edit')?.pattern)
    .toBe('/routines/:routineId/edit')
  expect(appRoutes.find((route) => route.id === 'routine-exercise')?.pattern)
    .toBe('/routines/:routineId/exercises/:routineExerciseId')
})
