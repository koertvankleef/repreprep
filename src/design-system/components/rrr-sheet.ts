import { getTopSheetPresentation, registerSheetPresentation } from '../../foundation/presentation-stack.ts'
import { defineCustomElementOnce } from './shared.ts'
import { ensureStyleInRoot } from './style-manager.ts'
import { SheetEnterFlow } from './sheet-enter-flow.ts'
import styles from './rrr-sheet.css?inline'

export type SheetTone = 'primary' | 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
export type SheetResult = string | null

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
  private resolver: ((value: SheetResult) => void) | null = null
  private unregisterPresentation: (() => void) | null = null
  private returnFocusTo: HTMLElement | null = null
  private dismissible = true
  private dismissLabel = ''
  private initialized = false
  private closing = false
  private dragPointerId: number | null = null
  private dragStartY = 0
  private dragStartTime = 0
  private dragOffset = 0
  private enterFlow: SheetEnterFlow | null = null

  connectedCallback(): void {
    const root = this.getRootNode()
    if (root instanceof Document || root instanceof ShadowRoot) {
      ensureStyleInRoot(root, 'rrr-sheet', styles)
    }
  }

  disconnectedCallback(): void {
    this.enterFlow?.disconnect()
    this.enterFlow = null
    this.unregisterPresentation?.()
    this.unregisterPresentation = null

    if (this.resolver) {
      const resolver = this.resolver
      this.resolver = null
      resolver(null)
    }
  }

  configureConfirmation(options: ConfirmSheetOptions): void {
    if (this.initialized) {
      throw new Error('Cannot configure a sheet after it has been presented')
    }

    this.dismissible = options.dismissible ?? true
    this.replaceChildren()

    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.className = 'sheet-title'
    heading.textContent = options.title

    const description = document.createElement('p')
    description.slot = 'description'
    description.className = 'sheet-message'
    description.textContent = options.message

    const action = document.createElement('rrr-button')
    action.slot = 'actions'
    action.className = 'sheet-action'
    action.setAttribute('type', 'button')
    action.setAttribute('tone', options.confirmTone ?? 'primary')
    action.setAttribute('data-action', 'confirm')
    action.setAttribute('data-sheet-result', 'confirm')
    action.textContent = options.confirmLabel

    this.append(heading, description, action)
  }

  present(options?: { dismissible?: boolean; dismissLabel?: string }): Promise<SheetResult> {
    if (this.resolver) {
      throw new Error('This sheet is already presented')
    }

    this.dismissible = options?.dismissible ?? this.dismissible
    this.dismissLabel = options?.dismissLabel ?? this.dismissLabel
    if (this.dismissible && !this.dismissLabel.trim()) {
      throw new Error('A dismissible sheet requires a dismiss label')
    }
    this.returnFocusTo = getDeepActiveElement() as HTMLElement | null
    this.initialize()

    const dialog = this.dialog
    if (!dialog) {
      return Promise.resolve(null)
    }

    this.unregisterPresentation = registerSheetPresentation({ host: this, dialog })
    dialog.showModal()
    this.focusInitialTarget()
    queueMicrotask(() => this.focusInitialTarget())

    return new Promise<SheetResult>((resolve) => {
      this.resolver = resolve
    })
  }

  dismiss(): void {
    if (this.dismissible && getTopSheetPresentation()?.host === this) {
      this.closeWith(null)
    }
  }

  close(result: string): void {
    this.closeWith(result)
  }

  private initialize(): void {
    if (this.initialized) {
      return
    }

    this.initialized = true
    const authoredNodes = Array.from(this.children)
    const headings = authoredNodes.filter((node) => node.getAttribute('slot') === 'heading')
    const descriptions = authoredNodes.filter((node) => node.getAttribute('slot') === 'description')
    const bodyNodes = authoredNodes.filter((node) => node.getAttribute('slot') === 'body')
    const actionNodes = authoredNodes.filter((node) => node.getAttribute('slot') === 'actions')
    const sheetId = nextSheetId++
    const titleId = `rrr-sheet-title-${sheetId}`
    const descriptionId = `rrr-sheet-description-${sheetId}`

    if (headings.length !== 1) {
      throw new Error('A sheet requires exactly one element with slot="heading"')
    }

    this.replaceChildren()

    const dialog = document.createElement('dialog')
    if (headings[0]) {
      headings[0].id ||= titleId
      dialog.setAttribute('aria-labelledby', headings[0].id)
    }
    if (descriptions[0]) {
      descriptions[0].id ||= descriptionId
      dialog.setAttribute('aria-describedby', descriptions[0].id)
    }

    const panel = document.createElement('div')
    panel.className = 'sheet-panel'
    panel.setAttribute('role', 'document')

    const handleRegion = document.createElement('div')
    handleRegion.className = 'sheet-handle-region'
    handleRegion.setAttribute('data-drag-handle', '')
    handleRegion.setAttribute('aria-hidden', 'true')
    const handle = document.createElement('span')
    handle.className = 'sheet-handle'
    handleRegion.append(handle)

    const content = document.createElement('div')
    content.className = 'sheet-content'
    content.append(...headings, ...descriptions)

    if (this.dismissible) {
      const dismissButton = document.createElement('button')
      dismissButton.className = 'sheet-assistive-dismiss'
      dismissButton.type = 'button'
      dismissButton.textContent = this.dismissLabel
      dismissButton.addEventListener('click', () => this.dismiss())
      panel.append(dismissButton)
    }

    if (bodyNodes.length > 0) {
      const body = document.createElement('div')
      body.className = 'sheet-body'
      body.append(...bodyNodes)
      content.append(body)
    }

    if (actionNodes.length > 0) {
      const actions = document.createElement('div')
      actions.className = 'sheet-actions'
      actions.append(...actionNodes)
      content.append(actions)
    }

    panel.append(handleRegion, content)
    dialog.append(panel)
    this.append(dialog)
    this.dialog = dialog

    dialog.addEventListener('cancel', this.handleCancel)
    dialog.addEventListener('click', this.handleDialogClick)
    handleRegion.addEventListener('pointerdown', this.handlePointerDown)
    handleRegion.addEventListener('pointermove', this.handlePointerMove)
    handleRegion.addEventListener('pointerup', this.handlePointerUp)
    handleRegion.addEventListener('pointercancel', this.handlePointerCancel)

    this.enterFlow = new SheetEnterFlow(
      dialog,
      () => this.closing || !this.isConnected,
    )
    this.enterFlow.connect()
  }

  private getInitialFocusTarget(): HTMLElement | null {
    return this.querySelector<HTMLElement>('[autofocus], [data-sheet-result]')
  }

  private focusInitialTarget(): void {
    if (!this.closing) {
      this.getInitialFocusTarget()?.focus()
    }
  }

  private readonly handleCancel = (event: Event): void => {
    event.preventDefault()
    this.dismiss()
  }

  private readonly handleDialogClick = (event: MouseEvent): void => {
    if (event.target === this.dialog) {
      this.dismiss()
      return
    }

    const resultTarget = event
      .composedPath()
      .find((node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.sheetResult !== undefined)

    if (!resultTarget || resultTarget.hasAttribute('disabled') || resultTarget.getAttribute('aria-disabled') === 'true') {
      return
    }

    this.closeWith(resultTarget.dataset.sheetResult ?? null)
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
      this.closeWith(null)
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

  private closeWith(result: SheetResult): void {
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

export function registerRrrSheet(): void {
  defineCustomElementOnce('rrr-sheet', RrrSheet)
}
