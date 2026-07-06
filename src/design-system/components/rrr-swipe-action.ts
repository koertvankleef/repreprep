import { escapeHtml } from '../../utils/html.ts'
import { defineCustomElementOnce } from './shared.ts'
import { registerRrrIcon } from './rrr-icon.ts'

const intentThreshold = 8
const commitThreshold = 96
const armedHapticDuration = 10
const interactiveExclusionSelector = [
  '[data-no-swipe]',
  '[data-sort-handle]',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
].join(',')

export type SwipeActionCommitDetail = {
  action: string
}

type PointerGesture = {
  pointerId: number
  startX: number
  startY: number
  locked: boolean
  armedFeedbackGiven: boolean
}

export class RrrSwipeAction extends HTMLElement {
  static observedAttributes = [
    'action',
    'action-label',
    'disabled',
    'direction',
    'icon',
    'tone',
  ]

  private static activeInstance: RrrSwipeAction | null = null

  private actionButton: HTMLButtonElement | null = null
  private content: HTMLElement | null = null
  private gesture: PointerGesture | null = null
  private initialized = false
  private suppressClick = false

  connectedCallback(): void {
    if (!this.initialized) {
      this.initialize()
    }

    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
    this.addEventListener('pointercancel', this.handlePointerCancel)
    this.addEventListener('click', this.handleClickCapture, true)
    this.syncAction()
    this.close()
  }

  disconnectedCallback(): void {
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointermove', this.handlePointerMove)
    this.removeEventListener('pointerup', this.handlePointerUp)
    this.removeEventListener('pointercancel', this.handlePointerCancel)
    this.removeEventListener('click', this.handleClickCapture, true)
    if (RrrSwipeAction.activeInstance === this) {
      RrrSwipeAction.activeInstance = null
    }
    this.gesture = null
  }

  attributeChangedCallback(): void {
    if (this.initialized) {
      this.syncAction()
    }
  }

  close(): void {
    this.gesture = null
    this.removeAttribute('data-swipe-dragging')
    this.dataset.swipeState = 'closed'
    this.style.setProperty('--rrr-swipe-action-translate', '0px')
    if (RrrSwipeAction.activeInstance === this) {
      RrrSwipeAction.activeInstance = null
    }
  }

  private initialize(): void {
    const projectedNodes = Array.from(this.childNodes)
    const actionSurface = document.createElement('div')
    actionSurface.className = 'rrr-swipe-action__surface'
    actionSurface.setAttribute('aria-hidden', 'true')

    const actionButton = document.createElement('button')
    actionButton.className = 'rrr-swipe-action__button'
    actionButton.type = 'button'
    actionButton.tabIndex = -1
    actionButton.addEventListener('click', () => this.commit())
    actionSurface.append(actionButton)

    const content = document.createElement('div')
    content.className = 'rrr-swipe-action__content'
    content.append(...projectedNodes)

    this.replaceChildren(actionSurface, content)
    this.actionButton = actionButton
    this.content = content
    this.initialized = true
  }

  private syncAction(): void {
    if (!this.actionButton) {
      return
    }

    const label = this.getAttribute('action-label') ?? this.getAttribute('action') ?? ''
    const icon = this.getAttribute('icon') ?? this.getAttribute('action') ?? 'delete'
    this.actionButton.disabled = this.hasAttribute('disabled')
    this.actionButton.setAttribute('aria-label', label)
    this.actionButton.innerHTML = `<rrr-icon name="${escapeHtml(icon)}"></rrr-icon>`
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (
      this.hasAttribute('disabled')
      || this.gesture
      || event.button !== 0
      || event.isPrimary === false
      || !this.content
      || !event.composedPath().includes(this.content)
      || this.startsFromExcludedControl(event)
    ) {
      return
    }

    this.gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      locked: false,
      armedFeedbackGiven: false,
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const gesture = this.gesture
    if (!gesture || gesture.pointerId !== event.pointerId || !this.content) {
      return
    }

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY

    if (!gesture.locked) {
      if (
        Math.abs(deltaX) < intentThreshold
        && Math.abs(deltaY) < intentThreshold
      ) {
        return
      }

      if (
        Math.abs(deltaY) >= Math.abs(deltaX)
        || this.getLogicalDistance(deltaX) <= 0
      ) {
        this.gesture = null
        return
      }

      gesture.locked = true
      RrrSwipeAction.activeInstance?.close()
      RrrSwipeAction.activeInstance = this
      this.setAttribute('data-swipe-dragging', '')
      if (typeof this.content.setPointerCapture === 'function') {
        this.content.setPointerCapture(event.pointerId)
      }
    }

    event.preventDefault()
    const distance = Math.min(
      this.getLogicalDistance(deltaX),
      this.getMaximumDistance(),
    )
    const armed = distance >= this.getCommitThreshold()
    if (armed && !gesture.armedFeedbackGiven) {
      gesture.armedFeedbackGiven = true
      navigator.vibrate?.(armedHapticDuration)
    }
    this.dataset.swipeState = armed ? 'armed' : 'revealing'
    this.style.setProperty(
      '--rrr-swipe-action-translate',
      `${distance * this.getPhysicalDirection()}px`,
    )
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return
    }

    const locked = gesture.locked
    const armed = this.dataset.swipeState === 'armed'
    this.gesture = null

    if (!locked) {
      return
    }

    event.preventDefault()
    this.suppressNextClick()
    this.removeAttribute('data-swipe-dragging')

    if (armed) {
      this.dataset.swipeState = 'committed'
      this.style.setProperty(
        '--rrr-swipe-action-translate',
        `${this.getMaximumDistance() * this.getPhysicalDirection()}px`,
      )
      this.actionButton?.click()
      return
    }

    this.close()
  }

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.gesture?.pointerId === event.pointerId) {
      if (this.gesture.locked) {
        this.suppressNextClick()
      }
      this.close()
    }
  }

  private readonly handleClickCapture = (event: Event): void => {
    if (this.suppressClick && !event.composedPath().includes(this.actionButton as EventTarget)) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  private startsFromExcludedControl(event: Event): boolean {
    return event.composedPath().some((node) =>
      node instanceof Element
      && (
        node === this.actionButton
        || node.matches(interactiveExclusionSelector)
      ))
  }

  private getLogicalDistance(deltaX: number): number {
    return deltaX * this.getPhysicalDirection()
  }

  private getPhysicalDirection(): 1 | -1 {
    const inlineEndDirection = getComputedStyle(this).direction === 'rtl' ? 1 : -1
    return this.getAttribute('direction') === 'start-to-end'
      ? inlineEndDirection === 1 ? -1 : 1
      : inlineEndDirection
  }

  private getCommitThreshold(): number {
    return commitThreshold
  }

  private getMaximumDistance(): number {
    return Math.max(this.getBoundingClientRect().width, 1)
  }

  private suppressNextClick(): void {
    this.suppressClick = true
    window.setTimeout(() => {
      this.suppressClick = false
    }, 0)
  }

  private commit(): void {
    if (this.hasAttribute('disabled')) {
      this.close()
      return
    }

    this.dispatchEvent(new CustomEvent<SwipeActionCommitDetail>(
      'rrr-swipe-action-commit',
      {
        bubbles: true,
        composed: true,
        detail: {
          action: this.getAttribute('action') ?? '',
        },
      },
    ))

    queueMicrotask(() => {
      if (this.isConnected && this.dataset.swipeState === 'committed') {
        this.close()
      }
    })
  }
}

export function registerRrrSwipeAction(): void {
  registerRrrIcon()
  defineCustomElementOnce('rrr-swipe-action', RrrSwipeAction)
}
