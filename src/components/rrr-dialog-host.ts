import { Required, type Validator } from '@lion/ui/form-core.js'

const styles = `
  :host {
    display: contents;
  }

  .dialog-panel {
    width: min(32rem, calc(100vw - 2rem));
    background: var(--rrr-color-surface);
    color: var(--rrr-color-text);
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: var(--rrr-space-lg);
    display: grid;
    gap: var(--rrr-space-md);
    box-shadow: 0 1rem 2rem rgba(15, 23, 42, 0.18);
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
`

interface LionDialogLike extends HTMLElement {
  opened: boolean
}

interface LionFieldLike extends HTMLElement {
  modelValue: unknown
  submitted: boolean
  validators: Validator[]
  hasFeedbackFor: string[]
}

type DialogMode = 'confirm' | 'prompt' | null

export class RrrDialogHost extends HTMLElement {
  private mode: DialogMode = null
  private dialogTitle = ''
  private message = ''
  private label = ''
  private value = ''
  private confirmLabel = 'Confirm'
  private cancelLabel = 'Cancel'
  private required = false
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
    this.confirmLabel = options.confirmLabel ?? 'Confirm'
    this.cancelLabel = options.cancelLabel ?? 'Cancel'
    this.render()
    const dialog = this.getDialog()

    if (dialog) {
      dialog.opened = true
    }

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
    this.confirmLabel = options.confirmLabel ?? 'Save'
    this.cancelLabel = options.cancelLabel ?? 'Cancel'
    this.required = options.required ?? false
    this.render()

    const field = this.getPromptField()
    if (field) {
      field.modelValue = this.value
      field.validators = this.required ? [new Required()] : []
    }

    const dialog = this.getDialog()

    if (dialog) {
      dialog.opened = true
    }

    return new Promise<string | null>((resolve) => {
      this.resolver = resolve as (value: boolean | string | null) => void
    })
  }

  private getDialog(): LionDialogLike | null {
    return this.querySelector<LionDialogLike>('lion-dialog')
  }

  private getPromptField(): LionFieldLike | null {
    return this.querySelector<LionFieldLike>('lion-input[name="dialog-prompt"]')
  }

  private closeWith(result: boolean | string | null): void {
    this.getDialog()?.removeAttribute('opened')
    const resolver = this.resolver
    this.resolver = null
    this.mode = null
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

    field.submitted = true

    if (field.hasFeedbackFor.includes('error')) {
      return
    }

    const value = String(field.modelValue ?? '').trim()
    this.closeWith(value)
  }

  private render(): void {
    const promptContent =
      this.mode === 'prompt'
        ? `
          <lion-input name="dialog-prompt" label="${escapeHtml(this.label)}"></lion-input>
        `
        : ''

    this.innerHTML = `
      <style>${styles}</style>
      <lion-dialog>
        <div slot="content" class="dialog-panel" role="document">
          <h2>${escapeHtml(this.dialogTitle)}</h2>
          <p class="dialog-message">${escapeHtml(this.message)}</p>
          ${promptContent}
          <div class="dialog-actions">
            <button type="button" data-action="cancel">${escapeHtml(this.cancelLabel)}</button>
            <button type="button" data-action="confirm">${escapeHtml(this.confirmLabel)}</button>
          </div>
        </div>
      </lion-dialog>
    `

    this.querySelector<HTMLButtonElement>('button[data-action="cancel"]')?.addEventListener('click', () => {
      this.closeWith(this.mode === 'confirm' ? false : null)
    })

    this.querySelector<HTMLButtonElement>('button[data-action="confirm"]')?.addEventListener('click', () => {
      this.handleConfirm()
    })
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-dialog-host', RrrDialogHost)