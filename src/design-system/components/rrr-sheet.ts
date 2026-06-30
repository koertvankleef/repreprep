import { getTopSheetPresentation, registerSheetPresentation } from '../../foundation/presentation-stack.ts'
import { defineCustomElementOnce } from './shared.ts'
import { ensureStyleInRoot } from './style-manager.ts'
import styles from './rrr-sheet.css?inline'

export type SheetTone = 'primary' | 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'

export type ConfirmSheetOptions = {
  title: string
  message: string
  confirmLabel: string
  confirmTone?: SheetTone
  dismissible?: boolean
}

const DRAG_DISTANCE_THRESHOLD = 72
const DRAG_FLICK_DISTANCE = 24
const DRAG_VELOCITY_THRESHOLD = 0.55
const CLOSE_DURATION_MS = 220

let nextSheetId = 1

export class RrrSheet extends HTMLElement {
  private dialog: HTMLDialogElement | null = null
  private resolver: ((value: boolean) => void) | null = null
  private unregisterPresentation: (() => void) | null = null
  private returnFocusTo: HTMLElement | null = null
  private dismissible = true
  private closing = false
  private dragPointerId: number | null = null
  private dragStartY = 0
  private dragStartTime = 0
  private dragOffset = 0

  connectedCallback(): void {
    const root = this.getRootNode()
    if (root instanceof Document || root instanceof ShadowRoot) {
      ensureStyleInRoot(root, 'rrr-sheet', styles)
    }
  }

  disconnectedCallback(): void {
    this.unregisterPresentation?.()
    this.unregisterPresentation = null

    if (this.resolver) {
      const resolver = this.resolver
      this.resolver = null
      resolver(false)
    }
  }

  confirm(options: ConfirmSheetOptions): Promise<boolean> {
    this.dismissible = options.dismissible ?? true
    this.returnFocusTo = getDeepActiveElement() as HTMLElement | null
    this.render(options)

    const dialog = this.dialog
    if (!dialog) {
      return Promise.resolve(false)
    }

    this.unregisterPresentation = registerSheetPresentation({ host: this, dialog })
    dialog.showModal()
    this.querySelector<HTMLElement>('[data-action="confirm"]')?.focus()

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve
    })
  }

  dismiss(): void {
    if (this.dismissible && getTopSheetPresentation()?.host === this) {
      this.closeWith(false)
    }
  }

  private render(options: ConfirmSheetOptions): void {
    const sheetId = nextSheetId++
    const titleId = `rrr-sheet-title-${sheetId}`
    const messageId = `rrr-sheet-message-${sheetId}`

    this.innerHTML = `
      <dialog aria-labelledby="${titleId}" aria-describedby="${messageId}">
        <div class="sheet-panel" role="document">
          <div class="sheet-handle-region" data-drag-handle aria-hidden="true">
            <span class="sheet-handle"></span>
          </div>
          <div class="sheet-content">
            <h3 id="${titleId}" class="sheet-title">${escapeHtml(options.title)}</h3>
            <p id="${messageId}" class="sheet-message">${escapeHtml(options.message)}</p>
            <rrr-button
              class="sheet-action"
              type="button"
              tone="${options.confirmTone ?? 'primary'}"
              data-action="confirm"
            >${escapeHtml(options.confirmLabel)}</rrr-button>
          </div>
        </div>
      </dialog>
    `

    this.dialog = this.querySelector('dialog')
    this.dialog?.addEventListener('cancel', this.handleCancel)
    this.dialog?.addEventListener('click', this.handleBackdropClick)
    this.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.addEventListener('click', () => this.closeWith(true))

    const handle = this.querySelector<HTMLElement>('[data-drag-handle]')
    handle?.addEventListener('pointerdown', this.handlePointerDown)
    handle?.addEventListener('pointermove', this.handlePointerMove)
    handle?.addEventListener('pointerup', this.handlePointerUp)
    handle?.addEventListener('pointercancel', this.handlePointerCancel)
  }

  private readonly handleCancel = (event: Event): void => {
    event.preventDefault()
    this.dismiss()
  }

  private readonly handleBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.dialog) {
      this.dismiss()
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.dismissible || this.closing) {
      return
    }

    this.dragPointerId = event.pointerId
    this.dragStartY = event.clientY
    this.dragStartTime = event.timeStamp
    this.dragOffset = 0
    this.dialog?.setAttribute('data-dragging', '')
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture?.(event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId) {
      return
    }

    this.dragOffset = Math.max(0, event.clientY - this.dragStartY)
    this.style.setProperty('--rrr-sheet-drag-offset', `${this.dragOffset}px`)
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId) {
      return
    }

    const elapsed = Math.max(1, event.timeStamp - this.dragStartTime)
    const velocity = this.dragOffset / elapsed
    const shouldDismiss =
      this.dragOffset >= DRAG_DISTANCE_THRESHOLD ||
      (this.dragOffset >= DRAG_FLICK_DISTANCE && velocity >= DRAG_VELOCITY_THRESHOLD)

    this.endDrag()
    if (shouldDismiss) {
      this.closeWith(false)
    }
  }

  private readonly handlePointerCancel = (): void => {
    this.endDrag()
  }

  private endDrag(): void {
    this.dragPointerId = null
    this.dragOffset = 0
    this.dialog?.removeAttribute('data-dragging')
    this.style.removeProperty('--rrr-sheet-drag-offset')
  }

  private closeWith(result: boolean): void {
    if (this.closing || !this.dialog) {
      return
    }

    this.closing = true
    this.endDrag()
    this.dialog.setAttribute('data-closing', '')

    window.setTimeout(() => {
      this.dialog?.close()
      this.unregisterPresentation?.()
      this.unregisterPresentation = null

      const resolver = this.resolver
      this.resolver = null
      resolver?.(result)

      const focusTarget = this.returnFocusTo
      this.remove()
      if (focusTarget?.isConnected) {
        focusTarget.focus()
      }
    }, prefersReducedMotion() ? 0 : CLOSE_DURATION_MS)
  }
}

function getDeepActiveElement(): Element | null {
  let activeElement: Element | null = document.activeElement
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement
  }
  return activeElement
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function registerRrrSheet(): void {
  defineCustomElementOnce('rrr-sheet', RrrSheet)
}
