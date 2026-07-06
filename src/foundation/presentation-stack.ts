export type SheetPresentation = {
  host: HTMLElement
  dialog: HTMLDialogElement
}

type StackChangeListener = (top: SheetPresentation | null) => void

const sheetStack: SheetPresentation[] = []
const listeners = new Set<StackChangeListener>()

export function registerSheetPresentation(presentation: SheetPresentation): () => void {
  sheetStack.push(presentation)
  updatePresentationDepths()
  notifyStackChange()

  return () => {
    const index = sheetStack.indexOf(presentation)
    if (index === -1) {
      return
    }

    sheetStack.splice(index, 1)
    clearPresentationDepth(presentation)
    updatePresentationDepths()
    notifyStackChange()
  }
}

export function getTopSheetPresentation(): SheetPresentation | null {
  return sheetStack.at(-1) ?? null
}

export function subscribeToSheetStack(listener: StackChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyStackChange(): void {
  const top = getTopSheetPresentation()
  listeners.forEach((listener) => listener(top))
}

function updatePresentationDepths(): void {
  sheetStack.forEach((presentation, index) => {
    const depth = index + 1
    presentation.host.dataset.sheetStackDepth = String(depth)
    presentation.host.style.setProperty(
      '--rrr-sheet-stack-offset',
      createStackOffset(depth),
    )
  })
}

function clearPresentationDepth(presentation: SheetPresentation): void {
  delete presentation.host.dataset.sheetStackDepth
  presentation.host.style.removeProperty('--rrr-sheet-stack-offset')
}

function createStackOffset(depth: number): string {
  return `calc(${Array.from(
    { length: depth },
    () => 'var(--rrr-sheet-stack-step)',
  ).join(' + ')})`
}
