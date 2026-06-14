import { t } from '../i18n/index.ts'

const styles = `
  :host {
    display: contents;
  }

  dialog {
    width: min(32rem, calc(100vw - 2rem));
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: 0;
    background: var(--rrr-color-surface);
    color: var(--rrr-color-text);
    box-shadow: 0 1rem 2rem rgba(15, 23, 42, 0.18);
  }

  dialog::backdrop {
    background: rgba(15, 23, 42, 0.4);
  }

  .dialog-panel {
    padding: var(--rrr-space-lg);
    display: grid;
    gap: var(--rrr-space-md);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }

  .dialog-message {
    margin: 0;
  }

  .dialog-field {
    display: grid;
    gap: var(--rrr-space-xs);
  }

  .dialog-field input {
    width: 100%;
  }

  .dialog-error {
    color: var(--rrr-color-danger);
    margin: 0;
    min-height: 1.25rem;
  }
`

type DialogMode = 'confirm' | 'prompt' | null

export class RrrDialogHost extends HTMLElement {
  private mode: DialogMode = null
  private dialogTitle = ''
  private message = ''
  private label = ''
  private value = ''
  private confirmLabel = t('action.confirm')
  private cancelLabel = t('action.cancel')
  private required = false
  private inputError = ''
  private resolver: ((value: boolean | string | null) => void) | null = null

  connectedCallback(): void {
    this.render()
  }

  confirm(options: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }): Promise<boolean> {
    this.mode = 'confirm'
    this.dialogTitle = options.title
    this.message = options.message
    this.confirmLabel = options.confirmLabel ?? t('action.confirm')
    this.cancelLabel = options.cancelLabel ?? t('action.cancel')
    this.inputError = ''
    this.render()
    this.openDialog()

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve as (value: boolean | string | null) => void
    })
  }

  prompt(options: {
    title: string
    message: string
    label: string
    initialValue?: string
    confirmLabel?: string
    cancelLabel?: string
    required?: boolean
  }): Promise<string | null> {
    this.mode = 'prompt'
    this.dialogTitle = options.title
    this.message = options.message
    this.label = options.label
    this.value = options.initialValue ?? ''
    this.confirmLabel = options.confirmLabel ?? t('action.save')
    this.cancelLabel = options.cancelLabel ?? t('action.cancel')
    this.required = options.required ?? false
    this.inputError = ''
    this.render()
    this.openDialog()

    const field = this.getPromptField()
    if (field) {
      field.value = this.value
    }

    return new Promise<string | null>((resolve) => {
      this.resolver = resolve as (value: boolean | string | null) => void
    })
  }

  private openDialog(): void {
    const dialog = this.getDialog()

    if (!dialog) {
      return
    }

    if (!dialog.open) {
      dialog.showModal()
    }

    if (this.mode === 'prompt') {
      this.getPromptField()?.focus()
    } else {
      this.querySelector<HTMLButtonElement>('button[data-action="confirm"]')?.focus()
    }
  }

  private getDialog(): HTMLDialogElement | null {
    return this.querySelector<HTMLDialogElement>('dialog')
  }

  private getPromptField(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>('input[name="dialog-prompt"]')
  }

  private closeWith(result: boolean | string | null): void {
    this.getDialog()?.close()
    const resolver = this.resolver
    this.resolver = null
    this.mode = null
    this.inputError = ''
    this.render()
    resolver?.(result)
  }

  private handleConfirm(): void {
    if (this.mode === 'confirm') {
      this.closeWith(true)
      return
    }

    const field = this.getPromptField()

    if (!field) {
      this.closeWith(null)
      return
    }

    const value = field.value.trim()

    if (this.required && !value) {
      this.inputError = t('dialog.validation.required')
      field.setAttribute('aria-invalid', 'true')
      this.renderValidationState()
      field.focus()
      return
    }

    field.removeAttribute('aria-invalid')
    this.closeWith(value)
  }

  private renderValidationState(): void {
    const error = this.querySelector<HTMLElement>('[data-role="dialog-error"]')

    if (error) {
      error.textContent = this.inputError
    }
  }

  private render(): void {
    const titleId = 'rrr-dialog-title'
    const messageId = 'rrr-dialog-message'
    const promptId = 'rrr-dialog-prompt'
    const errorId = 'rrr-dialog-error'

    const promptContent =
      this.mode === 'prompt'
        ? `
          <div class="dialog-field">
            <label for="${promptId}">${escapeHtml(this.label)}</label>
            <input id="${promptId}" name="dialog-prompt" type="text" value="${escapeHtml(this.value)}" aria-describedby="${errorId}" />
            <p class="dialog-error" id="${errorId}" data-role="dialog-error" role="alert">${escapeHtml(this.inputError)}</p>
          </div>
        `
        : ''

    this.innerHTML = `
      <style>${styles}</style>
      <dialog aria-labelledby="${titleId}" aria-describedby="${messageId}">
        <div class="dialog-panel" role="document">
          <h2 id="${titleId}">${escapeHtml(this.dialogTitle)}</h2>
          <p class="dialog-message" id="${messageId}">${escapeHtml(this.message)}</p>
          ${promptContent}
          <div class="dialog-actions">
            <button type="button" data-action="cancel">${escapeHtml(this.cancelLabel)}</button>
            <button type="button" data-action="confirm">${escapeHtml(this.confirmLabel)}</button>
          </div>
        </div>
      </dialog>
    `

    const dialog = this.getDialog()

    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault()
      this.closeWith(this.mode === 'confirm' ? false : null)
    })

    this.querySelector<HTMLButtonElement>('button[data-action="cancel"]')?.addEventListener('click', () => {
      this.closeWith(this.mode === 'confirm' ? false : null)
    })

    this.querySelector<HTMLButtonElement>('button[data-action="confirm"]')?.addEventListener('click', () => {
      this.handleConfirm()
    })

    this.getPromptField()?.addEventListener('input', () => {
      if (!this.inputError) {
        return
      }

      this.inputError = ''
      this.renderValidationState()
      this.getPromptField()?.removeAttribute('aria-invalid')
    })
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-dialog-host', RrrDialogHost)