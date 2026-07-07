import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import type { Equipment, ExerciseCategory } from '../domain/types.ts'
import type { ExerciseFilters } from '../domain/exercise-service.ts'
import {
  appRoutes,
  getAppRouteBackHref,
  getAppRouteEndLink,
  getAppRouteMeta,
  toAppRoute,
  type AppNavId,
  type AppRoute,
  type AppHeaderLink,
} from './app-routes.ts'
import { computeRouteTransition, isSameAppRoute, type RouteTransition } from './app-route-transitions.ts'
import { createHashRouter } from '../foundation/hash-router.ts'
import { toastService } from '../foundation/toast.ts'
import type { LanguagePreference } from './language-preferences.ts'
import { escapeHtml } from './render-helpers.ts'
import {
  createAppRouteViewElement,
  type RoutineEditorElement,
  type RouteViewFactoryContext,
} from './app-route-view-factory.ts'
import type { RrrExerciseCatalogue } from './components/exercises/rrr-exercise-catalogue.ts'
import {
  renderExerciseCatalogueHeader,
  updateExerciseFilterRailOverflow,
} from './exercise-catalogue-header.ts'
import { AppPreferencesController } from './app-preferences-controller.ts'
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

type LanguagePreferenceChangeDetail = {
  language: string
}

type RouteHeader = {
  className?: string
  html: string
  secondaryClassName?: string
  secondaryHtml?: string
  bind?: (primaryHeader: HTMLElement, secondaryHeader: HTMLElement) => void
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
const primaryNavigationItems: ReadonlyArray<{
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

export class RrrApp extends HTMLElement {
  private route: AppRoute = { name: 'workouts' }
  private previousRoute: AppRoute | null = null
  private readonly preferences = new AppPreferencesController()
  private installPromptEvent: BeforeInstallPromptEvent | null = null
  private installAvailable = false
  private isStandalone = window.matchMedia('(display-mode: standalone)').matches
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
  private finishHeaderTransition: (() => void) | null = null
  private readonly router = createHashRouter({
    routes: appRoutes,
    notFoundRouteId: 'workouts',
    onRouteChange: (match) => {
      const route = toAppRoute(match, this.styleguideEnabled)
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
    this.preferences.reset()
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
      if (this.preferences.setThemeMode(value)) {
        this.render()
      }
      return
    }

    if (preference === 'contrast' && (value === 'normal' || value === 'high')) {
      if (this.preferences.setContrastMode(value)) {
        this.render()
      }
    }
  }

  private readonly handleLanguagePreferenceChange = (event: Event): void => {
    const { language } = (event as CustomEvent<LanguagePreferenceChangeDetail>).detail
    if (language !== 'auto' && language !== 'en-US' && language !== 'nl-NL') {
      return
    }

    if (this.preferences.setLanguagePreference(language)) {
      this.render()
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

    if (action === 'navigate') {
      const href = actionTarget.dataset.href
      if (href) {
        window.location.hash = href
      }
      return
    }

    if (action === 'install-app') {
      void this.promptInstall()
      return
    }

    if (action === 'rename-routine') {
      void this.renameCurrentRoutine()
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

  private async renameCurrentRoutine(): Promise<void> {
    if (
      this.route.name !== 'routine-detail'
      && this.route.name !== 'routine-new'
    ) {
      return
    }

    const editor = this.currentRouteView as RoutineEditorElement | null
    if (!editor || typeof editor.openRenameSheet !== 'function') {
      return
    }

    if (await editor.openRenameSheet()) {
      this.updateShellState(this.route)
    }
  }

  connectedCallback(): void {
    void storageService.getData()
    this.preferences.start()
    window.addEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.addEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.addEventListener('click', this.handleClick)
    this.shadowRoot?.addEventListener('rrr-clear-data-request', this.handleClearDataRequest as EventListener)
    this.shadowRoot?.addEventListener('rrr-display-preference-change', this.handleDisplayPreferenceChange as EventListener)
    this.shadowRoot?.addEventListener('rrr-language-preference-change', this.handleLanguagePreferenceChange as EventListener)
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
    this.preferences.stop()
    window.removeEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.removeEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.removeEventListener('click', this.handleClick)
    this.shadowRoot?.removeEventListener('rrr-clear-data-request', this.handleClearDataRequest as EventListener)
    this.shadowRoot?.removeEventListener('rrr-display-preference-change', this.handleDisplayPreferenceChange as EventListener)
    this.shadowRoot?.removeEventListener('rrr-language-preference-change', this.handleLanguagePreferenceChange as EventListener)
    this.router.dispose()
  }

  private shouldShowInstallButton(): boolean {
    if (this.isStandalone) {
      return false
    }

    return import.meta.env.DEV || this.installAvailable
  }

  private renderNavButton(routeName: AppNavId, href: string, label: string, iconName: string): string {
    const isActive = getAppRouteMeta(this.route).nav === routeName
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

  private renderPrimaryNav(): string {
    return primaryNavigationItems
      .map((item) => this.renderNavButton(item.routeName, item.href, t(item.labelKey), item.iconName))
      .join('')
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

  private getExerciseCatalogueView(): RrrExerciseCatalogue | null {
    const mountedCatalogue = this.shadowRoot?.querySelector<RrrExerciseCatalogue>(
      '#view > rrr-exercise-catalogue.route-view-current',
    )

    if (mountedCatalogue) {
      return mountedCatalogue
    }

    return this.currentRouteView?.tagName.toLowerCase() === 'rrr-exercise-catalogue'
      ? this.currentRouteView as RrrExerciseCatalogue
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

  private createRouteViewElement(route: AppRoute): HTMLElement {
    return createAppRouteViewElement(route, this.getRouteViewFactoryContext())
  }

  private getRouteViewFactoryContext(): RouteViewFactoryContext {
    return {
      displayPreferences: this.preferences.displayPreferences,
      languagePreference: this.preferences.languagePreference,
      styleguideEnabled: this.styleguideEnabled,
      exerciseSearchQuery: this.exerciseSearchQuery,
      exerciseFilters: this.cloneExerciseFilters(),
      exerciseCatalogueFocusedId: this.exerciseCatalogueFocusedId,
    }
  }

  private updateShellState(route: AppRoute, transition: RouteTransition = 'none'): void {
    const appHeader = this.shadowRoot?.querySelector<HTMLElement>('.app-header')
    const header = this.createRouteHeader(route)
    if (appHeader) {
      this.mountRouteHeader(appHeader, header, transition)
    }

    const navButtons = this.shadowRoot?.querySelectorAll<HTMLButtonElement>(
      '.primary-nav .nav-button[data-route-name]',
    )
    navButtons?.forEach((button) => {
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

    const installButton = this.shadowRoot?.querySelector<HTMLElement>('[data-action="install-app"]')
    if (installButton) {
      installButton.textContent = t('app.action.install')
    }

  }

  private mountRouteHeader(
    appHeader: HTMLElement,
    header: RouteHeader,
    transition: RouteTransition,
  ): void {
    const primaryHost = appHeader.querySelector<HTMLElement>('.app-header-primary')
    const secondaryHost = appHeader.querySelector<HTMLElement>('.app-header-secondary')
    if (!primaryHost || !secondaryHost) {
      return
    }

    this.finishHeaderTransition?.()
    this.clearExerciseFilterRailBinding()
    this.finishHeaderTransition?.()
    this.finishHeaderTransition = null

    const currentPrimary = primaryHost.querySelector<HTMLElement>(':scope > .route-header-layer-current')
    const currentSecondary = secondaryHost.querySelector<HTMLElement>(':scope > .route-header-layer-current')
    const nextPrimary = this.createHeaderLayer(header.html, header.className)
    const nextSecondary = this.createHeaderLayer(header.secondaryHtml ?? '', header.secondaryClassName)
    nextPrimary.classList.add('route-header-layer-current')
    nextSecondary.classList.add('route-header-layer-current')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!currentPrimary || transition === 'none' || reduceMotion) {
      primaryHost.replaceChildren(nextPrimary)
      secondaryHost.replaceChildren(nextSecondary)
      secondaryHost.hidden = !header.secondaryHtml
      header.bind?.(nextPrimary, nextSecondary)
      this.syncHeaderHeight()
      return
    }

    currentPrimary.classList.remove('route-header-layer-current')
    currentPrimary.classList.add(`route-header-layer-exit-${transition}`)
    currentPrimary.inert = true
    currentPrimary.setAttribute('aria-hidden', 'true')
    nextPrimary.classList.add(`route-header-layer-enter-${transition}`)
    primaryHost.append(nextPrimary)

    if (currentSecondary) {
      currentSecondary.classList.remove('route-header-layer-current')
      currentSecondary.classList.add(`route-header-layer-exit-${transition}`)
      currentSecondary.inert = true
      currentSecondary.setAttribute('aria-hidden', 'true')
    }
    nextSecondary.classList.add(`route-header-layer-enter-${transition}`)
    secondaryHost.hidden = false
    secondaryHost.append(nextSecondary)
    appHeader.classList.add('is-transitioning')
    header.bind?.(nextPrimary, nextSecondary)

    let finished = false
    const finish = (): void => {
      if (finished) {
        return
      }

      finished = true
      currentPrimary.remove()
      currentSecondary?.remove()
      nextPrimary.classList.remove(`route-header-layer-enter-${transition}`)
      nextSecondary.classList.remove(`route-header-layer-enter-${transition}`)
      appHeader.classList.remove('is-transitioning')
      secondaryHost.hidden = !header.secondaryHtml
      this.finishHeaderTransition = null
      this.syncHeaderHeight()
    }

    this.finishHeaderTransition = finish
    nextPrimary.addEventListener('animationend', finish, { once: true })
    this.syncHeaderHeight()
  }

  private createHeaderLayer(html: string, className?: string): HTMLElement {
    const layer = document.createElement('div')
    layer.className = ['route-header-layer', className].filter(Boolean).join(' ')
    layer.innerHTML = html
    return layer
  }

  private mountRouteView(route: AppRoute, transition: RouteTransition): void {
    const viewHost = this.shadowRoot?.querySelector<HTMLElement>('#view')
    if (!viewHost) {
      return
    }

    const currentView = viewHost.querySelector<HTMLElement>('.route-view-current')
    const nextView = this.createRouteViewElement(route)
    nextView.classList.add('route-view', `route-view-${getAppRouteMeta(route).surface}`, 'route-view-current')
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

  private renderShell(route: AppRoute): void {
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

  private getHeaderTitle(route: AppRoute): string {
    if (route.name === 'routine-new') {
      const editorName = this.currentRouteView?.tagName.toLowerCase() === 'rrr-routine-editor'
        ? (this.currentRouteView as RoutineEditorElement).getCurrentName?.().trim()
        : undefined
      if (editorName) {
        return t('app.header.routineCreatingNamed', { name: editorName })
      }

      return t('app.header.routineCreating')
    }

    if (route.name === 'routine-detail') {
      const routineName = storageService
        .getData()
        .routines.find((routine) => routine.id === route.routineId)?.name

      if (routineName) {
        return routineName
      }

      return t(getAppRouteMeta(route).titleKey)
    }

    if (route.name === 'exercise-detail') {
      const exerciseName = storageService
        .getData()
        .exercises.find((exercise) => exercise.id === route.exerciseId)?.name

      return exerciseName ?? t(getAppRouteMeta(route).titleKey)
    }

    return t(getAppRouteMeta(route).titleKey)
  }

  private renderHeaderButton(link: AppHeaderLink, className: string): string {
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

  private renderRoutineRenameButton(): string {
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

  private createRouteHeader(route: AppRoute): RouteHeader {
    if (getAppRouteMeta(route).header === 'exercise-catalogue') {
      return this.createExerciseCatalogueHeader()
    }

    return this.createStandardHeader(route)
  }

  private createStandardHeader(route: AppRoute): RouteHeader {
    const backHref = getAppRouteBackHref(route)
    const endLink = getAppRouteEndLink(route)
    const backContent = backHref
      ? this.renderHeaderButton({
          href: backHref,
          icon: 'arrow-left',
          labelKey: 'app.settings.back',
        }, 'header-back')
      : '<span class="app-header-spacer" aria-hidden="true"></span>'
    const actionContent = (
      route.name === 'routine-detail'
      || route.name === 'routine-new'
    )
      ? this.renderRoutineRenameButton()
      : endLink
        ? this.renderHeaderButton(endLink, 'header-action')
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
    const header = renderExerciseCatalogueHeader({
      filtersOpen: this.exerciseFiltersOpen,
      searchQuery: this.exerciseSearchQuery,
      filters: this.exerciseFilters,
    })

    return {
      ...header,
      bind: (primaryHeader, secondaryHeader) => {
        const searchInput = primaryHeader.querySelector<HTMLElement & { value: string }>('rrr-input[name="exercise-search"]')

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

        this.bindExerciseFilterRail(secondaryHeader)
      },
    }
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
        updateExerciseFilterRailOverflow(entry.target as HTMLElement)
      })
    })

    rails.forEach((rail) => {
      const updateOverflow = (): void => {
        updateExerciseFilterRailOverflow(rail)
      }

      rail.addEventListener('scroll', updateOverflow, { passive: true, signal: controller.signal })
      this.exerciseFilterRailResizeObserver?.observe(rail)
      requestAnimationFrame(updateOverflow)
    })
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
    const routeChanged = !previousRoute || !isSameAppRoute(previousRoute, route)
    const transition = routeChanged
      ? computeRouteTransition(previousRoute, route)
      : 'none'

    if (routeChanged) {
      this.mountRouteView(route, transition)
      this.restoreRouteScrollPosition()
    }

    if (!routeChanged && route.name === 'settings') {
      const settingsEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-settings.route-view-current')
      if (settingsEl) {
        settingsEl.setAttribute('theme', this.preferences.displayPreferences.theme)
        settingsEl.setAttribute('language', this.preferences.languagePreference)
        settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      }
    }

    if (!routeChanged && route.name === 'settings-appearance') {
      const appearanceEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-appearance-settings.route-view-current')
      if (appearanceEl) {
        appearanceEl.setAttribute('theme', this.preferences.displayPreferences.theme)
        appearanceEl.setAttribute('contrast', this.preferences.displayPreferences.contrast)
      }
    }

    if (!routeChanged && route.name === 'settings-language') {
      const languageEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-language-settings.route-view-current')
      if (languageEl) {
        languageEl.setAttribute('language', this.preferences.languagePreference)
      }
    }

    this.updateShellState(route, transition)

    if (!routeChanged && route.name === 'exercises') {
      this.syncExerciseCatalogueState()
    }

    this.previousRoute = route
  }
}

function toggleArrayValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

customElements.define('rrr-app', RrrApp)
