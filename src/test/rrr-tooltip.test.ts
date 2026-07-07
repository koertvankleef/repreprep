import { beforeAll, beforeEach, describe, expect, test } from 'vitest'

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
      (this as StylesheetHost).__adoptedStyleSheets = value
    },
  }

  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', descriptor)
  }

  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', descriptor)
  }
}

async function createOpenTooltip(): Promise<{
  root: ShadowRoot
  tooltip: HTMLElement
  trigger: HTMLButtonElement
}> {
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = '<rrr-tooltip><button title="Helpful text">Trigger</button></rrr-tooltip>'
  document.body.appendChild(host)
  await Promise.resolve()

  const tooltip = root.querySelector<HTMLElement>('rrr-tooltip')
  const trigger = root.querySelector<HTMLButtonElement>('button')
  if (!tooltip || !trigger) {
    throw new Error('Expected tooltip fixture to render')
  }

  tooltip.setAttribute('open', '')
  return { root, tooltip, trigger }
}

async function waitForAnimationFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

describe('rrr-tooltip popup', () => {
  beforeAll(async () => {
    installConstructableStylesheetShim()
    const { registerRrrTooltip } = await import('../design-system/components/rrr-tooltip.ts')
    registerRrrTooltip()
  })

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('mounts the popup beside its trigger in the same shadow root', async () => {
    const { root } = await createOpenTooltip()

    expect(root.querySelector('#rrr-tooltip-popup')).not.toBeNull()
    expect(document.querySelector('#rrr-tooltip-popup')).toBeNull()
  })

  test('mounts the popup inside an open dialog so it remains in the top layer', async () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <dialog open>
        <rrr-tooltip><button title="Dialog help">Trigger</button></rrr-tooltip>
      </dialog>
    `
    document.body.appendChild(host)
    await Promise.resolve()

    root.querySelector<HTMLElement>('rrr-tooltip')?.setAttribute('open', '')

    const dialog = root.querySelector('dialog')
    expect(dialog?.querySelector('#rrr-tooltip-popup')).not.toBeNull()
    expect(root.querySelector(':scope > #rrr-tooltip-popup')).toBeNull()
  })

  test('repositions an open popup after the viewport resizes', async () => {
    const { root, trigger } = await createOpenTooltip()
    let top = 100
    trigger.getBoundingClientRect = () => ({
      x: 100,
      y: top,
      top,
      right: 140,
      bottom: top + 20,
      left: 100,
      width: 40,
      height: 20,
      toJSON: () => ({}),
    })

    const tooltip = root.querySelector<HTMLElement>('rrr-tooltip')
    tooltip?.removeAttribute('open')
    tooltip?.setAttribute('open', '')
    expect(root.querySelector<HTMLElement>('#rrr-tooltip-popup')?.style.top).toBe('94px')

    top = 200
    window.dispatchEvent(new Event('resize'))
    await waitForAnimationFrame()

    expect(root.querySelector<HTMLElement>('#rrr-tooltip-popup')?.style.top).toBe('194px')
  })
})
