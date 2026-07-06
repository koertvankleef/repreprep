/**
 * Patch CSSStyleSheet.prototype.replaceSync for JSDOM environments that do
 * not implement it. Call once in beforeAll for any test that imports
 * components using CSS-in-JS (constructable stylesheets).
 */
export function patchCssStyleSheet(): void {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }
}

/**
 * Patch HTMLDialogElement.prototype.showModal and close for JSDOM
 * environments that do not implement the native dialog API.
 * Call once in beforeAll for any test that opens sheets or dialogs.
 */
export function patchHTMLDialog(): void {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement, returnValue?: string): void {
      this.open = false
      if (returnValue !== undefined) {
        this.returnValue = returnValue
      }
    },
  })
}

/**
 * Patch globalThis.SVGSymbolElement for JSDOM environments that do not
 * expose it. Call once in beforeAll for any test that imports rrr-icon.
 */
export function patchSvgSymbolElement(): void {
  if (!globalThis.SVGSymbolElement) {
    Object.defineProperty(globalThis, 'SVGSymbolElement', {
      configurable: true,
      value: SVGElement,
    })
  }
}

/**
 * Override getBoundingClientRect on an element with stable test geometry.
 * Useful when code under test reads layout dimensions that JSDOM always
 * returns as zero.
 */
export function installElementRect(
  element: Element,
  rect: { x?: number; y?: number; width: number; height: number },
): void {
  const x = rect.x ?? 0
  const y = rect.y ?? 0
  const { width, height } = rect

  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x, y, width, height,
      top: y, left: x,
      right: x + width,
      bottom: y + height,
      toJSON() { return this },
    }),
  })
}
