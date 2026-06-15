import { t } from '../../i18n/index.ts'
import { defineCustomElementOnce } from './shared.ts'
import styles from './rrr-dialog-host.css?inline'

type DialogMode = 'confirm' | 'prompt' | null

type PromptFieldElement = HTMLElement & {
  value: string
}

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
      field.setAttribute('value', this.value)
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
      this.querySelector<HTMLElement>('rrr-button[data-action="confirm"]')?.focus()
    }
  }

  private getDialog(): HTMLDialogElement | null {
    return this.querySelector<HTMLDialogElement>('dialog')
  }

  private getPromptField(): PromptFieldElement | null {
    return this.querySelector<PromptFieldElement>('rrr-input[name="dialog-prompt"]')
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
      field.setAttribute('invalid', '')
      field.setAttribute('error-text', this.inputError)
      field.focus()
      return
    }

    field.removeAttribute('invalid')
    field.removeAttribute('error-text')
    this.closeWith(value)
  }

  private render(): void {
    const titleId = 'rrr-dialog-title'
    const messageId = 'rrr-dialog-message'

    const promptContent =
      this.mode === 'prompt'
        ? `
          <div class="dialog-field">
            <rrr-input
              name="dialog-prompt"
              label="${escapeHtml(this.label)}"
              value="${escapeHtml(this.value)}"
              ${this.required ? 'required' : ''}
              ${this.inputError ? 'invalid' : ''}
              error-text="${escapeHtml(this.inputError)}"
            ></rrr-input>
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
            <rrr-button type="button" variant="secondary" data-action="cancel">${escapeHtml(this.cancelLabel)}</rrr-button>
            <rrr-button type="button" data-action="confirm">${escapeHtml(this.confirmLabel)}</rrr-button>
          </div>
        </div>
      </dialog>
    `

    const dialog = this.getDialog()

    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault()
      this.closeWith(this.mode === 'confirm' ? false : null)
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="cancel"]')?.addEventListener('click', () => {
      this.closeWith(this.mode === 'confirm' ? false : null)
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="confirm"]')?.addEventListener('click', () => {
      this.handleConfirm()
    })

    this.getPromptField()?.addEventListener('input', () => {
      if (!this.inputError) {
        return
      }

      this.inputError = ''
      this.getPromptField()?.removeAttribute('invalid')
      this.getPromptField()?.removeAttribute('error-text')
    })
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function registerRrrDialogHost(): void {
  defineCustomElementOnce('rrr-dialog-host', RrrDialogHost)
}
