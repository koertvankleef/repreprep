import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'

const natoPrefixPattern = '(Alpha|Bravo|Charlie|Delta|Echo|Foxtrot|Golf|Hotel|India|Juliett|Kilo|Lima|Mike|November|Oscar|Papa|Quebec|Romeo|Sierra|Tango|Uniform|Victor|Whiskey|X-ray|Yankee|Zulu)'

beforeAll(async () => {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }

  const adoptedStyleSheets = new WeakMap<Document | ShadowRoot, CSSStyleSheet[]>()
  const descriptor = {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      return adoptedStyleSheets.get(this) ?? []
    },
    set(this: Document | ShadowRoot, value: CSSStyleSheet[]): void {
      adoptedStyleSheets.set(this, value)
    },
  }

  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', descriptor)
  }
  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', descriptor)
  }

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = false
    },
  })

  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: () => {},
  })

  initLocale('en-US')
  await import('../app/register-app-components.ts')
  const { registerRrrSheet } = await import('../design-system/components/rrr-sheet.ts')
  registerRrrSheet()
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  window.location.hash = '#/routines/new'
})

describe('routine header rename action', () => {
  test('shows rename action on new routine route', () => {
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const renameButton = app.shadowRoot?.querySelector<HTMLElement>(
      '.route-header-layer-current button[data-action="rename-routine"]',
    )

    expect(renameButton).not.toBeNull()
  })

  test('uses creating-style draft title on new route and opens rename sheet', async () => {
    const app = document.createElement('rrr-app')
    document.body.append(app)

    const titleBefore = app.shadowRoot?.querySelector<HTMLElement>(
      '.route-header-layer-current .app-header-title',
    )
    expect(titleBefore?.textContent).toMatch(new RegExp(`^Creating: ${natoPrefixPattern} [A-Za-z]+(?: \\d+)?$`))

    app.shadowRoot
      ?.querySelector<HTMLElement>('.route-header-layer-current button[data-action="rename-routine"]')
      ?.click()
    await Promise.resolve()
    await Promise.resolve()

    const renameSheet = (
      app.shadowRoot?.querySelector<HTMLElement>('rrr-sheet')
      ?? document.querySelector<HTMLElement>('rrr-sheet')
    )
    expect(renameSheet).not.toBeNull()
  })
})
