interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

interface PromptDialogOptions {
  title: string
  message: string
  label: string
  initialValue?: string
  confirmLabel?: string
  cancelLabel?: string
  required?: boolean
}

interface DialogHostElement extends HTMLElement {
  confirm(options: ConfirmDialogOptions): Promise<boolean>
  prompt(options: PromptDialogOptions): Promise<string | null>
}

const hostTagName = 'rrr-dialog-host'
let dialogHost: DialogHostElement | null = null

function getDeepActiveElement(): Element | null {
  let activeElement: Element | null = document.activeElement

  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement
  }

  return activeElement
}

function getDialogRoot(): Document | ShadowRoot {
  const activeRoot = getDeepActiveElement()?.getRootNode()
  if (activeRoot instanceof ShadowRoot) {
    return activeRoot
  }

  const appRoot = document.querySelector<HTMLElement>('rrr-app')?.shadowRoot
  return appRoot ?? document
}

function getDialogHost(): DialogHostElement {
  const root = getDialogRoot()
  const container = root instanceof Document ? root.body : root

  if (!dialogHost) {
    dialogHost = document.createElement(hostTagName) as DialogHostElement
  }

  if (dialogHost.parentNode !== container) {
    container.append(dialogHost)
  }

  return dialogHost
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return getDialogHost().confirm(options)
}

export function promptDialog(options: PromptDialogOptions): Promise<string | null> {
  return getDialogHost().prompt(options)
}
