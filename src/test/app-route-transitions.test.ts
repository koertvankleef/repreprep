import { describe, expect, test } from 'vitest'
import { computeRouteTransition, isSameAppRoute } from '../app/app-route-transitions.ts'

describe('app route transitions', () => {
  test('does not animate initial or same route-name navigation', () => {
    expect(computeRouteTransition(null, { name: 'workouts' })).toBe('none')
    expect(computeRouteTransition({ name: 'workouts' }, { name: 'workouts' })).toBe('none')
  })

  test('uses main-switch between main navigation routes', () => {
    expect(computeRouteTransition({ name: 'workouts' }, { name: 'routines' })).toBe('main-switch')
  })

  test('uses sub-forward and sub-back when route depth changes', () => {
    expect(computeRouteTransition({ name: 'routines' }, { name: 'routine-new' })).toBe('sub-forward')
    expect(computeRouteTransition({ name: 'routine-new' }, { name: 'routines' })).toBe('sub-back')
  })
})

describe('app route equality', () => {
  test('compares route params for detail and edit routes', () => {
    expect(isSameAppRoute(
      { name: 'routine-detail', routineId: 'a' },
      { name: 'routine-detail', routineId: 'a' },
    )).toBe(true)
    expect(isSameAppRoute(
      { name: 'routine-detail', routineId: 'a' },
      { name: 'routine-detail', routineId: 'b' },
    )).toBe(false)
    expect(isSameAppRoute(
      { name: 'exercise-detail', exerciseId: 'push-up' },
      { name: 'exercise-detail', exerciseId: 'squat' },
    )).toBe(false)
    expect(isSameAppRoute(
      { name: 'workout-edit', workoutId: 'w1' },
      { name: 'workout-edit', workoutId: 'w2' },
    )).toBe(false)
  })

  test('treats simple routes with the same name as equal', () => {
    expect(isSameAppRoute({ name: 'settings' }, { name: 'settings' })).toBe(true)
    expect(isSameAppRoute({ name: 'settings' }, { name: 'settings-language' })).toBe(false)
  })
})
