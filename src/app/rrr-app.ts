import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import {
  appRoutes,
  getAppRouteMeta,
  toAppRoute,
  type AppRoute,
} from './app-routes.ts'
import { computeRouteTransition, isSameAppRoute, type RouteTransition } from './app-route-transitions.ts'
import { createHashRouter } from '../foundation/hash-router.ts'
import { toastService } from '../foundation/toast.ts'
import {
  createAppRouteViewElement,
  type RoutineEditorElement,
  type RouteViewFactoryContext,
} from './app-route-view-factory.ts'
import {
  createStandardRouteHeader,
  renderPrimaryNavigation,
  syncPrimaryNavigationState,
  type RouteHeader,
} from './app-shell-navigation.ts'
import { ExerciseCatalogueController } from './exercise-catalogue-controller.ts'
import { dispatchAppShellAction, findActionTarget } from './app-shell-action-dispatch.ts'
import type { RrrExerciseCatalogue } from './components/exercises/rrr-exercise-catalogue.ts'
import {
  renderExerciseCatalogueHeader,
} from './exercise-catalogue-header.ts'
import { AppPreferencesController } from './app-preferences-controller.ts'
import { AppInstallPromptController } from './app-install-prompt-controller.ts'
import { AppResetController } from './app-reset-controller.ts'
import globalStyles from '../design-system/global.css?inline'
import appStyles from './rrr-app.css?inline'

const globalSheet = new CSSStyleSheet()
globalSheet.replaceSync(globalStyles)

const appSheet = new CSSStyleSheet()
appSheet.replaceSync(appStyles)

type DisplayPreferenceChangeDetail = {
  preference: 'theme' | 'contrast'
  value: string
}

type LanguagePreferenceChangeDetail = {
  language: string
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

export class RrrApp extends HTMLElement {
  private route: AppRoute = { name: 'workouts' }
  private previousRoute: AppRoute | null = null
  private readonly preferences = new AppPreferencesController()
  private readonly installPrompt = new AppInstallPromptController({
    devMode: import.meta.env.DEV,
    onChange: () => this.render(),
    onDevPromptUnavailable: () => toastService.info(t('app.install.devHint')),
  })
  private readonly resetController = new AppResetController({
    resetData: () => storageService.resetAllData(),
    resetPreferences: () => this.preferences.reset(),
    getHash: () => window.location.hash,
    setHash: (hash) => {
      window.location.hash = hash
    },
  })
  private readonly styleguideEnabled = import.meta.env.DEV || localHosts.has(window.location.hostname)
  private shellRendered = false
  private readonly exerciseCatalogueController = new ExerciseCatalogueController(
    () => this.render(),
    () => this.syncExerciseCatalogueState(),
  )
  private currentRouteView: HTMLElement | null = null
  private finishHeaderTransition: (() => void) | null = null
  private readonly router = createHashRouter({
    routes: appRoutes,
    notFoundRouteId: 'workouts',
    onRouteChange: (match) => {
      const route = toAppRoute(match, this.styleguideEnabled)
      this.exerciseCatalogueController.updateFocusedExercise(route)
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
    this.installPrompt.handlePromptAvailable(event)
  }

  private readonly handleAppInstalled = (): void => {
    this.installPrompt.handleAppInstalled()
  }

  private readonly handleClearDataRequest = (): void => {
    const resetResult = this.resetController.reset()
    toastService.success(t('app.settings.resetData.success'))

    if (resetResult.renderWorkoutsImmediately) {
      this.route = { name: 'workouts' }
      this.render()
    }
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
    const actionTarget = findActionTarget(event)
    if (!actionTarget) {
      return
    }

    dispatchAppShellAction(actionTarget, {
      navigate: (href) => {
        window.location.hash = href
      },
      installApp: () => {
        void this.installPrompt.prompt()
      },
      renameRoutine: () => {
        void this.renameCurrentRoutine()
      },
      toggleExerciseFilters: () => {
        this.exerciseCatalogueController.toggleFilters()
      },
      toggleExerciseFilter: (target) => {
        this.exerciseCatalogueController.toggleFilter(target)
      },
      clearExerciseFilters: () => {
        this.exerciseCatalogueController.clearFilters()
      },
    })
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
    this.shadowRoot?.addEventListener('rrr-clear-data-request', this.handleClearDataRequest)
    this.shadowRoot?.addEventListener('rrr-display-preference-change', this.handleDisplayPreferenceChange)
    this.shadowRoot?.addEventListener('rrr-language-preference-change', this.handleLanguagePreferenceChange)
    this.installPrompt.syncStandaloneDisplayMode()
    this.render()
    this.router.start()
  }

  disconnectedCallback(): void {
    this.exerciseCatalogueController.dispose()
    this.preferences.stop()
    window.removeEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.removeEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.removeEventListener('click', this.handleClick)
    this.shadowRoot?.removeEventListener('rrr-clear-data-request', this.handleClearDataRequest)
    this.shadowRoot?.removeEventListener('rrr-display-preference-change', this.handleDisplayPreferenceChange)
    this.shadowRoot?.removeEventListener('rrr-language-preference-change', this.handleLanguagePreferenceChange)
    this.router.dispose()
  }

  private shouldShowInstallButton(): boolean {
    return this.installPrompt.shouldShowInstallButton
  }

  private renderPrimaryNav(): string {
    return renderPrimaryNavigation(this.route)
  }

  private restoreRouteScrollPosition(): void {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
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

    const filters = this.exerciseCatalogueController.filters

    if (catalogue.setSearchAndFilters) {
      catalogue.setSearchAndFilters(this.exerciseCatalogueController.searchQuery, filters)
      return
    }

    catalogue.searchQuery = this.exerciseCatalogueController.searchQuery
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

  private createRouteViewElement(route: AppRoute): HTMLElement {
    return createAppRouteViewElement(route, this.getRouteViewFactoryContext())
  }

  private getRouteViewFactoryContext(): RouteViewFactoryContext {
    return {
      displayPreferences: this.preferences.displayPreferences,
      languagePreference: this.preferences.languagePreference,
      styleguideEnabled: this.styleguideEnabled,
      exerciseSearchQuery: this.exerciseCatalogueController.searchQuery,
      exerciseFilters: this.exerciseCatalogueController.filters,
      exerciseCatalogueFocusedId: this.exerciseCatalogueController.focusedId,
    }
  }

  private updateShellState(route: AppRoute, transition: RouteTransition = 'none'): void {
    const appHeader = this.shadowRoot?.querySelector<HTMLElement>('.app-header')
    const header = this.createRouteHeader(route)
    if (appHeader) {
      this.mountRouteHeader(appHeader, header, transition)
    }

    if (this.shadowRoot) {
      syncPrimaryNavigationState(this.shadowRoot, route)
    }

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
    this.exerciseCatalogueController.clearFilterRailBinding()
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

  private renderShell(): void {
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

  private createRouteHeader(route: AppRoute): RouteHeader {
    if (getAppRouteMeta(route).header === 'exercise-catalogue') {
      return this.createExerciseCatalogueHeader()
    }

    return this.createStandardHeader(route)
  }

  private createStandardHeader(route: AppRoute): RouteHeader {
    return createStandardRouteHeader(route, this.getHeaderTitle(route))
  }

  private createExerciseCatalogueHeader(): RouteHeader {
    const header = renderExerciseCatalogueHeader({
      filtersOpen: this.exerciseCatalogueController.filtersOpen,
      searchQuery: this.exerciseCatalogueController.searchQuery,
      filters: this.exerciseCatalogueController.filters,
    })

    return {
      ...header,
      bind: (primaryHeader, secondaryHeader) => {
        const searchInput = primaryHeader.querySelector<HTMLElement & { value: string }>('rrr-input[name="exercise-search"]')

        if (searchInput) {
          const syncSearchInput = (): void => {
            this.exerciseCatalogueController.handleSearchInputChange(searchInput.value)
          }

          searchInput.addEventListener('input', syncSearchInput)
          searchInput.addEventListener('change', syncSearchInput)
          searchInput.addEventListener('keydown', (event) => {
            if (event instanceof KeyboardEvent && event.key === 'Enter') {
              this.exerciseCatalogueController.handleSearchInputConfirm(searchInput.value)
            }
          })
        }

        this.exerciseCatalogueController.bindFilterRail(secondaryHeader)
      },
    }
  }

  private render(): void {
    const route = this.route
    if (!this.shadowRoot) {
      return
    }

    if (!this.shellRendered) {
      this.renderShell()
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

customElements.define('rrr-app', RrrApp)
