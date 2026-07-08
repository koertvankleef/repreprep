import { t } from '../i18n/index.ts'
import { escapeHtml } from './render-helpers.ts'
import {
  getAppRouteBackHref,
  getAppRouteEndLink,
  getAppRouteMeta,
  type AppHeaderLink,
  type AppNavId,
  type AppRoute,
} from './app-routes.ts'

export type RouteHeader = {
  className?: string
  html: string
  secondaryClassName?: string
  secondaryHtml?: string
  bind?: (primaryHeader: HTMLElement, secondaryHeader: HTMLElement) => void
}

export const primaryNavigationItems: ReadonlyArray<{
  routeName: AppNavId
  href: string
  labelKey: string
  iconName: string
}> = [
  { routeName: 'workouts', href: '#/workouts', labelKey: 'app.nav.today', iconName: 'calendar-date' },
  { routeName: 'routines', href: '#/routines', labelKey: 'app.nav.routines', iconName: 'clipboard-task-list-ltr' },
  { routeName: 'exercises', href: '#/exercises', labelKey: 'app.nav.exercises', iconName: 'library' },
  { routeName: 'history', href: '#/history', labelKey: 'app.nav.history', iconName: 'data-trending' },
]

function renderNavButton(route: AppRoute, routeName: AppNavId, href: string, label: string, iconName: string): string {
  const isActive = getAppRouteMeta(route).nav === routeName
  const activeClass = isActive ? 'nav-button active' : 'nav-button'
  const ariaCurrent = isActive ? ' aria-current="page"' : ''

  return `
      <button
        type="button"
        class="${activeClass}"
        data-action="navigate"
        data-href="${href}"
        data-route-name="${routeName}"
        ${ariaCurrent}
      >
        <rrr-icon name="${iconName}"></rrr-icon>
        <span>${label}</span>
      </button>
    `
}

export function renderPrimaryNavigation(route: AppRoute): string {
  return primaryNavigationItems
    .map((item) => renderNavButton(route, item.routeName, item.href, t(item.labelKey), item.iconName))
    .join('')
}

export function syncPrimaryNavigationState(root: ParentNode, route: AppRoute): void {
  const navButtons = root.querySelectorAll<HTMLButtonElement>(
    '.primary-nav .nav-button[data-route-name]',
  )
  navButtons.forEach((button) => {
    const routeName = button.dataset.routeName as AppNavId | undefined
    if (!routeName) {
      return
    }

    const isActive = getAppRouteMeta(route).nav === routeName
    button.classList.toggle('active', isActive)
    const item = primaryNavigationItems.find((candidate) => candidate.routeName === routeName)
    const label = button.querySelector<HTMLElement>('span')
    if (item && label) {
      label.textContent = t(item.labelKey)
    }
    if (isActive) {
      button.setAttribute('aria-current', 'page')
    } else {
      button.removeAttribute('aria-current')
    }
  })
}

function renderHeaderButton(link: AppHeaderLink, className: string): string {
  const label = escapeHtml(t(link.labelKey))

  return `
      <button
        type="button"
        class="header-icon-button ${className}"
        data-action="navigate"
        data-href="${escapeHtml(link.href)}"
        aria-label="${label}"
        title="${label}"
      ><rrr-icon name="${escapeHtml(link.icon)}"></rrr-icon></button>
    `
}

function renderRoutineRenameButton(): string {
  const label = escapeHtml(t('routineEditor.action.rename'))

  return `
      <button
        type="button"
        class="header-icon-button header-action"
        data-action="rename-routine"
        aria-label="${label}"
        title="${label}"
      ><rrr-icon name="rename"></rrr-icon></button>
    `
}

export function createStandardRouteHeader(route: AppRoute, title: string): RouteHeader {
  const backHref = getAppRouteBackHref(route)
  const endLink = getAppRouteEndLink(route)
  const backContent = backHref
    ? renderHeaderButton({
        href: backHref,
        icon: 'arrow-left',
        labelKey: 'app.settings.back',
      }, 'header-back')
    : '<span class="app-header-spacer" aria-hidden="true"></span>'
  const actionContent = (
    route.name === 'routine-detail'
    || route.name === 'routine-new'
  )
    ? renderRoutineRenameButton()
    : endLink
      ? renderHeaderButton(endLink, 'header-action')
      : '<span class="app-header-spacer" aria-hidden="true"></span>'

  return {
    className: 'app-header-primary-standard',
    html: `
        <div class="standard-app-header">
          ${backContent}
          <h1 class="app-header-title">${escapeHtml(title)}</h1>
          ${actionContent}
        </div>
      `,
  }
}
