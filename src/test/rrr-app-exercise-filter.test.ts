import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterExercises, searchExercises } from '../domain/exercise-service.ts'

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
