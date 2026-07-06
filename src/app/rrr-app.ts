import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import { equipmentValues, exerciseCategories } from '../domain/exercise-metadata.ts'
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
import { createHashRouter } from '../foundation/hash-router.ts'
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
import {
  applyLanguagePreference,
  clearLanguagePreference,
  loadLanguagePreference,
  saveLanguagePreference,
  type LanguagePreference,
} from './language-preferences.ts'
import { getEquipmentLabel, getExerciseCategoryLabel } from './exercise-labels.ts'
import { escapeHtml } from './render-helpers.ts'
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

type RouteTransition = 'none' | 'sub-forward' | 'sub-back' | 'main-switch'

type RouteHeader = {
  className?: string
  html: string
  secondaryClassName?: string
  secondaryHtml?: string
  bind?: (primaryHeader: HTMLElement, secondaryHeader: HTMLElement) => void
}

type ExerciseCatalogueElement = HTMLElement & {
  searchQuery: string
  filters: ExerciseFilters
  focusedExerciseId: string | null
  setSearchAndFilters?: (searchQuery: string, filters: ExerciseFilters) => void
}

type RoutineEditorElement = HTMLElement & {
  openRenameSheet(): Promise<boolean>
  getCurrentName?(): string
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
  private displayPreferences: DisplayPreferences = loadDisplayPreferences()
  private languagePreference: LanguagePreference = loadLanguagePreference()
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
    clearDisplayPreferences()
    clearLanguagePreference()
    this.displayPreferences = loadDisplayPreferences()
    this.languagePreference = loadLanguagePreference()
    applyDisplayPreferences(this.displayPreferences)
    applyLanguagePreference(this.languagePreference)
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

  private readonly handleLanguagePreferenceChange = (event: Event): void => {
    const { language } = (event as CustomEvent<LanguagePreferenceChangeDetail>).detail
    if (language !== 'auto' && language !== 'en-US' && language !== 'nl-NL') {
      return
    }

    if (this.languagePreference === language) {
      return
    }

    this.languagePreference = language
    applyLanguagePreference(language)
    saveLanguagePreference(language)
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
    applyDisplayPreferences(this.displayPreferences)
    applyLanguagePreference(this.languagePreference)
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
    this.stopWatchingSystemThemePreference?.()
    this.stopWatchingSystemThemePreference = null
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

  private computeRouteTransition(from: AppRoute | null, to: AppRoute): RouteTransition {
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

  private isSameRoute(a: AppRoute, b: AppRoute): boolean {
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

  private createRouteViewElement(route: AppRoute): HTMLElement {
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
      const editor = document.createElement('rrr-routine-editor') as RoutineEditorElement
      return editor
    }

    if (route.name === 'routine-detail') {
      const detail = document.createElement('rrr-routine-detail') as HTMLElement & { routineId: string | null }
      detail.routineId = route.routineId
      return detail
    }

    if (route.name === 'settings-styleguide') {
      return document.createElement('rrr-styleguide')
    }

    if (route.name === 'settings-import-export') {
      return document.createElement('rrr-import-export')
    }

    if (route.name === 'settings') {
      const settingsEl = document.createElement('rrr-settings')
      settingsEl.setAttribute('theme', this.displayPreferences.theme)
      settingsEl.setAttribute('language', this.languagePreference)
      settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      return settingsEl
    }

    if (route.name === 'settings-appearance') {
      const appearanceEl = document.createElement('rrr-appearance-settings')
      appearanceEl.setAttribute('theme', this.displayPreferences.theme)
      appearanceEl.setAttribute('contrast', this.displayPreferences.contrast)
      return appearanceEl
    }

    if (route.name === 'settings-language') {
      const languageEl = document.createElement('rrr-language-settings')
      languageEl.setAttribute('language', this.languagePreference)
      return languageEl
    }

    /* TODO ! default to an error toast and returning to home/Today page */
    return document.createElement('rrr-import-export')
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
    const transition = routeChanged
      ? this.computeRouteTransition(previousRoute, route)
      : 'none'

    if (routeChanged) {
      this.mountRouteView(route, transition)
      this.restoreRouteScrollPosition()
    }

    if (!routeChanged && route.name === 'settings') {
      const settingsEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-settings.route-view-current')
      if (settingsEl) {
        settingsEl.setAttribute('theme', this.displayPreferences.theme)
        settingsEl.setAttribute('language', this.languagePreference)
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

    if (!routeChanged && route.name === 'settings-language') {
      const languageEl = this.shadowRoot.querySelector<HTMLElement>('#view > rrr-language-settings.route-view-current')
      if (languageEl) {
        languageEl.setAttribute('language', this.languagePreference)
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
