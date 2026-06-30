import type { ConfirmSheetOptions } from '../design-system/components/rrr-sheet.ts'

interface SheetElement extends HTMLElement {
  confirm(options: ConfirmSheetOptions): Promise<boolean>
}

const sheetTagName = 'rrr-sheet'

function getDeepActiveElement(): Element | null {
  let activeElement: Element | null = document.activeElement

  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement
  }

  return activeElement
}

function getSheetRoot(): Document | ShadowRoot {
  const activeRoot = getDeepActiveElement()?.getRootNode()
  if (activeRoot instanceof ShadowRoot) {
    return activeRoot
  }

  const appRoot = document.querySelector<HTMLElement>('rrr-app')?.shadowRoot
  return appRoot ?? document
}

export function confirmSheet(options: ConfirmSheetOptions): Promise<boolean> {
  const root = getSheetRoot()
  const container = root instanceof Document ? root.body : root
  const sheet = document.createElement(sheetTagName) as SheetElement
  container.append(sheet)
  return sheet.confirm(options)
}
