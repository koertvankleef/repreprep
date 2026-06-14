import { t } from '../i18n/index.ts'

export type ToastType = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastOptions = {
  text: string
  type?: ToastType
  closable?: boolean
  durationMs?: number
  action?: ToastAction
}

type InternalToastConfig = {
  id: number
  text: string
  type: ToastType
  closable: boolean
  durationMs: number
  closeLabel: string
  action?: ToastAction
}

const TOAST_TAG_NAME = 'rrr-toast'
const TOAST_ROOT_ID = 'rrr-toast-root'

class RrrToastElement extends HTMLElement {
  private toastId = 0
  private text = ''
  private type: ToastType = 'info'
  private closable = false
  private action?: ToastAction
  private durationMs = 4200
  private closeLabel = ''
  private dismissTimer: number | null = null
  private isClosing = false

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }

    this.classList.remove('is-closing')
    this.render()

    window.requestAnimationFrame(() => {
      this.classList.add('is-open')
    })

    if (!this.closable) {
      this.startDismissTimer()
    }
  }

  disconnectedCallback(): void {
    this.clearDismissTimer()
  }

  setConfig(config: InternalToastConfig): void {
    this.toastId = config.id
    this.text = config.text
    this.type = config.type
    this.closable = config.closable
    this.action = config.action
    this.durationMs = config.durationMs
    this.closeLabel = config.closeLabel
    this.render()

    if (!this.closable) {
      this.startDismissTimer()
    }
  }

  private startDismissTimer(): void {
    this.clearDismissTimer()
    this.dismissTimer = window.setTimeout(() => {
      this.dismiss()
    }, this.durationMs)
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer != null) {
      window.clearTimeout(this.dismissTimer)
      this.dismissTimer = null
    }
  }

  private dismiss(): void {
    if (this.isClosing) {
      return
    }

    this.isClosing = true
    this.classList.remove('is-open')
    this.classList.add('is-closing')

    const shell = this.shadowRoot?.querySelector<HTMLElement>('.toast')
    if (!shell) {
      this.dispatchDismiss()
      return
    }

    shell.classList.add('is-closing')
    window.setTimeout(() => {
      this.dispatchDismiss()
    }, 220)
  }

  private dispatchDismiss(): void {
    this.dispatchEvent(
      new CustomEvent<number>('toast-dismiss', {
        detail: this.toastId,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private handleActionClick(): void {
    try {
      this.action?.onClick()
    } finally {
      this.dismiss()
    }
  }

  private handleCloseClick(): void {
    this.dismiss()
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    this.setAttribute('data-type', this.type)

    const actionMarkup = this.action
      ? `<button class="toast-action" type="button" part="action">${escapeHtml(this.action.label)}</button>`
      : ''

    const closeMarkup = this.closable
      ? `<button class="toast-close" type="button" aria-label="${escapeHtml(this.closeLabel)}" part="close">x</button>`
      : ''

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --toast-bg: var(--rrr-toast-info-bg, var(--rrr-colors-context-info-70));
          --toast-fg: var(--rrr-toast-fg, var(--rrr-colors-grayscale-00));
          --toast-action-bg: var(--rrr-toast-action-bg, color-mix(in oklch, white 25%, transparent));
          --toast-action-bg-hover: var(--rrr-toast-action-bg-hover, color-mix(in oklch, white 35%, transparent));
          --toast-close-bg-hover: var(--rrr-toast-close-bg-hover, color-mix(in oklch, white 20%, transparent));
          display: block;
          pointer-events: auto;
          color: var(--toast-fg);
          background: var(--toast-bg);
          border-radius: var(--rrr-toast-radius, var(--rrr-radius-m));
          min-width: var(--rrr-toast-min-width, 18rem);
          max-width: var(--rrr-toast-max-width, min(36rem, calc(100vw - 2rem)));
          box-shadow: var(--rrr-toast-shadow, var(--rrr-depth-3-shadow));
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          margin-bottom: 0;
          transition: max-height 220ms ease, opacity 180ms ease, margin-bottom 220ms ease;
        }

        :host([data-type='neutral']) {
          --toast-bg: var(--rrr-toast-neutral-bg, var(--rrr-colors-grayscale-80));
        }

        :host([data-type='success']) {
          --toast-bg: var(--rrr-toast-success-bg, var(--rrr-colors-context-success-70));
        }

        :host([data-type='warning']) {
          --toast-bg: var(--rrr-toast-warning-bg, var(--rrr-colors-context-warning-70));
        }

        :host([data-type='danger']) {
          --toast-bg: var(--rrr-toast-danger-bg, var(--rrr-colors-context-danger-70));
        }

        :host(.is-open) {
          max-height: var(--rrr-toast-open-max-height, 12rem);
          opacity: 1;
          margin-bottom: var(--rrr-toast-stack-gap, var(--rrr-spacing-xs));
        }

        :host(.is-closing) {
          max-height: 0;
          opacity: 0;
          margin-bottom: 0;
        }

        .toast {
          color: inherit;
          padding: var(--rrr-toast-padding, var(--rrr-spacing-s) var(--rrr-spacing-l));
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: var(--rrr-toast-content-gap, var(--rrr-spacing-s));
          align-items: center;
          opacity: 1;
          transform: translateY(0);
          transition: opacity 180ms ease, transform 180ms ease;
          font-family: var(--rrr-font-family);
          font-size: var(--rrr-toast-font-size, var(--rrr-font-size-m));
          line-height: 1.3;
        }

        .toast.is-closing {
          opacity: 0;
          transform: translateY(-0.3rem);
        }

        .toast-text {
          margin: 0;
          word-break: break-word;
        }

        .toast-action,
        .toast-close {
          border: 0;
          border-radius: var(--rrr-toast-control-radius, var(--rrr-radius-s));
          cursor: pointer;
          font-weight: var(--rrr-font-weight-semibold);
          font-size: var(--rrr-toast-control-font-size, var(--rrr-font-size-s));
          color: var(--toast-fg);
        }

        .toast-action {
          background: var(--toast-action-bg);
          padding: var(--rrr-toast-action-padding, var(--rrr-spacing-xs) var(--rrr-spacing-s));
          white-space: nowrap;
        }

        .toast-action:hover,
        .toast-action:focus-visible {
          background: var(--toast-action-bg-hover);
          outline: none;
        }

        .toast-close {
          background: transparent;
          width: 1.6rem;
          height: 1.6rem;
          line-height: 1;
        }

        .toast-close:hover,
        .toast-close:focus-visible {
          background: var(--toast-close-bg-hover);
          outline: none;
        }
      </style>
      <article class="toast" role="status" aria-live="polite" part="toast">
        <p class="toast-text" part="text">${escapeHtml(this.text)}</p>
        ${actionMarkup}
        ${closeMarkup}
      </article>
    `

    const actionButton = this.shadowRoot.querySelector<HTMLButtonElement>('.toast-action')
    const closeButton = this.shadowRoot.querySelector<HTMLButtonElement>('.toast-close')

    actionButton?.addEventListener('click', () => this.handleActionClick())
    closeButton?.addEventListener('click', () => this.handleCloseClick())
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getDurationMs(options: ToastOptions): number {
  if (typeof options.durationMs === 'number' && Number.isFinite(options.durationMs) && options.durationMs > 0) {
    return options.durationMs
  }

  const textLength = options.text.trim().length
  const baseMs = options.action ? 3600 : 2200
  const perCharacterMs = 28
  const minMs = options.action ? 5000 : 3000
  const maxMs = options.action ? 12000 : 9000
  const calculated = baseMs + textLength * perCharacterMs

  return Math.min(maxMs, Math.max(minMs, calculated))
}

class ToastService {
  private nextId = 1

  show(options: ToastOptions): number {
    this.ensureRegistered()
    const root = this.ensureRoot()
    const id = this.nextId++

    const toast = document.createElement(TOAST_TAG_NAME) as RrrToastElement
    toast.setConfig({
      id,
      text: options.text,
      type: options.type ?? 'info',
      closable: options.closable ?? false,
      action: options.action,
      durationMs: getDurationMs(options),
      closeLabel: t('toast.closeAria'),
    })

    toast.addEventListener('toast-dismiss', () => {
      toast.remove()
    })

    root.appendChild(toast)
    return id
  }

  info(text: string, options?: Omit<ToastOptions, 'text' | 'type'>): number {
    return this.show({ text, type: 'info', ...options })
  }

  success(text: string, options?: Omit<ToastOptions, 'text' | 'type'>): number {
    return this.show({ text, type: 'success', ...options })
  }

  warning(text: string, options?: Omit<ToastOptions, 'text' | 'type'>): number {
    return this.show({ text, type: 'warning', ...options })
  }

  danger(text: string, options?: Omit<ToastOptions, 'text' | 'type'>): number {
    return this.show({ text, type: 'danger', ...options })
  }

  neutral(text: string, options?: Omit<ToastOptions, 'text' | 'type'>): number {
    return this.show({ text, type: 'neutral', ...options })
  }

  private ensureRegistered(): void {
    if (!customElements.get(TOAST_TAG_NAME)) {
      customElements.define(TOAST_TAG_NAME, RrrToastElement)
    }
  }

  private ensureRoot(): HTMLElement {
    let root = document.getElementById(TOAST_ROOT_ID)
    if (root) {
      return root
    }

    root = document.createElement('div')
    root.id = TOAST_ROOT_ID
    root.className = 'rrr-toast-root'
    document.body.appendChild(root)

    return root
  }
}

export const toastService = new ToastService()
