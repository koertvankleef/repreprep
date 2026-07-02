import { expect, test, vi } from 'vitest'
import { initLocale } from '../i18n/index.ts'

type StylesheetHost = (Document | ShadowRoot) & {
  __adoptedStyleSheets?: CSSStyleSheet[]
}

function installBrowserApiShims(): void {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      value: () => {},
    })
  }

  const adoptedStyleSheets = {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      return (this as StylesheetHost).__adoptedStyleSheets ?? []
    },
    set(this: Document | ShadowRoot, value: CSSStyleSheet[]): void {
      ;(this as StylesheetHost).__adoptedStyleSheets = value
    },
  }

  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', adoptedStyleSheets)
  }

  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', adoptedStyleSheets)
  }

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

test('resolves a routine deep link when the existing app element is cold-upgraded', async () => {
  installBrowserApiShims()
  initLocale('en-US')
  localStorage.clear()

  const { storageService } = await import('../app/storage-instance.ts')
  storageService.resetAllData()
  const routineId = storageService.getData().routines[0]!.id

  window.location.hash = `#/routines/${routineId}`
  document.body.innerHTML = '<rrr-app></rrr-app>'

  const { registerDesignSystemComponents } = await import('../design-system/components/register.ts')
  registerDesignSystemComponents()
  await import('../app/register-app-components.ts')
  await Promise.resolve()

  const app = document.querySelector('rrr-app')
  const detail = app?.shadowRoot?.querySelector<HTMLElement & { routineId: string | null }>(
    'rrr-routine-detail',
  )

  expect(detail?.routineId).toBe(routineId)
  expect(detail?.textContent).not.toContain('unavailable or has been removed')
})
