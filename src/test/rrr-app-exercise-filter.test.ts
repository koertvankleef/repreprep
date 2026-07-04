import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterExercises, searchExercises } from '../domain/exercise-service.ts'
import { saveLanguagePreference } from '../app/language-preferences.ts'

type StylesheetHost = (Document | ShadowRoot) & {
  __adoptedStyleSheets?: CSSStyleSheet[]
}

function installConstructableStylesheetShim(): void {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      value: () => {},
    })
  }

  const descriptor = {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      return (this as StylesheetHost).__adoptedStyleSheets ?? []
    },
    set(this: Document | ShadowRoot, value: CSSStyleSheet[]): void {
      ;(this as StylesheetHost).__adoptedStyleSheets = value
    },
  }

  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', descriptor)
  }

  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', descriptor)
  }
}

function installBrowserApiShims(): void {
  installConstructableStylesheetShim()

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: () => {},
  })

  vi.stubGlobal('SVGSymbolElement', SVGElement)
  vi.stubGlobal('ResizeObserver', class ResizeObserver {
    observe(): void {}
    disconnect(): void {}
  })
}

function getNativeInput(input: Element | null): HTMLInputElement {
  const nativeInput = input?.shadowRoot?.querySelector<HTMLInputElement>('input')

  if (!nativeInput) {
    throw new Error('Expected rrr-input to expose a native input in its shadow root')
  }

  return nativeInput
}

async function waitForAnimationFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

describe('rrr-app exercise filters', () => {
  beforeAll(async () => {
    installBrowserApiShims()

    const { registerDesignSystemComponents } = await import('../design-system/components/register.ts')
    await import('../app/register-app-components.ts')

    registerDesignSystemComponents()
  })

  beforeEach(async () => {
    document.body.innerHTML = ''
    localStorage.clear()
    window.location.hash = '#/exercises'

    const { storageService } = await import('../app/storage-instance.ts')
    storageService.resetAllData()
  })

  it('shows route-specific header actions and preserves their navigation', () => {
    window.location.hash = '#/workouts'
    const app = document.createElement('rrr-app')
    document.body.append(app)

    expect(app.shadowRoot?.querySelectorAll('.primary-nav button.nav-button')).toHaveLength(4)
    expect(app.shadowRoot?.querySelector('.primary-nav a')).toBeNull()

    const settingsButton = app.shadowRoot?.querySelector<HTMLButtonElement>(
      'button.header-action[data-href="#/settings"]',
    )

    expect(settingsButton).toBeTruthy()
    expect(settingsButton?.querySelector('rrr-icon')?.getAttribute('name')).toBe('settings')
    expect(app.shadowRoot?.querySelector('.options-panel')).toBeNull()

    settingsButton?.click()
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(window.location.hash).toBe('#/settings')
    expect(app.shadowRoot?.querySelector('.route-header-layer-current button.header-action')).toBeNull()

    const backButton = app.shadowRoot?.querySelector<HTMLButtonElement>(
      '.route-header-layer-current button.header-back[data-href="#/workouts"]',
    )
    expect(backButton).toBeTruthy()

    backButton?.click()
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(window.location.hash).toBe('#/workouts')
    expect(app.shadowRoot?.querySelector(
      '.route-header-layer-current button.header-action[data-href="#/settings"]',
    )).toBeTruthy()

    window.location.hash = '#/routines'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(app.shadowRoot?.querySelector(
      '.route-header-layer-current button.header-action[data-href="#/settings"]',
    )).toBeNull()

    const newRoutineButton = app.shadowRoot?.querySelector<HTMLButtonElement>(
      '.route-header-layer-current button.header-action[data-href="#/routines/new"]',
    )
    expect(newRoutineButton).toBeTruthy()
    expect(newRoutineButton?.querySelector('rrr-icon')?.getAttribute('name')).toBe('add')

    newRoutineButton?.click()

    expect(window.location.hash).toBe('#/routines/new')
    app.remove()
  })

  it('matches header transition direction to main and subpage navigation', () => {
    window.location.hash = '#/workouts'
    const app = document.createElement('rrr-app')
    document.body.append(app)

    window.location.hash = '#/routines'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const appHeader = app.shadowRoot?.querySelector('.app-header')
    let entering = appHeader?.querySelector<HTMLElement>('.route-header-layer-enter-main-switch')
    let outgoing = appHeader?.querySelector<HTMLElement>('.route-header-layer-exit-main-switch')
    expect(entering).toBeTruthy()
    expect(outgoing?.inert).toBe(true)
    entering?.dispatchEvent(new Event('animationend'))
    expect(appHeader?.querySelectorAll('.app-header-primary > .route-header-layer')).toHaveLength(1)

    window.location.hash = '#/routines/new'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    entering = appHeader?.querySelector<HTMLElement>('.route-header-layer-enter-sub-forward')
    outgoing = appHeader?.querySelector<HTMLElement>('.route-header-layer-exit-sub-forward')
    expect(entering).toBeTruthy()
    expect(outgoing?.inert).toBe(true)
    entering?.dispatchEvent(new Event('animationend'))

    window.location.hash = '#/routines'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    entering = appHeader?.querySelector<HTMLElement>('.route-header-layer-enter-sub-back')
    outgoing = appHeader?.querySelector<HTMLElement>('.route-header-layer-exit-sub-back')
    expect(entering).toBeTruthy()
    expect(outgoing?.inert).toBe(true)
    entering?.dispatchEvent(new Event('animationend'))
  }, 10_000)

  it('replaces header content without animation when reduced motion is preferred', () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    })

    try {
      window.location.hash = '#/workouts'
      const app = document.createElement('rrr-app')
      document.body.append(app)

      window.location.hash = '#/routines'
      window.dispatchEvent(new HashChangeEvent('hashchange'))

      const appHeader = app.shadowRoot?.querySelector('.app-header')
      expect(appHeader?.classList.contains('is-transitioning')).toBe(false)
      expect(appHeader?.querySelectorAll('.app-header-primary > .route-header-layer')).toHaveLength(1)
      expect(appHeader?.querySelector('.route-header-layer-enter-main-switch')).toBeNull()
      app.remove()
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      })
    }
  })

  it('updates persistent shell labels when the language changes', () => {
    saveLanguagePreference('nl-NL')
    window.location.hash = '#/settings/language'
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const getNavLabels = (): string[] => Array
      .from(app.shadowRoot?.querySelectorAll<HTMLElement>('.primary-nav .nav-button span') ?? [])
      .map((label) => label.textContent ?? '')

    expect(getNavLabels()).toEqual(['Vandaag', 'Routines', 'Oefeningen', 'Geschiedenis'])

    const languageSettings = app.shadowRoot?.querySelector('rrr-language-settings')
    languageSettings?.dispatchEvent(new CustomEvent('rrr-language-preference-change', {
      bubbles: true,
      composed: true,
      detail: { language: 'en-US' },
    }))

    expect(getNavLabels()).toEqual(['Today', 'Routines', 'Exercises library', 'History'])
  })

  it('manages an existing routine directly from routine detail', async () => {
    const { storageService } = await import('../app/storage-instance.ts')
    const routineId = storageService.getData().routines[0]?.id ?? ''
    window.location.hash = `#/routines/${routineId}`
    const app = document.createElement('rrr-app')
    document.body.append(app)
    await Promise.resolve()

    expect(app.shadowRoot?.querySelector('rrr-routine-detail')).toBeTruthy()
    const detail = app.shadowRoot?.querySelector('rrr-routine-detail')
    const startAction = detail
      ?.querySelector<HTMLElement>('rrr-list-row[data-action="start-workout"]')
    const exerciseAction = detail
      ?.querySelector<HTMLElement>('rrr-list-row[data-routine-exercise-id]')

    expect(app.shadowRoot?.querySelector(
      '.route-header-layer-current button.header-action[data-action="navigate"]',
    )).toBeNull()
    expect(app.shadowRoot?.querySelector(
      '.route-header-layer-current button.header-action[data-action="rename-routine"]',
    )).toBeTruthy()
    expect(detail?.querySelector('[data-action="edit-workout"]')).toBeNull()
    expect(exerciseAction?.getAttribute('activation')).toBe('button')
    expect(startAction?.getAttribute('activation')).toBe('button')
    expect(startAction?.querySelector(':scope > button')).toBeTruthy()
  })

  it('updates the mounted exercise list when filtering without a search term', async () => {
    const { storageService } = await import('../app/storage-instance.ts')
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const catalogue = app.shadowRoot?.querySelector<HTMLElement>('rrr-exercise-catalogue')
    expect(catalogue).toBeTruthy()

    const initialBrowser = catalogue?.querySelector<HTMLElement>('[data-result-count]')
    const initialCount = Number(initialBrowser?.dataset.resultCount)
    expect(initialCount).toBe(storageService.getData().exercises.length)

    app.shadowRoot?.querySelector<HTMLElement>('rrr-button[data-action="toggle-exercise-filters"]')?.click()
    app.shadowRoot
      ?.querySelector<HTMLElement>('rrr-button[data-action="toggle-exercise-filter"][data-filter-value="cardio"]')
      ?.click()

    const expectedMatches = filterExercises(storageService.getData().exercises, {
      categories: ['cardio'],
      equipment: [],
    })
    const filteredBrowser = catalogue?.querySelector<HTMLElement>('[data-result-count]')
    const filteredCount = Number(filteredBrowser?.dataset.resultCount)
    const visibleItems = catalogue?.querySelectorAll('.exercise-browser-item') ?? []

    expect(filteredCount).toBe(expectedMatches.length)
    expect(filteredCount).toBeLessThan(initialCount)
    expect(visibleItems.length).toBeGreaterThan(0)
  }, 10_000)

  it('updates the mounted exercise list when confirming a search term', async () => {
    const { storageService } = await import('../app/storage-instance.ts')
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const catalogue = app.shadowRoot?.querySelector<HTMLElement>('rrr-exercise-catalogue')
    expect(catalogue).toBeTruthy()

    const initialBrowser = catalogue?.querySelector<HTMLElement>('[data-result-count]')
    const initialCount = Number(initialBrowser?.dataset.resultCount)
    const searchInput = app.shadowRoot?.querySelector('rrr-input[name="exercise-search"]') ?? null
    const nativeInput = getNativeInput(searchInput)
    nativeInput.value = 'cardio'
    nativeInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    nativeInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }))

    const expectedMatches = searchExercises(storageService.getData().exercises, 'cardio')
    const filteredBrowser = catalogue?.querySelector<HTMLElement>('[data-result-count]')
    const filteredCount = Number(filteredBrowser?.dataset.resultCount)

    expect(filteredCount).toBe(expectedMatches.length)
    expect(filteredCount).toBeLessThan(initialCount)
  }, 10_000)

  it('maps native scroll position to focused exercise and preserves button semantics', async () => {
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const catalogue = app.shadowRoot?.querySelector<HTMLElement>('rrr-exercise-catalogue')
    const scrollProxy = catalogue?.querySelector<HTMLElement>('[data-exercise-scroll]')
    expect(catalogue?.classList.contains('route-view-full')).toBe(true)
    expect(catalogue?.classList.contains('route-view-padded')).toBe(false)
      expect(scrollProxy?.getAttribute('role')).toBe('region')
      expect(catalogue?.querySelector('.exercise-browser-section-title')?.tagName).toBe('H2')
      expect(catalogue?.querySelector('.exercise-browser-section-title')?.hasAttribute('aria-hidden')).toBe(false)
      expect(catalogue?.querySelector('.exercise-browser-name')?.tagName).toBe('SPAN')
      expect(catalogue?.querySelector<HTMLElement>('.exercise-browser-track')?.getAttribute('style')).toContain('--focus-anchor: 7.1000rem')
    expect(catalogue?.querySelector<HTMLElement>('[data-index="0"]')?.dataset.sectionFirst).toBe('true')
    expect(catalogue?.querySelector<HTMLElement>('[data-index="1"]')?.dataset.sectionLast).toBe('true')

    scrollProxy!.scrollTop = 72
    scrollProxy!.dispatchEvent(new Event('scroll'))
    await waitForAnimationFrame()

    const focusedItem = catalogue?.querySelector<HTMLElement>('[data-focused="true"]')
    expect(focusedItem?.dataset.index).toBe('1')
    expect(focusedItem?.tagName).toBe('BUTTON')
    expect(focusedItem?.hasAttribute('role')).toBe(false)
  })

  it('preserves the focused exercise when it remains after filtering', async () => {
    const { storageService } = await import('../app/storage-instance.ts')
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const catalogue = app.shadowRoot?.querySelector<HTMLElement>('rrr-exercise-catalogue') as HTMLElement & {
      setSearchAndFilters(searchQuery: string, filters: { categories: string[]; equipment: string[] }): void
    }
    const sortedExercises = storageService.getData().exercises
      .filter((exercise) => !exercise.archived)
      .sort((left, right) => left.name.localeCompare(right.name))
    const targetIndex = sortedExercises.findIndex((exercise) => exercise.categories.includes('cardio'))
    const targetExercise = sortedExercises[targetIndex]
    const scrollProxy = catalogue.querySelector<HTMLElement>('[data-exercise-scroll]')

    expect(targetExercise).toBeTruthy()
    scrollProxy!.scrollTop = targetIndex * 120
    scrollProxy!.dispatchEvent(new Event('scroll'))
    await waitForAnimationFrame()

    catalogue.setSearchAndFilters('', { categories: ['cardio'], equipment: [] })

    expect(catalogue.querySelector<HTMLElement>('[data-focused="true"]')?.dataset.exerciseId).toBe(targetExercise?.id)
  })

  it('restores the focused exercise after returning from its detail route', async () => {
    const { storageService } = await import('../app/storage-instance.ts')
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const sortedExercises = storageService.getData().exercises
      .filter((exercise) => !exercise.archived)
      .sort((left, right) => left.name.localeCompare(right.name))
    const targetIndex = Math.min(8, sortedExercises.length - 1)
    const targetExercise = sortedExercises[targetIndex]
    const catalogue = app.shadowRoot?.querySelector<HTMLElement>('rrr-exercise-catalogue')
    const scrollProxy = catalogue?.querySelector<HTMLElement>('[data-exercise-scroll]')

    expect(targetExercise).toBeTruthy()
    scrollProxy!.scrollTop = targetIndex * 120
    scrollProxy!.dispatchEvent(new Event('scroll'))
    await waitForAnimationFrame()

    catalogue
      ?.querySelector<HTMLButtonElement>(`[data-exercise-id="${targetExercise?.id}"]`)
      ?.click()
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(app.shadowRoot?.querySelector('.route-view-current')).toBeInstanceOf(
      customElements.get('rrr-exercise-detail'),
    )

    window.history.replaceState({}, '', '#/exercises')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await waitForAnimationFrame()

    const restoredCatalogue = app.shadowRoot?.querySelector<HTMLElement>(
      'rrr-exercise-catalogue.route-view-current',
    )
    const restoredScrollProxy = restoredCatalogue?.querySelector<HTMLElement>('[data-exercise-scroll]')

    expect(restoredCatalogue?.querySelector<HTMLElement>('[data-focused="true"]')?.dataset.exerciseId)
      .toBe(targetExercise?.id)
    expect(restoredScrollProxy?.scrollTop).toBe(targetIndex * 120)
  })
})
