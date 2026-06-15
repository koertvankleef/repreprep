import styles from './rrr-tooltip.css?inline'
import { defineCustomElementOnce } from './shared.ts'

// ─── Constants ────────────────────────────────────────────────────────────────

const POPUP_ID = 'rrr-tooltip-popup'
const SHOW_DELAY = 300
const HIDE_DELAY = 100
const LONG_PRESS_DELAY = 500
const MOVE_THRESHOLD = 10

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const tooltipSheet = new CSSStyleSheet()
tooltipSheet.replaceSync(styles)

// ─── Component ────────────────────────────────────────────────────────────────

export class RrrTooltip extends HTMLElement {
  // ─── Shared singleton state (static) ───────────────────────────────────────

  private static activeOwner: RrrTooltip | null = null
  private static showTimer: ReturnType<typeof setTimeout> | null = null
  private static hideTimer: ReturnType<typeof setTimeout> | null = null
  private static popup: HTMLDivElement | null = null
  private static stylesInjected = false

  private static getPopup(): HTMLDivElement {
    if (!RrrTooltip.popup) {
      if (!RrrTooltip.stylesInjected) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, tooltipSheet]
        RrrTooltip.stylesInjected = true
      }
      const el = document.createElement('div')
      el.id = POPUP_ID
      el.setAttribute('role', 'tooltip')
      el.setAttribute('aria-hidden', 'true')
      document.body.appendChild(el)
      RrrTooltip.popup = el
    }
    return RrrTooltip.popup
  }

  private static clearTimers(): void {
    if (RrrTooltip.showTimer !== null) {
      clearTimeout(RrrTooltip.showTimer)
      RrrTooltip.showTimer = null
    }
    if (RrrTooltip.hideTimer !== null) {
      clearTimeout(RrrTooltip.hideTimer)
      RrrTooltip.hideTimer = null
    }
  }

  /** Hide the active tooltip immediately. Called by viewport-change listeners and Escape. */
  static hide(): void {
    RrrTooltip.clearTimers()
    const popup = RrrTooltip.popup
    if (popup) {
      popup.setAttribute('aria-hidden', 'true')
      popup.removeAttribute('data-placement')
    }
    if (RrrTooltip.activeOwner) {
      RrrTooltip.activeOwner.currentTrigger?.removeAttribute('aria-describedby')
      RrrTooltip.activeOwner = null
    }
    document.removeEventListener('keydown', RrrTooltip.onDocKeyDown)
  }

  private static onDocKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      RrrTooltip.hide()
    }
  }

  private static positionAndShow(trigger: Element, text: string): void {
    const el = RrrTooltip.getPopup()
    el.textContent = text

    // Render at origin to measure natural dimensions
    el.style.top = '0'
    el.style.left = '0'

    const OFFSET = 6
    const MARGIN = 8
    const popupW = el.offsetWidth
    const popupH = el.offsetHeight
    const triggerRect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer above; flip to below when too close to the top edge
    let top = triggerRect.top - popupH - OFFSET
    let placement: 'above' | 'below' = 'above'
    if (top < MARGIN) {
      top = triggerRect.bottom + OFFSET
      placement = 'below'
    }

    // Clamp vertically
    top = Math.max(MARGIN, Math.min(top, vh - popupH - MARGIN))

    // Center horizontally over trigger, clamp to viewport
    let left = triggerRect.left + triggerRect.width / 2 - popupW / 2
    left = Math.max(MARGIN, Math.min(left, vw - popupW - MARGIN))

    el.style.top = `${Math.round(top)}px`
    el.style.left = `${Math.round(left)}px`
    el.setAttribute('data-placement', placement)
    el.setAttribute('aria-hidden', 'false')
  }

  // ─── Instance state ─────────────────────────────────────────────────────────

  private readonly contentSlot: HTMLSlotElement
  private currentTrigger: Element | null = null
  private storedTitle: string | null = null
  private suppressNextClick = false
  private longPressTimer: ReturnType<typeof setTimeout> | null = null
  private longPressStartX = 0
  private longPressStartY = 0

  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.adoptedStyleSheets = [tooltipSheet]
    const slot = document.createElement('slot')
    shadowRoot.appendChild(slot)
    this.contentSlot = slot
  }

  connectedCallback(): void {
    this.contentSlot.addEventListener('slotchange', this.onSlotChange)
    this.onSlotChange()
  }

  disconnectedCallback(): void {
    this.contentSlot.removeEventListener('slotchange', this.onSlotChange)
    this.detachTrigger()
    if (RrrTooltip.activeOwner === this) {
      RrrTooltip.hide()
    }
  }

  // ─── Slot / trigger wiring ──────────────────────────────────────────────────

  private onSlotChange = (): void => {
    this.detachTrigger()
    const trigger = this.contentSlot.assignedElements()[0] ?? null
    if (trigger) {
      this.storedTitle = trigger.getAttribute('title') ?? null
      if (this.storedTitle) {
        trigger.removeAttribute('title')
      }
      this.currentTrigger = trigger
      this.attachTrigger(trigger)
    }
  }

  private attachTrigger(trigger: Element): void {
    trigger.addEventListener('mouseenter', this.onMouseEnter)
    trigger.addEventListener('mouseleave', this.onMouseLeave)
    trigger.addEventListener('focusin', this.onFocusIn)
    trigger.addEventListener('focusout', this.onFocusOut)
    trigger.addEventListener('pointerdown', this.onPointerDown)
    trigger.addEventListener('pointermove', this.onPointerMove)
    trigger.addEventListener('pointerup', this.onPointerUp)
    trigger.addEventListener('pointercancel', this.onPointerCancel)
    trigger.addEventListener('contextmenu', this.onContextMenu)
    trigger.addEventListener('click', this.onTriggerClick, { capture: true })
  }

  private detachTrigger(): void {
    const trigger = this.currentTrigger
    if (!trigger) return
    if (this.storedTitle !== null) {
      trigger.setAttribute('title', this.storedTitle)
      this.storedTitle = null
    }
    trigger.removeEventListener('mouseenter', this.onMouseEnter)
    trigger.removeEventListener('mouseleave', this.onMouseLeave)
    trigger.removeEventListener('focusin', this.onFocusIn)
    trigger.removeEventListener('focusout', this.onFocusOut)
    trigger.removeEventListener('pointerdown', this.onPointerDown)
    trigger.removeEventListener('pointermove', this.onPointerMove)
    trigger.removeEventListener('pointerup', this.onPointerUp)
    trigger.removeEventListener('pointercancel', this.onPointerCancel)
    trigger.removeEventListener('contextmenu', this.onContextMenu)
    trigger.removeEventListener('click', this.onTriggerClick, { capture: true })
    this.currentTrigger = null
  }

  // ─── Show / hide helpers ────────────────────────────────────────────────────

  private doShow(): void {
    const text = this.storedTitle
    const trigger = this.currentTrigger
    if (!text || !trigger) return
    RrrTooltip.positionAndShow(trigger, text)
    trigger.setAttribute('aria-describedby', POPUP_ID)
    RrrTooltip.activeOwner = this
    document.addEventListener('keydown', RrrTooltip.onDocKeyDown)
  }

  private scheduleShow(): void {
    RrrTooltip.clearTimers()
    RrrTooltip.showTimer = setTimeout(() => {
      this.doShow()
    }, SHOW_DELAY)
  }

  private scheduleHide(): void {
    RrrTooltip.clearTimers()
    RrrTooltip.hideTimer = setTimeout(() => {
      if (RrrTooltip.activeOwner === this) {
        RrrTooltip.hide()
      }
    }, HIDE_DELAY)
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  // ─── Event handlers ─────────────────────────────────────────────────────────

  private onMouseEnter = (): void => {
    this.scheduleShow()
  }

  private onMouseLeave = (): void => {
    if (RrrTooltip.activeOwner === this) {
      this.scheduleHide()
    } else {
      RrrTooltip.clearTimers()
    }
  }

  private onFocusIn = (): void => {
    RrrTooltip.clearTimers()
    this.doShow()
  }

  private onFocusOut = (): void => {
    if (RrrTooltip.activeOwner === this) {
      RrrTooltip.hide()
    }
  }

  private onPointerDown = (e: Event): void => {
    const pe = e as PointerEvent
    if (pe.pointerType === 'mouse') return
    this.clearLongPress()
    this.longPressStartX = pe.clientX
    this.longPressStartY = pe.clientY
    const trigger = this.currentTrigger
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null
      this.doShow()
      this.suppressNextClick = true
      // After the finger lifts, any subsequent touch anywhere dismisses the tooltip
      trigger?.addEventListener(
        'pointerup',
        () => {
          setTimeout(() => {
            document.addEventListener(
              'pointerdown',
              () => {
                if (RrrTooltip.activeOwner === this) {
                  RrrTooltip.hide()
                }
              },
              { once: true, capture: true },
            )
          }, 50)
        },
        { once: true },
      )
    }, LONG_PRESS_DELAY)
  }

  private onPointerMove = (e: Event): void => {
    const pe = e as PointerEvent
    if (pe.pointerType === 'mouse') return
    const dx = pe.clientX - this.longPressStartX
    const dy = pe.clientY - this.longPressStartY
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
      this.clearLongPress()
    }
  }

  private onPointerUp = (e: Event): void => {
    const pe = e as PointerEvent
    if (pe.pointerType === 'mouse') return
    // Cancel a pending long-press if finger lifted before threshold
    this.clearLongPress()
  }

  private onPointerCancel = (): void => {
    this.clearLongPress()
  }

  private onContextMenu = (e: Event): void => {
    this.clearLongPress()
    // Long-press on some mobile browsers fires contextmenu; suppress it when showing a tooltip
    if (RrrTooltip.activeOwner === this) {
      e.preventDefault()
    }
  }

  private onTriggerClick = (e: Event): void => {
    if (this.suppressNextClick) {
      this.suppressNextClick = false
      e.preventDefault()
      e.stopPropagation()
    }
  }
}

// ─── Viewport-change dismiss ──────────────────────────────────────────────────
// Registered once at module load time. Hides any open tooltip immediately when
// the viewport resizes, scrolls, or the orientation changes — cached positions
// are invalid after any of these.

window.addEventListener('resize', RrrTooltip.hide, { passive: true })
window.addEventListener('scroll', RrrTooltip.hide, { passive: true, capture: true })
window.addEventListener('orientationchange', RrrTooltip.hide)

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerRrrTooltip(): void {
  defineCustomElementOnce('rrr-tooltip', RrrTooltip)
}
