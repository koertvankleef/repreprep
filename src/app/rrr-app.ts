import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import { appRoutes, type AppRouteMeta } from '../domain/routes.ts'
import { createHashRouter, type HashRouteMatch } from '../foundation/hash-router.ts'
import { toastService } from '../foundation/toast.ts'
import {
  applyDisplayPreferences,
  clearDisplayPreferences,
  loadDisplayPreferences,
  saveDisplayPreferences,
  watchSystemThemePreference,
  type ContrastMode,
  type DisplayPreferences,
  type ThemeMode,
} from './theme-preferences.ts'
import globalStyles from '../design-system/global.css?inline'
import appStyles from './rrr-app.css?inline'

const globalSheet = new CSSStyleSheet()
globalSheet.replaceSync(globalStyles)

const appSheet = new CSSStyleSheet()
appSheet.replaceSync(appStyles)

type InstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => unknown
  userChoice: unknown
}

type Route =
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

type RouteTransition = 'none' | 'sub-forward' | 'sub-back' | 'main-switch'

type RouteHeader = {
  className?: string
  html: string
  bind?: (header: HTMLElement) => void
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

export class RrrApp extends HTMLElement {
  private route: Route = { name: 'workouts' }
  private previousRoute: Route | null = null
  private displayPreferences: DisplayPreferences = loadDisplayPreferences()
  private installPromptEvent: BeforeInstallPromptEvent | null = null
  private installAvailable = false
  private isStandalone = window.matchMedia('(display-mode: standalone)').matches
  private stopWatchingSystemThemePreference: (() => void) | null = null
  private readonly styleguideEnabled = import.meta.env.DEV || localHosts.has(window.location.hostname)
  private optionsPanelOpen = false
  private shellRendered = false
  private settingsReturnHash = '#/workouts'
  private exerciseSearchQuery = ''
  private exerciseCatalogueScrollY = 0
  private currentRouteView: HTMLElement | null = null
  private readonly router = createHashRouter({
    routes: appRoutes,
    notFoundRouteId: 'workouts',
    onRouteChange: (match) => {
      this.route = this.toRoute(match)
      this.render()
    },
  })

  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.adoptedStyleSheets = [globalSheet, appSheet]
  }

  private readonly handleInstallPromptAvailable = (event: Event): void => {
    event.preventDefault()
    this.installPromptEvent = event as BeforeInstallPromptEvent
    this.installAvailable = true
    this.render()
  }

  private readonly handleAppInstalled = (): void => {
    this.installPromptEvent = null
    this.installAvailable = false
    this.isStandalone = true
    this.render()
  }

  private readonly handleClearDataRequest = (): void => {
    storageService.resetAllData()
    clearDisplayPreferences()
    this.displayPreferences = loadDisplayPreferences()
    applyDisplayPreferences(this.displayPreferences)
    toastService.success(t('app.settings.resetData.success'))

    if (window.location.hash !== '#/workouts') {
      window.location.hash = '/workouts'
      return
    }

    this.route = { name: 'workouts' }
    this.render()
  }

  private readonly handleClick = (event: Event): void => {
    const actionTarget = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)

    if (!actionTarget) {
      return
    }

    const action = actionTarget.dataset.action

    if (action === 'install-app') {
      void this.promptInstall()
      return
    }

    if (action === 'theme-light') {
      this.setThemeMode('light')
      return
    }

    if (action === 'theme-dark') {
      this.setThemeMode('dark')
      return
    }

    if (action === 'theme-auto') {
      this.setThemeMode('auto')
      return
    }

    if (action === 'contrast-normal') {
      this.setContrastMode('normal')
      return
    }

    if (action === 'contrast-high') {
      this.setContrastMode('high')
    }

    if (action === 'open-options') {
      this.optionsPanelOpen = true
      this.render()
      return
    }

    if (action === 'close-options') {
      this.shadowRoot?.querySelector<HTMLDialogElement>('.options-panel')?.close()
      this.optionsPanelOpen = false
      return
    }

    if (action === 'open-settings') {
      this.settingsReturnHash = window.location.hash || '#/workouts'
      this.shadowRoot?.querySelector<HTMLDialogElement>('.options-panel')?.close()
      this.optionsPanelOpen = false
      window.location.hash = '/settings'
      return
    }

    if (action === 'navigate-back') {
      const href = this.getBackHref()
      if (href) {
        window.location.hash = href.replace(/^#/, '')
      }
      return
    }
  }

  private setThemeMode(theme: ThemeMode): void {
    if (this.displayPreferences.theme === theme) {
      return
    }

    this.displayPreferences = {
      ...this.displayPreferences,
      theme,
    }

    this.applyAndPersistDisplayPreferences()
    this.render()
  }

  private setContrastMode(contrast: ContrastMode): void {
    if (this.displayPreferences.contrast === contrast) {
      return
    }

    this.displayPreferences = {
      ...this.displayPreferences,
      contrast,
    }

    this.applyAndPersistDisplayPreferences()
    this.render()
  }

  private applyAndPersistDisplayPreferences(): void {
    applyDisplayPreferences(this.displayPreferences)
    saveDisplayPreferences(this.displayPreferences)
  }

  private async promptInstall(): Promise<void> {
    const promptEvent = this.installPromptEvent
    if (!promptEvent) {
      if (import.meta.env.DEV) {
        toastService.info(t('app.install.devHint'))
      }
      return
    }

    this.installAvailable = false
    this.render()

    await promptEvent.prompt()
    const choice = (await promptEvent.userChoice) as InstallPromptChoice
    this.installPromptEvent = null

    if (choice.outcome !== 'accepted') {
      this.installAvailable = false
    }

    this.render()
  }

  connectedCallback(): void {
    void storageService.getData()
    applyDisplayPreferences(this.displayPreferences)
    this.stopWatchingSystemThemePreference = watchSystemThemePreference(() => {
      if (this.displayPreferences.theme !== 'auto') {
        return
      }

      applyDisplayPreferences(this.displayPreferences)
    })
    window.addEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.addEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.addEventListener('click', this.handleClick)
    this.shadowRoot?.addEventListener('rrr-clear-data-request', this.handleClearDataRequest as EventListener)
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (this.isStandalone) {
      this.installAvailable = false
    }
    this.render()
    this.router.start()
  }

  disconnectedCallback(): void {
    this.stopWatchingSystemThemePreference?.()
    this.stopWatchingSystemThemePreference = null
    window.removeEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.removeEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.removeEventListener('click', this.handleClick)
    this.shadowRoot?.removeEventListener('rrr-clear-data-request', this.handleClearDataRequest as EventListener)
    this.router.dispose()
  }

  private renderThemeControls(): string {
    const theme = this.displayPreferences.theme

    return `
      <div class="nav-controls" aria-label="${t('app.theme.controls')}" role="group">
        <div class="nav-control-group" aria-label="${t('app.theme.mode')}" role="group">
          <rrr-tooltip><rrr-button
            type="button"
            variant="ghost"
            data-action="theme-light"
            aria-pressed="${theme === 'light'}"
            aria-label="${t('app.theme.light')}"
            title="${t('app.theme.light')}"
          ><rrr-icon name="weather-sunny"></rrr-icon></rrr-button></rrr-tooltip>
          <rrr-tooltip><rrr-button
            type="button"
            variant="ghost"
            data-action="theme-dark"
            aria-pressed="${theme === 'dark'}"
            aria-label="${t('app.theme.dark')}"
            title="${t('app.theme.dark')}"
          ><rrr-icon name="weather-moon"></rrr-icon></rrr-button></rrr-tooltip>
          <rrr-tooltip><rrr-button
            type="button"
            variant="ghost"
            data-action="theme-auto"
            aria-pressed="${theme === 'auto'}"
            aria-label="${t('app.theme.auto')}"
            title="${t('app.theme.auto')}"
          ><rrr-icon name="arrow-sync"></rrr-icon></rrr-button></rrr-tooltip>
        </div>
      </div>
    `
  }

  private toRoute(match: HashRouteMatch<AppRouteMeta>): Route {
    if (match.route.id === 'workout-log') {
      return { name: 'workout-log', workoutId: match.params.workoutId ?? '' }
    }

    if (match.route.id === 'workout-edit') {
      return { name: 'workout-edit', workoutId: match.params.workoutId ?? '' }
    }

    if (match.route.id === 'routine-edit') {
      return { name: 'routine-edit', routineId: match.params.routineId ?? '' }
    }

    if (match.route.id === 'routine-new') {
      return { name: 'routine-new' }
    }

    if (match.route.id === 'routines') {
      return { name: 'routines' }
    }

    if (match.route.id === 'exercises') {
      return { name: 'exercises' }
    }

    if (match.route.id === 'exercise-detail') {
      return { name: 'exercise-detail', exerciseId: match.params.exerciseId ?? '' }
    }

    if (match.route.id === 'history') {
      return { name: 'history' }
    }

    if (match.route.id === 'import-export') {
      return { name: 'import-export' }
    }

    if (match.route.id === 'styleguide' && this.styleguideEnabled) {
      return { name: 'styleguide' }
    }

    if (match.route.id === 'settings') {
      return { name: 'settings' }
    }

    return { name: 'workouts' }
  }

  private linkClass(routeName: Route['name'], current: Route['name']): string {
    if (routeName === current) return 'active'
    if (routeName === 'routines' && (current === 'routine-new' || current === 'routine-edit')) return 'active'
    if (routeName === 'exercises' && current === 'exercise-detail') return 'active'
    return ''
  }

  private getBackHref(): string | null {
    const route = this.route
    if (route.name === 'settings') return this.settingsReturnHash
    if (route.name === 'workout-edit') return '#/workouts'
    if (route.name === 'workout-log') return '#/workouts'
    if (route.name === 'routine-new') return '#/routines'
    if (route.name === 'routine-edit') return '#/routines'
    if (route.name === 'exercise-detail') return '#/exercises'
    return null
  }

  private shouldShowInstallButton(): boolean {
    if (this.isStandalone) {
      return false
    }

    return import.meta.env.DEV || this.installAvailable
  }

  private renderOptionsPanelContent(route: Route): string {
    const items: string[] = []

    items.push(`
      <section class="options-panel-section">
        <h2 class="options-panel-section-title">${t('app.settings.display')}</h2>
        ${this.renderThemeControls()}
      </section>
    `)

    // Settings is available from every screen
    items.push(`
      <rrr-button type="button" variant="ghost" class="options-menu-item" data-action="open-settings">
        <rrr-icon name="settings"></rrr-icon>
        <span>${t('app.options.settings')}</span>
      </rrr-button>
    `)

    void route // future: add per-route contextual items here

    return items.join('')
  }

  private renderNavLink(routeName: Route['name'], href: string, label: string, iconName: string): string {
    const linkStateClass = this.linkClass(routeName, this.route.name)
    const activeClass = linkStateClass ? 'nav-link active' : 'nav-link'
    const ariaCurrent = linkStateClass ? ' aria-current="page"' : ''

    return `
      <a class="${activeClass}" data-route-name="${routeName}" href="${href}"${ariaCurrent}>
        <rrr-icon name="${iconName}"></rrr-icon>
        <span>${label}</span>
      </a>
    `
  }

  private renderPrimaryNav(): string {
    return `
      ${this.renderNavLink('workouts', '#/workouts', t('app.nav.today'), 'calendar-date')}
      ${this.renderNavLink('routines', '#/routines', t('app.nav.routines'), 'clipboard')}
      ${this.renderNavLink('exercises', '#/exercises', t('app.nav.exercises'), 'compose')}
      ${this.renderNavLink('history', '#/history', t('app.nav.history'), 'data-trending')}
    `
  }

  private routeDepth(route: Route): number {
    if (
      route.name === 'workout-edit'
      || route.name === 'workout-log'
      || route.name === 'routine-new'
      || route.name === 'routine-edit'
      || route.name === 'exercise-detail'
      || route.name === 'settings'
    ) {
      return 1
    }

    return 0
  }

  private isMainRoute(route: Route): boolean {
    return route.name === 'workouts' || route.name === 'routines' || route.name === 'exercises' || route.name === 'history'
  }

  private getRouteSurface(route: Route): 'full' | 'padded' {
    // return route.name === 'exercises' ? 'full' : 'padded'
    return 'padded'
  }

  private computeRouteTransition(from: Route | null, to: Route): RouteTransition {
    if (!from || from.name === to.name) {
      return 'none'
    }

    if (this.isMainRoute(from) && this.isMainRoute(to)) {
      return 'main-switch'
    }

    const fromDepth = this.routeDepth(from)
    const toDepth = this.routeDepth(to)

    if (toDepth > fromDepth) {
      return 'sub-forward'
    }

    if (toDepth < fromDepth) {
      return 'sub-back'
    }

    return 'sub-forward'
  }

  private isSameRoute(a: Route, b: Route): boolean {
    if (a.name !== b.name) {
      return false
    }

    if (a.name === 'workout-edit' && b.name === 'workout-edit') {
      return a.workoutId === b.workoutId
    }

    if (a.name === 'workout-log' && b.name === 'workout-log') {
      return a.workoutId === b.workoutId
    }

    if (a.name === 'routine-edit' && b.name === 'routine-edit') {
      return a.routineId === b.routineId
    }

    if (a.name === 'exercise-detail' && b.name === 'exercise-detail') {
      return a.exerciseId === b.exerciseId
    }

    return true
  }

  private captureRouteState(route: Route | null): void {
    if (route?.name === 'exercises') {
      this.exerciseCatalogueScrollY = window.scrollY
    }
  }

  private restoreRouteScrollPosition(route: Route): void {
    const top = route.name === 'exercises' ? this.exerciseCatalogueScrollY : 0

    requestAnimationFrame(() => {
      window.scrollTo(0, top)
    })
  }

  private createRouteViewElement(route: Route): HTMLElement {
    if (route.name === 'workouts') {
      return document.createElement('rrr-workout-list')
    }

    if (route.name === 'workout-edit') {
      const editor = document.createElement('rrr-workout-editor') as HTMLElement & { workoutId: string | null }
      editor.workoutId = route.workoutId
      return editor
    }

    if (route.name === 'workout-log') {
      const logger = document.createElement('rrr-workout-logging') as HTMLElement & { workoutId: string | null }
      logger.workoutId = route.workoutId
      return logger
    }

    if (route.name === 'exercises') {
      const catalogue = document.createElement('rrr-exercise-catalogue') as HTMLElement & { searchQuery: string }
      catalogue.searchQuery = this.exerciseSearchQuery
      return catalogue
    }

    if (route.name === 'exercise-detail') {
      const detail = document.createElement('rrr-exercise-detail') as HTMLElement & { exerciseId: string | null }
      detail.exerciseId = route.exerciseId
      return detail
    }

    if (route.name === 'history') {
      return document.createElement('rrr-exercise-history')
    }

    if (route.name === 'routines') {
      return document.createElement('rrr-routine-list')
    }

    if (route.name === 'routine-new') {
      return document.createElement('rrr-routine-editor')
    }

    if (route.name === 'routine-edit') {
      const editor = document.createElement('rrr-routine-editor') as HTMLElement & { routineId: string | null }
      editor.routineId = route.routineId
      return editor
    }

    if (route.name === 'styleguide') {
      return document.createElement('rrr-styleguide')
    }

    if (route.name === 'settings') {
      const settingsEl = document.createElement('rrr-settings')
      settingsEl.setAttribute('theme', this.displayPreferences.theme)
      settingsEl.setAttribute('contrast', this.displayPreferences.contrast)
      settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      return settingsEl
    }

    return document.createElement('rrr-import-export')
  }

  private updateShellState(route: Route): void {
    const headerInner = this.shadowRoot?.querySelector<HTMLElement>('.app-header-primary')
    if (headerInner) {
      const header = this.createRouteHeader(route)
      headerInner.className = ['app-header-primary', header.className].filter(Boolean).join(' ')
      headerInner.innerHTML = header.html
      header.bind?.(headerInner)
    }

    const links = this.shadowRoot?.querySelectorAll<HTMLAnchorElement>('.primary-nav .nav-link[data-route-name]')
    links?.forEach((link) => {
      const routeName = link.dataset.routeName as Route['name'] | undefined
      if (!routeName) {
        return
      }

      const isActive = this.linkClass(routeName, route.name) !== ''
      link.classList.toggle('active', isActive)
      if (isActive) {
        link.setAttribute('aria-current', 'page')
      } else {
        link.removeAttribute('aria-current')
      }
    })

    const optionsBody = this.shadowRoot?.querySelector<HTMLElement>('.options-panel-body')
    if (optionsBody) {
      optionsBody.innerHTML = this.renderOptionsPanelContent(route)
    }
  }

  private mountRouteView(route: Route, transition: RouteTransition): void {
    const viewHost = this.shadowRoot?.querySelector<HTMLElement>('#view')
    if (!viewHost) {
      return
    }

    const currentView = viewHost.querySelector<HTMLElement>('.route-view-current')
    const nextView = this.createRouteViewElement(route)
    nextView.classList.add('route-view', `route-view-${this.getRouteSurface(route)}`, 'route-view-current')
    this.currentRouteView = nextView

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!currentView || transition === 'none' || reduceMotion) {
      viewHost.replaceChildren(nextView)
      return
    }

    currentView.classList.remove('route-view-current')
    currentView.classList.add(`route-view-exit-${transition}`)
    nextView.classList.add(`route-view-enter-${transition}`)
    viewHost.classList.add('is-transitioning')
    viewHost.append(nextView)

    const finish = (): void => {
      currentView.remove()
      nextView.classList.remove(`route-view-enter-${transition}`)
      viewHost.classList.remove('is-transitioning')
    }

    nextView.addEventListener('animationend', finish, { once: true })
  }

  private renderShell(route: Route): void {
    if (!this.shadowRoot) {
      return
    }

    this.shadowRoot.innerHTML = `
      <div class="shell">
        <nav>
          <div class="primary-nav">
            ${this.renderPrimaryNav()}
          </div>
          <div class="nav-utilities">
            ${this.renderThemeControls()}
            ${this.shouldShowInstallButton() ? `<rrr-button type="button" variant="outline" data-action="install-app">${t('app.action.install')}</rrr-button>` : ''}
          </div>
        </nav>
        <header class="app-header">
          <div class="app-header-primary"></div>
        </header>
        <main>
          <div id="view"></div>
        </main>
        <dialog class="options-panel" aria-label="${t('app.options.title')}">
          <header class="options-panel-header">
            <span class="options-panel-title">${t('app.options.title')}</span>
            <rrr-button type="button" variant="ghost" data-action="close-options" aria-label="${t('app.options.close')}" title="${t('app.options.close')}"><rrr-icon name="dismiss"></rrr-icon></rrr-button>
          </header>
          <div class="options-panel-body">
            ${this.renderOptionsPanelContent(route)}
          </div>
        </dialog>
      </div>
    `

    const panel = this.shadowRoot.querySelector<HTMLDialogElement>('.options-panel')
    if (panel) {
      panel.addEventListener('close', () => {
        this.optionsPanelOpen = false
      })
    }

    this.shellRendered = true
  }

  private getHeaderTitle(route: Route): string {
    if (route.name === 'workouts') {
      return t('app.nav.today')
    }

    if (route.name === 'workout-edit') {
      return t('app.header.workoutEdit')
    }

    if (route.name === 'workout-log') {
      return t('app.header.workoutLog')
    }

    if (route.name === 'routines') {
      return t('app.nav.routines')
    }

    if (route.name === 'routine-new') {
      return t('app.header.routineNew')
    }

    if (route.name === 'routine-edit') {
      const routineName = storageService
        .getData()
        .routines.find((routine) => routine.id === route.routineId)?.name

      if (routineName) {
        return t('app.header.routineEditNamed', { name: routineName })
      }

      return t('app.header.routineEdit')
    }

    if (route.name === 'exercises') {
      return t('app.nav.exercises')
    }

    if (route.name === 'exercise-detail') {
      const exerciseName = storageService
        .getData()
        .exercises.find((exercise) => exercise.id === route.exerciseId)?.name

      return exerciseName ?? t('exercise.detail.notFoundTitle')
    }

    if (route.name === 'history') {
      return t('app.nav.history')
    }

    if (route.name === 'import-export') {
      return t('app.nav.importExport')
    }

    if (route.name === 'styleguide') {
      return t('app.nav.styleguide')
    }

    if (route.name === 'settings') {
      return t('app.settings.title')
    }

    return ''
  }

  private createRouteHeader(route: Route): RouteHeader {
    if (route.name === 'exercises') {
      return this.createExerciseCatalogueHeader()
    }

    return this.createStandardHeader(route)
  }

  private createStandardHeader(route: Route): RouteHeader {
    const backHref = this.getBackHref()
    const backContent = backHref
      ? `<rrr-button type="button" variant="ghost" tone="neutral" class="header-back" data-action="navigate-back" aria-label="${t('app.settings.back')}"><rrr-icon name="arrow-left"></rrr-icon></rrr-button>`
      : '<span class="app-header-spacer" aria-hidden="true"></span>'

    return {
      className: 'app-header-primary-standard',
      html: `
        <div class="standard-app-header">
          ${backContent}
          <h1 class="app-header-title">${escapeHtml(this.getHeaderTitle(route))}</h1>
          <rrr-button type="button" variant="ghost" tone="neutral" class="options-trigger" data-action="open-options" aria-label="${t('app.header.options')}" title="${t('app.header.options')}"><rrr-icon name="more-vertical"></rrr-icon></rrr-button>
        </div>
      `,
    }
  }

  private createExerciseCatalogueHeader(): RouteHeader {
    const catalogue = this.currentRouteView?.tagName.toLowerCase() === 'rrr-exercise-catalogue'
      ? this.currentRouteView as HTMLElement & { searchQuery: string }
      : null

    return {
      className: 'app-header-primary-exercises',
      html: `
        <div class="exercise-app-header">
        <rrr-input
          class="app-header-search"
          variant="outline"
          tone="neutral"
          rounded
          type="search"
          name="exercise-search"
          aria-label="${t('exercise.search.label')}"
          placeholder="${t('exercise.search.placeholder')}"
          value="${escapeHtml(this.exerciseSearchQuery)}"
        >
          <rrr-icon slot="start" name="search"></rrr-icon>
        </rrr-input>
        <rrr-button type="button" variant="ghost" tone="neutral" rounded data-action="open-filter" aria-label="${t('exercise.filter.open')}" title="${t('exercise.filter.open')}"><rrr-icon name="filter"></rrr-icon></rrr-button>
        </div>
      `,
      bind: (header) => {
        const searchInput = header.querySelector<HTMLElement & { value: string }>('rrr-input[name="exercise-search"]')

        searchInput?.addEventListener('input', () => {
          this.exerciseSearchQuery = searchInput.value

          if (catalogue) {
            catalogue.searchQuery = this.exerciseSearchQuery
          }
        })
      },
    }
  }

  private render(): void {
    const route = this.route
    if (!this.shadowRoot) {
      return
    }

    if (!this.shellRendered) {
      this.renderShell(route)
      this.mountRouteView(route, 'none')
      this.updateShellState(route)
      this.previousRoute = route
      return
    }

    const previousRoute = this.previousRoute
    const routeChanged = !previousRoute || !this.isSameRoute(previousRoute, route)

    if (routeChanged) {
      this.captureRouteState(previousRoute)
      this.mountRouteView(route, this.computeRouteTransition(previousRoute, route))
      this.restoreRouteScrollPosition(route)
    }

    if (!routeChanged && route.name === 'settings') {
      const settingsEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-settings.route-view-current')
      if (settingsEl) {
        settingsEl.setAttribute('theme', this.displayPreferences.theme)
        settingsEl.setAttribute('contrast', this.displayPreferences.contrast)
        settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      }
    }

    this.updateShellState(route)
    this.previousRoute = route

    const panel = this.shadowRoot.querySelector<HTMLDialogElement>('.options-panel')
    if (panel && this.optionsPanelOpen && !panel.open) {
      panel.showModal()
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-app', RrrApp)
