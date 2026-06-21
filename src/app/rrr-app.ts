import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import { shadowTypographyStyles } from '../design-system/shadow-styles.ts'
import { appRoutes, type AppRouteMeta } from '../domain/routes.ts'
import { createHashRouter, type HashRouteMatch } from '../foundation/hash-router.ts'
import { toastService } from '../foundation/toast.ts'
import {
  applyDisplayPreferences,
  loadDisplayPreferences,
  saveDisplayPreferences,
  watchSystemThemePreference,
  type ContrastMode,
  type DisplayPreferences,
  type ThemeMode,
} from './theme-preferences.ts'
import appStyles from './rrr-app.css?inline'

const styles = `${shadowTypographyStyles}\n${appStyles}`

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
  | { name: 'history' }
  | { name: 'import-export' }
  | { name: 'routines' }
  | { name: 'routine-new' }
  | { name: 'routine-edit'; routineId: string }
  | { name: 'styleguide' }
  | { name: 'settings' }

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

export class RrrApp extends HTMLElement {
  private route: Route = { name: 'workouts' }
  private displayPreferences: DisplayPreferences = loadDisplayPreferences()
  private installPromptEvent: BeforeInstallPromptEvent | null = null
  private installAvailable = false
  private isStandalone = window.matchMedia('(display-mode: standalone)').matches
  private stopWatchingSystemThemePreference: (() => void) | null = null
  private readonly styleguideEnabled = import.meta.env.DEV || localHosts.has(window.location.hostname)
  private optionsPanelOpen = false
  private settingsReturnHash = '#/workouts'
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
    this.attachShadow({ mode: 'open' })
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
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (this.isStandalone) {
      this.installAvailable = false
    }
    this.router.start()
  }

  disconnectedCallback(): void {
    this.stopWatchingSystemThemePreference?.()
    this.stopWatchingSystemThemePreference = null
    window.removeEventListener('beforeinstallprompt', this.handleInstallPromptAvailable)
    window.removeEventListener('appinstalled', this.handleAppInstalled)
    this.shadowRoot?.removeEventListener('click', this.handleClick)
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
    return ''
  }

  private getBackHref(): string | null {
    const route = this.route
    if (route.name === 'settings') return this.settingsReturnHash
    if (route.name === 'workout-edit') return '#/workouts'
    if (route.name === 'workout-log') return '#/workouts'
    if (route.name === 'routine-new') return '#/routines'
    if (route.name === 'routine-edit') return '#/routines'
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
      <a class="${activeClass}" href="${href}"${ariaCurrent}>
        <rrr-icon name="${iconName}"></rrr-icon>
        <span>${label}</span>
      </a>
    `
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    const route = this.route

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="shell">
        <nav>
          <div class="primary-nav">
            ${this.renderNavLink('workouts', '#/workouts', t('app.nav.today'), 'calendar-date')}
            ${this.renderNavLink('routines', '#/routines', t('app.nav.routines'), 'clipboard')}
            ${this.renderNavLink('exercises', '#/exercises', t('app.nav.exercises'), 'compose')}
            ${this.renderNavLink('history', '#/history', t('app.nav.history'), 'data-trending')}
          </div>
          <div class="nav-utilities">
            ${this.renderThemeControls()}
            ${this.shouldShowInstallButton() ? `<rrr-button type="button" variant="outline" data-action="install-app">${t('app.action.install')}</rrr-button>` : ''}
          </div>
        </nav>
        <header class="app-header">
          <rrr-button type="button" variant="ghost" class="header-back" data-action="navigate-back" aria-label="${t('app.settings.back')}" aria-hidden="${this.getBackHref() === null ? 'true' : 'false'}" ${this.getBackHref() === null ? 'tabindex="-1"' : ''}><rrr-icon name="arrow-left"></rrr-icon></rrr-button>
          <rrr-button type="button" variant="ghost" class="options-trigger" data-action="open-options" aria-label="${t('app.header.options')}" title="${t('app.header.options')}"><rrr-icon name="more-vertical"></rrr-icon></rrr-button>
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

    const view = this.shadowRoot.querySelector<HTMLDivElement>('#view')

    const panel = this.shadowRoot.querySelector<HTMLDialogElement>('.options-panel')
    if (panel) {
      panel.addEventListener('close', () => {
        this.optionsPanelOpen = false
      }, { once: true })
      if (this.optionsPanelOpen) {
        panel.showModal()
      }
    }

    if (!view) {
      return
    }

    if (route.name === 'workouts') {
      view.append(document.createElement('rrr-workout-list'))
      return
    }

    if (route.name === 'workout-edit') {
      const editor = document.createElement('rrr-workout-editor') as HTMLElement & { workoutId: string | null }
      editor.workoutId = route.workoutId
      view.append(editor)
      return
    }

    if (route.name === 'workout-log') {
      const logger = document.createElement('rrr-workout-logging') as HTMLElement & { workoutId: string | null }
      logger.workoutId = route.workoutId
      view.append(logger)
      return
    }

    if (route.name === 'exercises') {
      view.append(document.createElement('rrr-exercise-catalogue'))
      return
    }

    if (route.name === 'history') {
      view.append(document.createElement('rrr-exercise-history'))
      return
    }

    if (route.name === 'routines') {
      view.append(document.createElement('rrr-routine-list'))
      return
    }

    if (route.name === 'routine-new') {
      view.append(document.createElement('rrr-routine-editor'))
      return
    }

    if (route.name === 'routine-edit') {
      const editor = document.createElement('rrr-routine-editor') as HTMLElement & { routineId: string | null }
      editor.routineId = route.routineId
      view.append(editor)
      return
    }

    if (route.name === 'styleguide') {
      view.append(document.createElement('rrr-styleguide'))
      return
    }

    if (route.name === 'settings') {
      const settingsEl = document.createElement('rrr-settings')
      settingsEl.setAttribute('theme', this.displayPreferences.theme)
      settingsEl.setAttribute('contrast', this.displayPreferences.contrast)
      settingsEl.setAttribute('styleguide-enabled', this.styleguideEnabled ? 'true' : 'false')
      view.append(settingsEl)
      return
    }

    view.append(document.createElement('rrr-import-export'))
  }
}

customElements.define('rrr-app', RrrApp)
