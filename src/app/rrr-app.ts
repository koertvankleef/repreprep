import { storageService } from './storage-instance.ts'
import { shadowTypographyStyles } from '../styles/shadow-styles.ts'

const styles = `
  ${shadowTypographyStyles}

  :host {
    min-height: 100vh;
  }

  .shell {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 100vh;
  }

  nav {
    display: flex;
    gap: var(--rrr-space-sm);
    padding: var(--rrr-space-md);
    background: var(--rrr-color-surface);
    border-bottom: 1px solid var(--rrr-color-border);
    flex-wrap: wrap;
  }

  nav a {
    padding: var(--rrr-space-sm) var(--rrr-space-md);
    border-radius: var(--rrr-radius-md);
    text-decoration: none;
  }

  nav a.active {
    background: var(--rrr-color-primary);
    color: var(--rrr-color-primary-contrast);
  }

  main {
    padding: var(--rrr-space-lg);
    max-width: 72rem;
    width: 100%;
    margin: 0 auto;
  }
`

type Route =
  | { name: 'workouts' }
  | { name: 'workout-new' }
  | { name: 'workout-edit'; workoutId: string }
  | { name: 'exercises' }
  | { name: 'history' }
  | { name: 'import-export' }
  | { name: 'routines' }
  | { name: 'routine-new' }
  | { name: 'routine-edit'; routineId: string }

export class RrrApp extends HTMLElement {
  private readonly handleRouteChange = (): void => {
    const hash = window.location.hash

    if (!hash || hash === '#' || hash === '#/') {
      window.location.hash = '#/workouts'
      return
    }

    if (hash === '#/workouts/new') {
      window.location.hash = '#/workouts'
      return
    }

    this.render()
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    void storageService.getData()
    window.addEventListener('hashchange', this.handleRouteChange)
    window.addEventListener('load', this.handleRouteChange)
    this.handleRouteChange()
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.handleRouteChange)
    window.removeEventListener('load', this.handleRouteChange)
  }

  private getRoute(): Route {
    const hash = window.location.hash

    if (hash === '#/workouts' || hash === '#/') {
      return { name: 'workouts' }
    }

    if (hash === '#/workouts/new') {
      return { name: 'workout-new' }
    }

    if (hash.startsWith('#/workouts/')) {
      return { name: 'workout-edit', workoutId: hash.replace('#/workouts/', '') }
    }

    if (hash === '#/exercises') {
      return { name: 'exercises' }
    }

    if (hash === '#/history') {
      return { name: 'history' }
    }

    if (hash === '#/import-export') {
      return { name: 'import-export' }
    }

    if (hash === '#/routines') {
      return { name: 'routines' }
    }

    if (hash === '#/routines/new') {
      return { name: 'routine-new' }
    }

    if (hash.startsWith('#/routines/')) {
      return { name: 'routine-edit', routineId: hash.replace('#/routines/', '') }
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

    const route = this.getRoute()

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="shell">
        <nav>
          <a class="${this.linkClass('workouts', route.name)}" href="#/workouts">Workouts</a>
          <a class="${this.linkClass('routines', route.name)}" href="#/routines">Routines</a>
          <a class="${this.linkClass('exercises', route.name)}" href="#/exercises">Exercises</a>
          <a class="${this.linkClass('history', route.name)}" href="#/history">History</a>
          <a class="${this.linkClass('import-export', route.name)}" href="#/import-export">Import/Export</a>
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

    if (route.name === 'workout-new') {
      view.append(document.createElement('rrr-workout-editor'))
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
