import type {
  ConfirmSheetOptions,
  RrrSheet,
  SheetResult,
} from '../design-system/components/rrr-sheet.ts'
import { t } from '../i18n/index.ts'

interface SheetElement extends HTMLElement {
  configureConfirmation(options: ConfirmSheetOptions): void
  present(options?: { dismissible?: boolean; dismissLabel?: string }): Promise<SheetResult>
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

function getSheetContainer(owner?: HTMLElement): HTMLElement | ShadowRoot {
  if (owner) {
    return owner
  }

  const root = getSheetRoot()
  return root instanceof Document ? root.body : root
}

export function presentSheet(
  sheet: RrrSheet,
  options?: { owner?: HTMLElement; dismissible?: boolean },
): Promise<SheetResult> {
  getSheetContainer(options?.owner).append(sheet)
  return sheet.present({
    dismissible: options?.dismissible,
    dismissLabel: t('action.close'),
  })
}

export async function confirmSheet(options: ConfirmSheetOptions): Promise<boolean> {
  const sheet = document.createElement(sheetTagName) as SheetElement
  sheet.configureConfirmation(options)
  getSheetContainer().append(sheet)
  return (await sheet.present({
    dismissible: options.dismissible,
    dismissLabel: t('action.close'),
  })) === 'confirm'
}
