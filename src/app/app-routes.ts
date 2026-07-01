import type { HashRouteConfig, HashRouteMatch } from '../foundation/hash-router.ts'

export type AppRouteId =
  | 'workouts'
  | 'workout-edit'
  | 'workout-log'
  | 'exercises'
  | 'exercise-detail'
  | 'history'
  | 'routines'
  | 'routine-new'
  | 'routine-detail'
  | 'routine-edit'
  | 'settings'
  | 'settings-appearance'
  | 'settings-language'
  | 'settings-import-export'
  | 'settings-styleguide'

export type AppNavId =
  | 'workouts'
  | 'routines'
  | 'exercises'
  | 'history'
  | 'settings'

export type AppRoute =
  | { name: 'workouts' }
  | { name: 'workout-edit'; workoutId: string }
  | { name: 'workout-log'; workoutId: string }
  | { name: 'exercises' }
  | { name: 'exercise-detail'; exerciseId: string }
  | { name: 'history' }
  | { name: 'routines' }
  | { name: 'routine-new' }
  | { name: 'routine-detail'; routineId: string }
  | { name: 'routine-edit'; routineId: string }
  | { name: 'settings' }
  | { name: 'settings-appearance' }
  | { name: 'settings-language' }
  | { name: 'settings-import-export' }
  | { name: 'settings-styleguide' }

export type AppHeaderLink = {
  href: string
  icon: string
  labelKey: string
}

type AppRouteValue<T> = T | ((route: AppRoute) => T)

export type AppRouteMeta = {
  nav: AppNavId
  depth: 0 | 1 | 2
  main: boolean
  surface: 'full' | 'padded'
  header: 'standard' | 'exercise-catalogue'
  titleKey: string
  backHref?: AppRouteValue<string>
  endLink?: AppRouteValue<AppHeaderLink>
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
    id: 'routine-detail',
    pattern: '/routines/:routineId',
    meta: {
      nav: 'routines',
      depth: 1,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'routineDetail.notFound.title',
      backHref: '#/routines',
      endLink: (route) => ({
        href: route.name === 'routine-detail'
          ? `#/routines/${encodeURIComponent(route.routineId)}/edit`
          : '#/routines',
        icon: 'edit',
        labelKey: 'routineDetail.action.edit',
      }),
    },
  },
  {
    id: 'routine-edit',
    pattern: '/routines/:routineId/edit',
    meta: {
      nav: 'routines',
      depth: 2,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.header.routineEdit',
      backHref: (route) => route.name === 'routine-edit'
        ? `#/routines/${encodeURIComponent(route.routineId)}`
        : '#/routines',
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
  {
    id: 'settings-language',
    pattern: '/settings/language',
    meta: {
      nav: 'settings',
      depth: 2,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.settings.language',
      backHref: '#/settings',
    },
  },
  {
    id: 'settings-import-export',
    pattern: '/settings/import-export',
    meta: {
      nav: 'settings',
      depth: 2,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.settings.importExport',
      backHref: '#/settings',
    },
  },
  {
    id: 'settings-styleguide',
    pattern: '/settings/styleguide',
    meta: {
      nav: 'settings',
      depth: 2,
      main: false,
      surface: 'padded',
      header: 'standard',
      titleKey: 'app.settings.styleguide',
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

export function getAppRouteBackHref(route: AppRoute): string | undefined {
  const backHref = getAppRouteMeta(route).backHref
  return typeof backHref === 'function' ? backHref(route) : backHref
}

export function getAppRouteEndLink(route: AppRoute): AppHeaderLink | undefined {
  const endLink = getAppRouteMeta(route).endLink
  return typeof endLink === 'function' ? endLink(route) : endLink
}

export function toAppRoute(
  match: HashRouteMatch<AppRouteMeta>,
  styleguideEnabled: boolean,
): AppRoute {
  const routeId = match.route.id as AppRouteId

  if (routeId === 'settings-styleguide' && !styleguideEnabled) {
    return { name: 'workouts' }
  }

  if (routeId === 'workout-edit') {
    return { name: routeId, workoutId: match.params.workoutId ?? '' }
  }

  if (routeId === 'workout-log') {
    return { name: routeId, workoutId: match.params.workoutId ?? '' }
  }

  if (routeId === 'routine-detail' || routeId === 'routine-edit') {
    return { name: routeId, routineId: match.params.routineId ?? '' }
  }

  if (routeId === 'exercise-detail') {
    return { name: routeId, exerciseId: match.params.exerciseId ?? '' }
  }

  return { name: routeId } as AppRoute
}
