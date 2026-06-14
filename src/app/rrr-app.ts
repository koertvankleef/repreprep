import { storageService } from './storage-instance.ts'
import { t } from '../i18n/index.ts'
import { shadowTypographyStyles } from '../styles/shadow-styles.ts'
import { appRoutes, type AppRouteMeta } from '../domain/routes.ts'
import { createHashRouter, type HashRouteMatch } from '../foundation/hash-router.ts'
import appStyles from './rrr-app.css?inline'

const styles = `${shadowTypographyStyles}\n${appStyles}`

type Route =
  | { name: 'workouts' }
  | { name: 'workout-edit'; workoutId: string }
  | { name: 'exercises' }
  | { name: 'history' }
  | { name: 'import-export' }
  | { name: 'routines' }
  | { name: 'routine-new' }
  | { name: 'routine-edit'; routineId: string }

export class RrrApp extends HTMLElement {
  private route: Route = { name: 'workouts' }
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

  connectedCallback(): void {
    void storageService.getData()
    this.router.start()
  }

  disconnectedCallback(): void {
    this.router.dispose()
  }

  private toRoute(match: HashRouteMatch<AppRouteMeta>): Route {
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

    return { name: 'workouts' }
  }

  private linkClass(routeName: Route['name'], current: Route['name']): string {
    if (routeName === current) return 'active'
    if (routeName === 'routines' && (current === 'routine-new' || current === 'routine-edit')) return 'active'
    return ''
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
          <a class="${this.linkClass('workouts', route.name)}" href="#/workouts">${t('app.nav.workouts')}</a>
          <a class="${this.linkClass('routines', route.name)}" href="#/routines">${t('app.nav.routines')}</a>
          <a class="${this.linkClass('exercises', route.name)}" href="#/exercises">${t('app.nav.exercises')}</a>
          <a class="${this.linkClass('history', route.name)}" href="#/history">${t('app.nav.history')}</a>
          <a class="${this.linkClass('import-export', route.name)}" href="#/import-export">${t('app.nav.importExport')}</a>
        </nav>
        <main>
          <div id="view"></div>
        </main>
      </div>
    `

    const view = this.shadowRoot.querySelector<HTMLDivElement>('#view')

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

    view.append(document.createElement('rrr-import-export'))
  }
}

customElements.define('rrr-app', RrrApp)
