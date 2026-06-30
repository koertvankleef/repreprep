export type SheetPresentation = {
  host: HTMLElement
  dialog: HTMLDialogElement
}

type StackChangeListener = (top: SheetPresentation | null) => void

const sheetStack: SheetPresentation[] = []
const listeners = new Set<StackChangeListener>()

export function registerSheetPresentation(presentation: SheetPresentation): () => void {
  sheetStack.push(presentation)
  notifyStackChange()

  return () => {
    const index = sheetStack.indexOf(presentation)
    if (index === -1) {
      return
    }

    sheetStack.splice(index, 1)
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
