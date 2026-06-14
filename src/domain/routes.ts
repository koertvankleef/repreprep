import type { HashRouteConfig } from '../foundation/hash-router.ts'

export type AppRouteId =
  | 'workouts'
  | 'workout-edit'
  | 'exercises'
  | 'history'
  | 'import-export'
  | 'routines'
  | 'routine-new'
  | 'routine-edit'

export type AppRouteMeta = {
  nav: 'workouts' | 'routines' | 'exercises' | 'history' | 'import-export'
}

export const appRoutes: HashRouteConfig<AppRouteMeta>[] = [
  { id: 'workouts', pattern: '/workouts', meta: { nav: 'workouts' } },
  { id: 'workout-edit', pattern: '/workouts/:workoutId', meta: { nav: 'workouts' } },
  { id: 'exercises', pattern: '/exercises', meta: { nav: 'exercises' } },
  { id: 'history', pattern: '/history', meta: { nav: 'history' } },
  { id: 'import-export', pattern: '/import-export', meta: { nav: 'import-export' } },
  { id: 'routines', pattern: '/routines', meta: { nav: 'routines' } },
  { id: 'routine-new', pattern: '/routines/new', meta: { nav: 'routines' } },
  { id: 'routine-edit', pattern: '/routines/:routineId', meta: { nav: 'routines' } },
]
