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

    const initialItems = catalogue?.querySelectorAll('.exercise-cat-item') ?? []
    expect(initialItems.length).toBe(storageService.getData().exercises.length)

    app.shadowRoot?.querySelector<HTMLElement>('rrr-button[data-action="toggle-exercise-filters"]')?.click()
    app.shadowRoot
      ?.querySelector<HTMLElement>('rrr-button[data-action="toggle-exercise-filter"][data-filter-value="cardio"]')
      ?.click()

    const filteredItems = catalogue?.querySelectorAll('.exercise-cat-item') ?? []
    const expectedMatches = filterExercises(storageService.getData().exercises, {
      categories: ['cardio'],
      equipment: [],
    })

    expect(filteredItems.length).toBe(expectedMatches.length)
    expect(filteredItems.length).toBeLessThan(initialItems.length)
  }, 10_000)

  it('updates the mounted exercise list when confirming a search term', async () => {
    const { storageService } = await import('../app/storage-instance.ts')
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const catalogue = app.shadowRoot?.querySelector<HTMLElement>('rrr-exercise-catalogue')
    expect(catalogue).toBeTruthy()

    const initialItems = catalogue?.querySelectorAll('.exercise-cat-item') ?? []
    const searchInput = app.shadowRoot?.querySelector('rrr-input[name="exercise-search"]') ?? null
    const nativeInput = getNativeInput(searchInput)
    nativeInput.value = 'cardio'
    nativeInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    nativeInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }))

    const filteredItems = catalogue?.querySelectorAll('.exercise-cat-item') ?? []
    const expectedMatches = searchExercises(storageService.getData().exercises, 'cardio')

    expect(filteredItems.length).toBe(expectedMatches.length)
    expect(filteredItems.length).toBeLessThan(initialItems.length)
  }, 10_000)
})
