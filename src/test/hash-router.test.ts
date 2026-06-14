import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createHashRouter, type HashRouteMatch } from '../foundation/hash-router.ts'

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
