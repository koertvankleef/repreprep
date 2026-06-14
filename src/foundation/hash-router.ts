export type HashRouteConfig<TMeta> = {
  id: string
  pattern: string
  meta: TMeta
}

export type HashRouteMatch<TMeta> = {
  route: HashRouteConfig<TMeta>
  params: Record<string, string>
  pathname: string
}

type HashRouterOptions<TMeta> = {
  routes: HashRouteConfig<TMeta>[]
  notFoundRouteId: string
  onRouteChange: (match: HashRouteMatch<TMeta>) => void
}

function normalizePath(pathname: string): string {
  const cleaned = pathname.replace(/\/+$/, '') || '/'
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

function splitPath(pathname: string): string[] {
  return normalizePath(pathname)
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
}

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const patternSegments = splitPath(pattern)
  const pathSegments = splitPath(pathname)

  if (patternSegments.length !== pathSegments.length) {
    return null
  }

  const params: Record<string, string> = {}

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index]
    const pathSegment = pathSegments[index]

    if (!patternSegment || !pathSegment) {
      return null
    }

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment)
      continue
    }

    if (patternSegment !== pathSegment) {
      return null
    }
  }

  return params
}

function hashToPath(hash: string): string {
  if (!hash || hash === '#') {
    return '/'
  }

  if (hash.startsWith('#/')) {
    return normalizePath(hash.slice(1))
  }

  return '/'
}

function pathToHash(pathname: string): string {
  return `#${normalizePath(pathname)}`
}

export function createHashRouter<TMeta>(options: HashRouterOptions<TMeta>) {
  const { routes, notFoundRouteId, onRouteChange } = options

  const notFoundRoute = routes.find((route) => route.id === notFoundRouteId)

  if (!notFoundRoute) {
    throw new Error(`Not found route '${notFoundRouteId}' does not exist`)
  }

  const findMatch = (pathname: string): HashRouteMatch<TMeta> => {
    const normalizedPath = normalizePath(pathname)

    for (const route of routes) {
      const params = matchPattern(route.pattern, normalizedPath)

      if (params) {
        return { route, params, pathname: normalizedPath }
      }
    }

    return { route: notFoundRoute, params: {}, pathname: normalizedPath }
  }

  const renderCurrentHash = (): void => {
    const pathname = hashToPath(window.location.hash)
    onRouteChange(findMatch(pathname))
  }

  const handleHashChange = (): void => {
    renderCurrentHash()
  }

  return {
    start(): void {
      window.addEventListener('hashchange', handleHashChange)
      renderCurrentHash()
    },
    navigate(pathname: string, replace = false): void {
      const nextHash = pathToHash(pathname)

      if (replace) {
        const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`
        window.history.replaceState({}, '', nextUrl)
      } else {
        window.location.hash = nextHash
      }

      renderCurrentHash()
    },
    dispose(): void {
      window.removeEventListener('hashchange', handleHashChange)
    },
  }
}
