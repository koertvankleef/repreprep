import { getAppRouteMeta, type AppRoute } from './app-routes.ts'

export type RouteTransition = 'none' | 'sub-forward' | 'sub-back' | 'main-switch'

export function computeRouteTransition(from: AppRoute | null, to: AppRoute): RouteTransition {
  if (!from || from.name === to.name) {
    return 'none'
  }

  const fromMeta = getAppRouteMeta(from)
  const toMeta = getAppRouteMeta(to)

  if (fromMeta.main && toMeta.main) {
    return 'main-switch'
  }

  if (toMeta.depth > fromMeta.depth) {
    return 'sub-forward'
  }

  if (toMeta.depth < fromMeta.depth) {
    return 'sub-back'
  }

  return 'sub-forward'
}

export function isSameAppRoute(a: AppRoute, b: AppRoute): boolean {
  if (a.name !== b.name) {
    return false
  }

  if (a.name === 'workout-edit' && b.name === 'workout-edit') {
    return a.workoutId === b.workoutId
  }

  if (a.name === 'workout-log' && b.name === 'workout-log') {
    return a.workoutId === b.workoutId
  }

  if (a.name === 'routine-detail' && b.name === 'routine-detail') {
    return a.routineId === b.routineId
  }

  if (a.name === 'exercise-detail' && b.name === 'exercise-detail') {
    return a.exerciseId === b.exerciseId
  }

  return true
}
