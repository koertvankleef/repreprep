const stylesByRoot = new WeakMap<Document | ShadowRoot, Set<string>>()

function getSeenStyles(root: Document | ShadowRoot): Set<string> {
  const existing = stylesByRoot.get(root)
  if (existing) {
    return existing
  }

  const next = new Set<string>()
  stylesByRoot.set(root, next)
  return next
}

function findStyleElement(root: Document | ShadowRoot, styleId: string): HTMLStyleElement | null {
  const selector = `style[data-rrr-style="${styleId}"]`
  if (root instanceof ShadowRoot) {
    return root.querySelector<HTMLStyleElement>(selector)
  }

  return root.head.querySelector<HTMLStyleElement>(selector)
}

export function ensureStyleInRoot(root: Document | ShadowRoot, styleId: string, cssText: string): void {
  const seenStyles = getSeenStyles(root)
  if (seenStyles.has(styleId)) {
    const existingInDom = findStyleElement(root, styleId)
    if (existingInDom) {
      return
    }

    seenStyles.delete(styleId)
  }

  const existing = findStyleElement(root, styleId)
  if (existing) {
    seenStyles.add(styleId)
    return
  }

  const style = document.createElement('style')
  style.setAttribute('data-rrr-style', styleId)
  style.textContent = cssText

  if (root instanceof ShadowRoot) {
    root.appendChild(style)
  } else {
    root.head.appendChild(style)
  }

  seenStyles.add(styleId)
}
