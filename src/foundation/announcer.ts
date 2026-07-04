let politeRegion: HTMLElement | null = null

function getPoliteRegion(): HTMLElement {
  if (!politeRegion) {
    politeRegion = document.createElement('div')
    politeRegion.className = 'sr-only'
    politeRegion.setAttribute('role', 'status')
    politeRegion.setAttribute('aria-live', 'polite')
    politeRegion.setAttribute('aria-atomic', 'true')
  }

  if (!politeRegion.isConnected) {
    document.body.append(politeRegion)
  }

  return politeRegion
}

export function announcePolite(message: string): void {
  const region = getPoliteRegion()
  region.textContent = ''
  queueMicrotask(() => {
    region.textContent = message
  })
}
