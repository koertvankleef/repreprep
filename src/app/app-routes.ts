import type { HashRouteConfig, HashRouteMatch } from '../foundation/hash-router.ts'

export type AppRouteId =
  | 'workouts'
  | 'workout-edit'
  | 'workout-log'
  | 'exercises'
  | 'exercise-detail'
  | 'history'
  | 'import-export'
  | 'routines'
  | 'routine-new'
  | 'routine-edit'
  | 'styleguide'
  | 'settings'
  | 'settings-appearance'

export type AppNavId =
  | 'workouts'
  | 'routines'
  | 'exercises'
  | 'history'
  | 'import-export'
  | 'styleguide'
  | 'settings'

export type AppRoute =
  | { name: 'workouts' }
  | { name: 'workout-edit'; workoutId: string }
  | { name: 'workout-log'; workoutId: string }
  | { name: 'exercises' }
  | { name: 'exercise-detail'; exerciseId: string }
  | { name: 'history' }
  | { name: 'import-export' }
  | { name: 'routines' }
  | { name: 'routine-new' }
  | { name: 'routine-edit'; routineId: string }
  | { name: 'styleguide' }
  | { name: 'settings' }
  | { name: 'settings-appearance' }

export type AppHeaderLink = {
  href: string
  icon: string
  labelKey: string
}

export type AppRouteMeta = {
  nav: AppNavId
  depth: 0 | 1 | 2
  main: boolean
  surface: 'full' | 'padded'
  header: 'standard' | 'exercise-catalogue'
  titleKey: string
  backHref?: string
  endLink?: AppHeaderLink
}

export const appRoutes: HashRouteConfig<AppRouteMeta>[] = [
  {
    id: 'workouts',
    pattern: '/workouts',
    meta: {
      nav: 'workouts',
      depth: 0,
      main: true,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.nav.today',
      endLink: { href: '#/settings', icon: 'settings', labelKey: 'app.settings.title' },
    },
  },
  {
    id: 'workout-edit',
    pattern: '/workouts/:workoutId',
    meta: {
      nav: 'workouts',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.header.workoutEdit',
      backHref: '#/workouts',
    },
  },
  {
    id: 'workout-log',
    pattern: '/workouts/:workoutId/log',
    meta: {
      nav: 'workouts',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.header.workoutLog',
      backHref: '#/workouts',
    },
  },
  {
    id: 'exercises',
    pattern: '/exercises',
    meta: {
      nav: 'exercises',
      depth: 0,
      main: true,
      surface: 'full',
      header: 'exercise-catalogue',
      titleKey: 'app.nav.exercises',
    },
  },
  {
    id: 'exercise-detail',
    pattern: '/exercises/:exerciseId',
    meta: {
      nav: 'exercises',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'exercise.detail.notFoundTitle',
      backHref: '#/exercises',
    },
  },
  {
    id: 'history',
    pattern: '/history',
    meta: {
      nav: 'history',
      depth: 0,
      main: true,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.nav.history',
    },
  },
  {
    id: 'import-export',
    pattern: '/import-export',
    meta: {
      nav: 'import-export',
      depth: 0,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.nav.importExport',
    },
  },
  {
    id: 'styleguide',
    pattern: '/styleguide',
    meta: {
      nav: 'styleguide',
      depth: 0,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.nav.styleguide',
    },
  },
  {
    id: 'routines',
    pattern: '/routines',
    meta: {
      nav: 'routines',
      depth: 0,
      main: true,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.nav.routines',
      endLink: { href: '#/routines/new', icon: 'add', labelKey: 'routineList.new' },
    },
  },
  {
    id: 'routine-new',
    pattern: '/routines/new',
    meta: {
      nav: 'routines',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.header.routineNew',
      backHref: '#/routines',
    },
  },
  {
    id: 'routine-edit',
    pattern: '/routines/:routineId',
    meta: {
      nav: 'routines',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.header.routineEdit',
      backHref: '#/routines',
    },
  },
  {
    id: 'settings',
    pattern: '/settings',
    meta: {
      nav: 'settings',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.settings.title',
      backHref: '#/workouts',
    },
  },
  {
    id: 'settings-appearance',
    pattern: '/settings/appearance',
    meta: {
      nav: 'settings',
      depth: 2,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.settings.appearance',
      backHref: '#/settings',
    },
  },
]

const routeMetaById = new Map(
  appRoutes.map((route) => [route.id as AppRouteId, route.meta]),
)

export function getAppRouteMeta(route: AppRoute | AppRouteId): AppRouteMeta {
  const routeId = typeof route === 'string' ? route : route.name
  const meta = routeMetaById.get(routeId)

  if (!meta) {
    throw new Error(`Missing app route metadata for '${routeId}'`)
  }

  return meta
}

export function toAppRoute(
  match: HashRouteMatch<AppRouteMeta>,
  styleguideEnabled: boolean,
): AppRoute {
  const routeId = match.route.id as AppRouteId

  if (routeId === 'styleguide' && !styleguideEnabled) {
    return { name: 'workouts' }
  }

  if (routeId === 'workout-edit') {
    return { name: routeId, workoutId: match.params.workoutId ?? '' }
  }

  if (routeId === 'workout-log') {
    return { name: routeId, workoutId: match.params.workoutId ?? '' }
  }

  if (routeId === 'routine-edit') {
    return { name: routeId, routineId: match.params.routineId ?? '' }
  }

  if (routeId === 'exercise-detail') {
    return { name: routeId, exerciseId: match.params.exerciseId ?? '' }
  }

  return { name: routeId } as AppRoute
}
