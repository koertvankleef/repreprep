import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import { equipmentValues, exerciseCategories } from '../domain/exercise-metadata.ts'
import type { Equipment, ExerciseCategory } from '../domain/types.ts'
import type { ExerciseFilters } from '../domain/exercise-service.ts'
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

type DisplayPreferenceChangeDetail = {
  preference: 'theme' | 'contrast'
  value: string
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
  | { name: 'settings-appearance' }

type RouteTransition = 'none' | 'sub-forward' | 'sub-back' | 'main-switch'

type RouteHeader = {
  className?: string
  html: string
  secondaryClassName?: string
  secondaryHtml?: string
  bind?: (header: HTMLElement) => void
}

type ExerciseCatalogueElement = HTMLElement & {
  searchQuery: string
  filters: ExerciseFilters
  focusedExerciseId: string | null
  setSearchAndFilters?: (searchQuery: string, filters: ExerciseFilters) => void
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
  private shellRendered = false
  private exerciseSearchQuery = ''
  private exerciseFiltersOpen = false
  private exerciseFilters: ExerciseFilters = { categories: [], equipment: [] }
  private exerciseCatalogueFocusedId: string | null = null
  private exerciseSearchDebounceId: number | null = null
  private exerciseFilterRailController: AbortController | null = null
  private exerciseFilterRailResizeObserver: ResizeObserver | null = null
  private currentRouteView: HTMLElement | null = null
  private readonly router = createHashRouter({
    routes: appRoutes,
    notFoundRouteId: 'workouts',
    onRouteChange: (match) => {
      const route = this.toRoute(match)
      if (route.name === 'exercise-detail') {
        this.exerciseCatalogueFocusedId = route.exerciseId
      }
      this.route = route
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

  private readonly handleDisplayPreferenceChange = (event: Event): void => {
    const { preference, value } = (event as CustomEvent<DisplayPreferenceChangeDetail>).detail

    if (preference === 'theme' && (value === 'light' || value === 'dark' || value === 'auto')) {
      this.setThemeMode(value)
      return
    }

    if (preference === 'contrast' && (value === 'normal' || value === 'high')) {
      this.setContrastMode(value)
    }
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

    if (action === 'open-settings') {
      window.location.hash = '/settings'
      return
    }

    if (action === 'toggle-exercise-filters') {
      this.exerciseFiltersOpen = !this.exerciseFiltersOpen
      this.render()
      return
    }

    if (action === 'toggle-exercise-filter') {
      this.toggleExerciseFilter(actionTarget)
      return
    }

    if (action === 'clear-exercise-filters') {
      this.exerciseFilters = { categories: [], equipment: [] }
      this.exerciseFiltersOpen = false
      this.syncExerciseCatalogueState()
      this.render()
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

  private toggleExerciseFilter(target: HTMLElement): void {
    const filterType = target.dataset.filterType
    const value = target.dataset.filterValue

    if (!value) {
      return
    }

    if (filterType === 'category') {
      this.exerciseFilters = {
        ...this.exerciseFilters,
        categories: toggleArrayValue(this.exerciseFilters.categories, value as ExerciseCategory),
      }
      this.syncExerciseCatalogueState()
      this.render()
      return
    }

    if (filterType === 'equipment') {
      this.exerciseFilters = {
        ...this.exerciseFilters,
        equipment: toggleArrayValue(this.exerciseFilters.equipment, value as Equipment),
      }
      this.syncExerciseCatalogueState()
      this.render()
    }
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
    this.shadowRoot?.addEventListener('rrr-display-preference-change', this.handleDisplayPreferenceChange as EventListener)
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (this.isStandalone) {
      this.installAvailable = false
    }
    this.render()
    this.router.start()
  }

  disconnectedCallback(): void {
    if (this.exerciseSearchDebounceId !== null) {
      window.clearTimeout(this.exerciseSearchDebounceId)
      this.exerciseSearchDebounceId = null
    }
    this.clearExerciseFilterRailBinding()
    this.stopWatchingSystemThemePreference?.()
    this.stopWatchingSystemThemePreference = null
    window.removeEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.removeEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.removeEventListener('click', this.handleClick)
    this.shadowRoot?.removeEventListener('rrr-clear-data-request', this.handleClearDataRequest as EventListener)
    this.shadowRoot?.removeEventListener('rrr-display-preference-change', this.handleDisplayPreferenceChange as EventListener)
    this.router.dispose()
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

    if (match.route.id === 'settings-appearance') {
      return { name: 'settings-appearance' }
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
    if (route.name === 'settings') return '#/workouts'
    if (route.name === 'settings-appearance') return '#/settings'
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
      || route.name === 'settings-appearance'
    ) {
      return route.name === 'settings-appearance' ? 2 : 1
    }

    return 0
  }

  private isMainRoute(route: Route): boolean {
    return route.name === 'workouts' || route.name === 'routines' || route.name === 'exercises' || route.name === 'history'
  }

  private getRouteSurface(route: Route): 'full' | 'padded' {
    return route.name === 'exercises' ? 'full' : 'padded'
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

  private restoreRouteScrollPosition(): void {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
  }

  private cloneExerciseFilters(): ExerciseFilters {
    return {
      categories: [...this.exerciseFilters.categories],
      equipment: [...this.exerciseFilters.equipment],
    }
  }

  private getExerciseCatalogueView(): ExerciseCatalogueElement | null {
    const mountedCatalogue = this.shadowRoot?.querySelector<ExerciseCatalogueElement>(
      '#view > rrr-exercise-catalogue.route-view-current',
    )

    if (mountedCatalogue) {
      return mountedCatalogue
    }

    return this.currentRouteView?.tagName.toLowerCase() === 'rrr-exercise-catalogue'
      ? this.currentRouteView as ExerciseCatalogueElement
      : null
  }

  private syncExerciseCatalogueState(): void {
    const catalogue = this.getExerciseCatalogueView()

    if (!catalogue) {
      return
    }

    const filters = this.cloneExerciseFilters()

    if (catalogue.setSearchAndFilters) {
      catalogue.setSearchAndFilters(this.exerciseSearchQuery, filters)
      return
    }

    catalogue.searchQuery = this.exerciseSearchQuery
    catalogue.filters = filters
  }

  private syncHeaderHeight(): void {
    const header = this.shadowRoot?.querySelector<HTMLElement>('.app-header')
    const primaryHeader = this.shadowRoot?.querySelector<HTMLElement>('.app-header-primary')
    if (!header) {
      return
    }

    requestAnimationFrame(() => {
      const height = header.getBoundingClientRect().height
      const primaryHeight = primaryHeader?.getBoundingClientRect().height ?? 0

      if (height > 0) {
        this.style.setProperty('--rrr-app-header-height', `${height}px`)
      }

      if (primaryHeight > 0) {
        this.style.setProperty('--rrr-app-header-primary-min-block-size', `${primaryHeight}px`)
      }
    })
  }

  private queueExerciseCatalogueSync(): void {
    if (this.exerciseSearchDebounceId !== null) {
      window.clearTimeout(this.exerciseSearchDebounceId)
    }

    this.exerciseSearchDebounceId = window.setTimeout(() => {
      this.exerciseSearchDebounceId = null
      this.syncExerciseCatalogueState()
    }, 150)
  }

  private flushExerciseCatalogueSync(): void {
    if (this.exerciseSearchDebounceId !== null) {
      window.clearTimeout(this.exerciseSearchDebounceId)
      this.exerciseSearchDebounceId = null
    }

    this.syncExerciseCatalogueState()
  }

  private clearExerciseFilterRailBinding(): void {
    this.exerciseFilterRailController?.abort()
    this.exerciseFilterRailController = null
    this.exerciseFilterRailResizeObserver?.disconnect()
    this.exerciseFilterRailResizeObserver = null
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
      const catalogue = document.createElement('rrr-exercise-catalogue') as ExerciseCatalogueElement
      const filters = this.cloneExerciseFilters()
      catalogue.focusedExerciseId = this.exerciseCatalogueFocusedId

      if (catalogue.setSearchAndFilters) {
        catalogue.setSearchAndFilters(this.exerciseSearchQuery, filters)
      } else {
        catalogue.searchQuery = this.exerciseSearchQuery
        catalogue.filters = filters
      }
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
      settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      return settingsEl
    }

    if (route.name === 'settings-appearance') {
      const appearanceEl = document.createElement('rrr-appearance-settings')
      appearanceEl.setAttribute('theme', this.displayPreferences.theme)
      appearanceEl.setAttribute('contrast', this.displayPreferences.contrast)
      return appearanceEl
    }

    return document.createElement('rrr-import-export')
  }

  private updateShellState(route: Route): void {
    const appHeader = this.shadowRoot?.querySelector<HTMLElement>('.app-header')
    const header = this.createRouteHeader(route)
    this.clearExerciseFilterRailBinding()
    const headerInner = this.shadowRoot?.querySelector<HTMLElement>('.app-header-primary')
    if (headerInner) {
      headerInner.className = ['app-header-primary', header.className].filter(Boolean).join(' ')
      headerInner.innerHTML = header.html
    }

    const secondaryHeader = this.shadowRoot?.querySelector<HTMLElement>('.app-header-secondary')
    if (secondaryHeader) {
      secondaryHeader.className = ['app-header-secondary', header.secondaryClassName].filter(Boolean).join(' ')
      secondaryHeader.hidden = !header.secondaryHtml
      secondaryHeader.innerHTML = header.secondaryHtml ?? ''
    }

    if (appHeader) {
      header.bind?.(appHeader)
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

    this.syncHeaderHeight()
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
            ${this.shouldShowInstallButton() ? `<rrr-button type="button" variant="outline" data-action="install-app">${t('app.action.install')}</rrr-button>` : ''}
          </div>
        </nav>
        <header class="app-header">
          <div class="app-header-primary"></div>
          <div class="app-header-secondary" hidden></div>
        </header>
        <main>
          <div id="view"></div>
        </main>
      </div>
    `

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

    if (route.name === 'settings-appearance') {
      return t('app.settings.appearance')
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
    const actionContent = route.name === 'workouts'
      ? `<rrr-button type="button" variant="ghost" tone="neutral" class="header-settings" data-action="open-settings" aria-label="${t('app.settings.title')}" title="${t('app.settings.title')}"><rrr-icon name="settings"></rrr-icon></rrr-button>`
      : '<span class="app-header-spacer" aria-hidden="true"></span>'

    return {
      className: 'app-header-primary-standard',
      html: `
        <div class="standard-app-header">
          ${backContent}
          <h1 class="app-header-title">${escapeHtml(this.getHeaderTitle(route))}</h1>
          ${actionContent}
        </div>
      `,
    }
  }

  private createExerciseCatalogueHeader(): RouteHeader {
    const hasActiveFilters = this.getActiveExerciseFilterCount() > 0
    const filterLabel = hasActiveFilters
      ? t('exercise.filter.openActive')
      : t('exercise.filter.open')
    const escapedFilterLabel = escapeHtml(filterLabel)

    return {
      className: 'app-header-primary-exercises',
      secondaryClassName: 'app-header-secondary-exercises',
      secondaryHtml: this.exerciseFiltersOpen ? this.renderExerciseFilterRail() : '',
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
        <rrr-button
          type="button"
          variant="ghost"
          tone="neutral"
          rounded
          class="exercise-filter-trigger"
          data-action="toggle-exercise-filters"
          data-has-active-filters="${hasActiveFilters}"
          aria-pressed="${this.exerciseFiltersOpen}"
          aria-label="${escapedFilterLabel}"
          title="${escapedFilterLabel}"
        ><rrr-icon name="filter"></rrr-icon></rrr-button>
        </div>
      `,
      bind: (header) => {
        const searchInput = header.querySelector<HTMLElement & { value: string }>('rrr-input[name="exercise-search"]')

        if (searchInput) {
          const syncSearchInput = (): void => {
            this.exerciseSearchQuery = searchInput.value
            this.queueExerciseCatalogueSync()
          }

          searchInput.addEventListener('input', syncSearchInput)
          searchInput.addEventListener('change', syncSearchInput)
          searchInput.addEventListener('keydown', (event) => {
            if (event instanceof KeyboardEvent && event.key === 'Enter') {
              this.exerciseSearchQuery = searchInput.value
              this.flushExerciseCatalogueSync()
            }
          })
        }

        this.bindExerciseFilterRail(header)
      },
    }
  }

  private renderExerciseFilterRail(): string {
    const hasActiveFilters = this.getActiveExerciseFilterCount() > 0

    return `
      <div class="exercise-filter-rows" aria-label="${t('exercise.filter.railLabel')}">
        ${this.renderExerciseFilterGroup(
          t('exercise.filter.category'),
          exerciseCategories,
          this.exerciseFilters.categories,
          'category',
          getExerciseCategoryLabel,
        )}
        ${this.renderExerciseFilterGroup(
          t('exercise.filter.equipment'),
          equipmentValues,
          this.exerciseFilters.equipment,
          'equipment',
          getEquipmentLabel,
        )}
        ${hasActiveFilters ? `
          <div class="exercise-filter-actions">
            <rrr-button type="button" size="s" rounded variant="ghost" data-action="clear-exercise-filters">
              ${t('exercise.filter.clear')}
            </rrr-button>
          </div>
        ` : ''}
      </div>
    `
  }

  private renderExerciseFilterGroup<T extends string>(
    label: string,
    values: readonly T[],
    selectedValues: readonly T[],
    filterType: 'category' | 'equipment',
    labelForValue: (value: T) => string,
  ): string {
    const selected = new Set(selectedValues)

    return `
      <div class="exercise-filter-row" role="group" aria-label="${escapeHtml(label)}">
        <span class="exercise-filter-group-label">${escapeHtml(label)}</span>
        <div class="exercise-filter-shell" data-overflow-left="false" data-overflow-right="false">
          <span class="exercise-filter-edge exercise-filter-edge-left" aria-hidden="true"></span>
          <div class="exercise-filter-rail" data-filter-rail>
            ${values.map((value) => {
              const active = selected.has(value)
              const buttonLabel = labelForValue(value)

              return `
                <rrr-button
                  type="button"
                  size="s"
                  rounded
                  ${active ? '' : 'variant="outline"'}
                  data-action="toggle-exercise-filter"
                  data-filter-type="${filterType}"
                  data-filter-value="${escapeHtml(value)}"
                  aria-pressed="${active}"
                >${escapeHtml(buttonLabel)}</rrr-button>
              `
            }).join('')}
          </div>
          <span class="exercise-filter-edge exercise-filter-edge-right" aria-hidden="true"></span>
        </div>
      </div>
    `
  }

  private bindExerciseFilterRail(header: HTMLElement): void {
    this.clearExerciseFilterRailBinding()

    const rails = [...header.querySelectorAll<HTMLElement>('[data-filter-rail]')]

    if (rails.length === 0) {
      return
    }

    const controller = new AbortController()
    this.exerciseFilterRailController = controller
    this.exerciseFilterRailResizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        updateFilterRailOverflow(entry.target as HTMLElement)
      })
    })

    rails.forEach((rail) => {
      const updateOverflow = (): void => {
        updateFilterRailOverflow(rail)
      }

      rail.addEventListener('scroll', updateOverflow, { passive: true, signal: controller.signal })
      this.exerciseFilterRailResizeObserver?.observe(rail)
      requestAnimationFrame(updateOverflow)
    })
  }

  private getActiveExerciseFilterCount(): number {
    return this.exerciseFilters.categories.length + this.exerciseFilters.equipment.length
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
      this.mountRouteView(route, this.computeRouteTransition(previousRoute, route))
      this.restoreRouteScrollPosition()
    }

    if (!routeChanged && route.name === 'settings') {
      const settingsEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-settings.route-view-current')
      if (settingsEl) {
        settingsEl.setAttribute('theme', this.displayPreferences.theme)
        settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      }
    }

    if (!routeChanged && route.name === 'settings-appearance') {
      const appearanceEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-appearance-settings.route-view-current')
      if (appearanceEl) {
        appearanceEl.setAttribute('theme', this.displayPreferences.theme)
        appearanceEl.setAttribute('contrast', this.displayPreferences.contrast)
      }
    }

    this.updateShellState(route)

    if (!routeChanged && route.name === 'exercises') {
      this.syncExerciseCatalogueState()
    }

    this.previousRoute = route
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getExerciseCategoryLabel(category: ExerciseCategory): string {
  return t(`exercise.category.${category}`)
}

function getEquipmentLabel(equipment: Equipment): string {
  return t(`exercise.equipment.${equipment}`)
}

function toggleArrayValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function updateFilterRailOverflow(rail: HTMLElement): void {
  const shell = rail.closest<HTMLElement>('.exercise-filter-shell')

  if (!shell) {
    return
  }

  const maxScrollLeft = rail.scrollWidth - rail.clientWidth
  shell.dataset.overflowLeft = String(rail.scrollLeft > 1)
  shell.dataset.overflowRight = String(rail.scrollLeft < maxScrollLeft - 1)
}

customElements.define('rrr-app', RrrApp)
