import { storageService } from './storage-instance.ts'

const styles = `
  :host {
    display: block;
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

export class RrrApp extends HTMLElement {
  private readonly handleRouteChange = (): void => {
    const hash = window.location.hash

    if (!hash || hash === '#' || hash === '#/') {
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

    return { name: 'workouts' }
  }

  private linkClass(routeName: Route['name'], current: Route['name']): string {
    return routeName === current ? 'active' : ''
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

    view.append(document.createElement('rrr-import-export'))
  }
}

customElements.define('rrr-app', RrrApp)
