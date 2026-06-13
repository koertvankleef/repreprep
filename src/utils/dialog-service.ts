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

function getDialogHost(): DialogHostElement {
  let host = document.querySelector<DialogHostElement>(hostTagName)

  if (!host) {
    host = document.createElement(hostTagName) as DialogHostElement
    document.body.append(host)
  }

  return host
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return getDialogHost().confirm(options)
}

export function promptDialog(options: PromptDialogOptions): Promise<string | null> {
  return getDialogHost().prompt(options)
}