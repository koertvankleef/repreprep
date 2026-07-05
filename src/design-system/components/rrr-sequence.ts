import { defineCustomElementOnce } from './shared.ts'

const sequenceItemSelector = 'rrr-list-row, rrr-sequence-gutter, [data-sequence-item]'
const sortItemSelector = ':scope > [data-sort-id]'
const sortHandleSelector = '[data-sort-handle]'
const pointerSortThreshold = 6

export type SequenceSortInput = 'keyboard' | 'pointer'
export type SequenceSortStatus = 'lifted' | 'moved' | 'dropped' | 'cancelled'

export type SequenceSortStatusDetail = {
  status: SequenceSortStatus
  id: string
  label: string
  position: number
  count: number
  input: SequenceSortInput
}

export type SequenceReorderDetail = {
  orderedIds: string[]
  movedId: string
  input: SequenceSortInput
}

type ActiveSort = {
  item: HTMLElement
  id: string
  label: string
  input: SequenceSortInput
  originalChildren: Element[]
  originalIds: string[]
  pointerId: number | null
  pointerStartX: number
  pointerStartY: number
  pointerItemTop: number
  started: boolean
}

export class RrrSequence extends HTMLElement {
  private activeSort: ActiveSort | null = null
  private gutterCollapsePending = false
  private gutterMotionFallbackId: number | null = null

  private readonly observer = new MutationObserver(() => {
    this.syncSemantics()
  })

  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'list')
    }

    this.observer.observe(this, { childList: true })
    this.addEventListener('keydown', this.handleKeyDown)
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
    this.addEventListener('pointercancel', this.handlePointerCancel)
    this.addEventListener('animationend', this.handleGutterMotionEnd)
    this.addEventListener('animationcancel', this.handleGutterMotionEnd)
    this.syncSemantics()
    this.initializeGutterMotion()
  }

  disconnectedCallback(): void {
    this.observer.disconnect()
    this.removeEventListener('keydown', this.handleKeyDown)
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointermove', this.handlePointerMove)
    this.removeEventListener('pointerup', this.handlePointerUp)
    this.removeEventListener('pointercancel', this.handlePointerCancel)
    this.removeEventListener('animationend', this.handleGutterMotionEnd)
    this.removeEventListener('animationcancel', this.handleGutterMotionEnd)
    if (this.gutterMotionFallbackId !== null) {
      window.clearTimeout(this.gutterMotionFallbackId)
      this.gutterMotionFallbackId = null
    }
    this.activeSort = null
  }

  private initializeGutterMotion(): void {
    if (this.dataset.gutterMotion !== 'collapse') {
      return
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => this.finishGutterCollapse())
      return
    }

    this.gutterCollapsePending = true
    this.setAttribute('aria-busy', 'true')
    this.gutterMotionFallbackId = window.setTimeout(
      () => this.finishGutterCollapse(),
      500,
    )
  }

  private readonly handleGutterMotionEnd = (event: Event): void => {
    if (
      this.gutterCollapsePending
      && event.target instanceof HTMLElement
      && event.target.parentElement === this
      && event.target.matches('rrr-sequence-gutter')
    ) {
      this.finishGutterCollapse()
    }
  }

  private finishGutterCollapse(): void {
    if (this.gutterMotionFallbackId !== null) {
      window.clearTimeout(this.gutterMotionFallbackId)
      this.gutterMotionFallbackId = null
    }

    this.gutterCollapsePending = false
    this.removeAttribute('aria-busy')
    this.dispatchEvent(new CustomEvent('rrr-sequence-reorder-ready', {
      bubbles: true,
      composed: true,
    }))
  }

  private syncSemantics(): void {
    for (const child of Array.from(this.children)) {
      if (child.matches(sequenceItemSelector) && !child.hasAttribute('role')) {
        child.setAttribute('role', 'listitem')
      }
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.hasAttribute('sortable') || this.gutterCollapsePending) {
      return
    }

    const handle = this.findSortHandle(event)
    if (!handle) {
      return
    }

    const item = handle.closest<HTMLElement>('[data-sort-id]')
    if (!item || item.parentElement !== this) {
      return
    }

    if (!this.activeSort && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault()
      this.beginSort(item, 'keyboard')
      return
    }

    const active = this.activeSort
    if (!active || active.input !== 'keyboard' || active.item !== item) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelSort()
      handle.focus()
      return
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      this.commitSort()
      return
    }

    if (
      event.key === 'ArrowUp'
      || event.key === 'ArrowDown'
      || event.key === 'Home'
      || event.key === 'End'
    ) {
      event.preventDefault()
      this.moveKeyboardItem(event.key)
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (
      !this.hasAttribute('sortable')
      || this.gutterCollapsePending
      || this.activeSort
      || event.button !== 0
      || event.isPrimary === false
    ) {
      return
    }

    const handle = this.findSortHandle(event)
    const item = handle?.closest<HTMLElement>('[data-sort-id]')
    if (!handle || !item || item.parentElement !== this) {
      return
    }

    this.activeSort = this.createSortState(item, 'pointer', {
      pointerId: event.pointerId,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      pointerItemTop: item.getBoundingClientRect().top,
    })
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const active = this.activeSort
    if (
      !active
      || active.input !== 'pointer'
      || active.pointerId !== event.pointerId
    ) {
      return
    }

    const deltaX = event.clientX - active.pointerStartX
    const deltaY = event.clientY - active.pointerStartY

    if (!active.started) {
      if (
        Math.abs(deltaY) < pointerSortThreshold
        && Math.abs(deltaX) < pointerSortThreshold
      ) {
        return
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.activeSort = null
        return
      }

      this.activateSort(active)
      const handle = this.findSortHandle(event)
      if (handle && typeof handle.setPointerCapture === 'function') {
        handle.setPointerCapture(event.pointerId)
      }
    }

    event.preventDefault()
    this.movePointerItem(event.clientY)
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const active = this.activeSort
    if (
      !active
      || active.input !== 'pointer'
      || active.pointerId !== event.pointerId
    ) {
      return
    }

    if (active.started) {
      event.preventDefault()
      this.commitSort()
      return
    }

    this.activeSort = null
  }

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    const active = this.activeSort
    if (
      active?.input === 'pointer'
      && active.pointerId === event.pointerId
    ) {
      this.cancelSort()
    }
  }

  private findSortHandle(event: Event): HTMLElement | undefined {
    return event
      .composedPath()
      .find((node): node is HTMLElement =>
        node instanceof HTMLElement
        && node.matches(sortHandleSelector))
  }

  private getSortItems(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(sortItemSelector))
      .filter((item) => item.dataset.sortId)
  }

  private createSortState(
    item: HTMLElement,
    input: SequenceSortInput,
    pointer?: {
      pointerId: number
      pointerStartX: number
      pointerStartY: number
      pointerItemTop: number
    },
  ): ActiveSort {
    return {
      item,
      id: item.dataset.sortId ?? '',
      label: item.dataset.sortLabel ?? '',
      input,
      originalChildren: Array.from(this.children),
      originalIds: this.getSortItems().map((candidate) => candidate.dataset.sortId ?? ''),
      pointerId: pointer?.pointerId ?? null,
      pointerStartX: pointer?.pointerStartX ?? 0,
      pointerStartY: pointer?.pointerStartY ?? 0,
      pointerItemTop: pointer?.pointerItemTop ?? item.getBoundingClientRect().top,
      started: false,
    }
  }

  private beginSort(item: HTMLElement, input: SequenceSortInput): void {
    const active = this.createSortState(item, input)
    this.activeSort = active
    this.activateSort(active)
  }

  private activateSort(active: ActiveSort): void {
    active.started = true
    this.setAttribute('data-sorting', active.input)
    active.item.setAttribute('data-sort-active', '')
    active.item.setAttribute('aria-grabbed', 'true')
    this.dispatchSortStatus('lifted')
  }

  private moveKeyboardItem(key: string): void {
    const active = this.activeSort
    if (!active) {
      return
    }

    const items = this.getSortItems()
    const currentIndex = items.indexOf(active.item)
    let targetIndex = currentIndex

    if (key === 'ArrowUp') {
      targetIndex = Math.max(0, currentIndex - 1)
    } else if (key === 'ArrowDown') {
      targetIndex = Math.min(items.length - 1, currentIndex + 1)
    } else if (key === 'Home') {
      targetIndex = 0
    } else if (key === 'End') {
      targetIndex = items.length - 1
    }

    if (targetIndex === currentIndex) {
      return
    }

    this.repositionItem(active.item, targetIndex)
    this.dispatchSortStatus('moved')
  }

  private movePointerItem(clientY: number): void {
    const active = this.activeSort
    if (!active) {
      return
    }

    const itemsWithoutActive = this.getSortItems().filter((item) => item !== active.item)
    let targetIndex = itemsWithoutActive.length

    for (let index = 0; index < itemsWithoutActive.length; index += 1) {
      const rect = itemsWithoutActive[index]?.getBoundingClientRect()
      if (rect && clientY < rect.top + rect.height / 2) {
        targetIndex = index
        break
      }
    }

    const currentIndex = this.getSortItems().indexOf(active.item)
    if (targetIndex !== currentIndex) {
      this.repositionItem(active.item, targetIndex)
      this.dispatchSortStatus('moved')
    }

    const desiredTop = active.pointerItemTop + (clientY - active.pointerStartY)
    active.item.style.removeProperty('translate')
    const baseTop = active.item.getBoundingClientRect().top
    active.item.style.translate = `0 ${desiredTop - baseTop}px`
  }

  private repositionItem(item: HTMLElement, targetIndex: number): void {
    const before = this.captureItemPositions()
    const candidates = this.getSortItems().filter((candidate) => candidate !== item)
    const target = candidates[targetIndex]

    item.style.removeProperty('translate')
    if (target) {
      this.insertBefore(item, target)
    } else {
      this.append(item)
    }
    this.animateItemMovement(before, item)
  }

  private captureItemPositions(): Map<HTMLElement, number> {
    return new Map(
      this.getSortItems().map((item) => [item, item.getBoundingClientRect().top]),
    )
  }

  private animateItemMovement(
    previousPositions: Map<HTMLElement, number>,
    activeItem: HTMLElement,
  ): void {
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || typeof Element.prototype.animate !== 'function'
    ) {
      return
    }

    for (const item of this.getSortItems()) {
      if (item === activeItem) {
        continue
      }

      const previousTop = previousPositions.get(item)
      if (previousTop === undefined) {
        continue
      }

      const delta = previousTop - item.getBoundingClientRect().top
      if (delta !== 0) {
        item.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: 180, easing: 'ease-out' },
        )
      }
    }
  }

  private commitSort(): void {
    const active = this.activeSort
    if (!active?.started) {
      this.activeSort = null
      return
    }

    const orderedIds = this.getSortItems().map((item) => item.dataset.sortId ?? '')
    const changed = orderedIds.some((id, index) => id !== active.originalIds[index])

    active.item.style.removeProperty('translate')
    if (!changed) {
      this.append(...active.originalChildren)
    }
    this.finishSortPresentation()
    this.dispatchSortStatus('dropped', active)
    this.activeSort = null

    if (changed) {
      this.dispatchEvent(new CustomEvent<SequenceReorderDetail>('rrr-sequence-reorder', {
        bubbles: true,
        composed: true,
        detail: {
          orderedIds,
          movedId: active.id,
          input: active.input,
        },
      }))
    }
  }

  private cancelSort(): void {
    const active = this.activeSort
    if (!active) {
      return
    }

    active.item.style.removeProperty('translate')
    this.append(...active.originalChildren)
    this.finishSortPresentation()
    this.dispatchSortStatus('cancelled', active)
    this.activeSort = null
  }

  private finishSortPresentation(): void {
    this.removeAttribute('data-sorting')
    this.querySelector<HTMLElement>('[data-sort-active]')?.removeAttribute('data-sort-active')
    this.querySelector<HTMLElement>('[aria-grabbed="true"]')?.removeAttribute('aria-grabbed')
  }

  private dispatchSortStatus(
    status: SequenceSortStatus,
    active = this.activeSort,
  ): void {
    if (!active) {
      return
    }

    const items = this.getSortItems()
    this.dispatchEvent(new CustomEvent<SequenceSortStatusDetail>('rrr-sequence-sort-status', {
      bubbles: true,
      composed: true,
      detail: {
        status,
        id: active.id,
        label: active.label,
        position: items.indexOf(active.item) + 1,
        count: items.length,
        input: active.input,
      },
    }))
  }
}

export function registerRrrSequence(): void {
  defineCustomElementOnce('rrr-sequence', RrrSequence)
}
