export type FocusChangeReason =
  | 'gesture'
  | 'wheel'
  | 'keyboard'
  | 'programmatic'
  | 'filter'
  | 'initial'

export type FocusSequenceState<TItem> = {
  items: TItem[]
  focusedIndex: number
  targetIndex: number
  visualPosition: number
  isTransitioning: boolean
}

export type FocusSequenceOptions = {
  animate?: boolean
  reason?: FocusChangeReason
}

export type FocusChangeEvent<TItem> = {
  index: number
  item: TItem
  reason: FocusChangeReason
}

type StateListener<TItem> = (state: FocusSequenceState<TItem>) => void
type FocusListener<TItem> = (event: FocusChangeEvent<TItem>) => void

const DEFAULT_TRANSITION_MS = 240
const FOCUS_THRESHOLD = 0.55
const BOUNDARY_RESISTANCE = 0.22

export class FocusedSequenceController<TItem> {
  private itemsValue: TItem[] = []
  private focusedIndexValue = 0
  private targetIndexValue = 0
  private visualPositionValue = 0
  private isTransitioningValue = false
  private gestureOffset = 0
  private animationFrame = 0
  private animationStartedAt = 0
  private animationFrom = 0
  private animationTo = 0
  private readonly stateListeners = new Set<StateListener<TItem>>()
  private readonly focusListeners = new Set<FocusListener<TItem>>()

  constructor(private readonly prefersReducedMotion: () => boolean = () => false) {}

  get state(): FocusSequenceState<TItem> {
    return {
      items: this.itemsValue,
      focusedIndex: this.focusedIndexValue,
      targetIndex: this.targetIndexValue,
      visualPosition: this.visualPositionValue,
      isTransitioning: this.isTransitioningValue,
    }
  }

  setItems(items: TItem[], options: FocusSequenceOptions & { focusedIndex?: number } = {}): void {
    this.cancelAnimation()
    this.itemsValue = [...items]
    const nextIndex = clampIndex(options.focusedIndex ?? this.focusedIndexValue, this.itemsValue.length)
    const reason = options.reason ?? 'programmatic'
    const focusChanged = nextIndex !== this.focusedIndexValue

    this.focusedIndexValue = nextIndex
    this.targetIndexValue = nextIndex
    this.gestureOffset = 0

    if (options.animate && !this.prefersReducedMotion()) {
      this.animateVisualPosition(nextIndex, reason)
    } else {
      this.visualPositionValue = nextIndex
      this.isTransitioningValue = false
      this.emitState()
    }

    if (focusChanged) {
      this.emitFocus(reason)
    }
  }

  setFocusedIndex(index: number, options: FocusSequenceOptions = {}): void {
    if (this.itemsValue.length === 0) {
      return
    }

    const nextIndex = clampIndex(index, this.itemsValue.length)
    const reason = options.reason ?? 'programmatic'
    const focusChanged = nextIndex !== this.focusedIndexValue

    this.focusedIndexValue = nextIndex
    this.targetIndexValue = nextIndex
    this.gestureOffset = 0

    if (focusChanged) {
      this.emitFocus(reason)
    }

    if (options.animate && !this.prefersReducedMotion()) {
      this.animateVisualPosition(nextIndex, reason)
      return
    }

    this.cancelAnimation()
    this.visualPositionValue = nextIndex
    this.isTransitioningValue = false
    this.emitState()
  }

  focusNext(options: FocusSequenceOptions = {}): void {
    this.setFocusedIndex(this.focusedIndexValue + 1, options)
  }

  focusPrevious(options: FocusSequenceOptions = {}): void {
    this.setFocusedIndex(this.focusedIndexValue - 1, options)
  }

  applyGestureDelta(deltaItems: number, reason: FocusChangeReason): boolean {
    if (this.itemsValue.length === 0 || deltaItems === 0) {
      return false
    }

    this.cancelAnimation()
    const previousVisualPosition = this.visualPositionValue
    this.gestureOffset += deltaItems
    this.commitThresholdCrossings(reason)
    this.visualPositionValue = this.focusedIndexValue + this.resistedGestureOffset()
    this.targetIndexValue = this.focusedIndexValue
    this.isTransitioningValue = false
    this.emitState()

    return Math.abs(this.visualPositionValue - previousVisualPosition) > 0.001
  }

  snapToFocused(options: FocusSequenceOptions = {}): void {
    this.gestureOffset = 0
    this.setFocusedIndex(this.focusedIndexValue, {
      animate: options.animate ?? true,
      reason: options.reason ?? 'gesture',
    })
  }

  canMove(deltaItems: number): boolean {
    return (deltaItems < 0 && this.focusedIndexValue > 0)
      || (deltaItems > 0 && this.focusedIndexValue < this.itemsValue.length - 1)
  }

  boundaryOverflow(deltaItems: number): number {
    if (this.canMove(deltaItems)) {
      return 0
    }

    const outwardAtStart = this.focusedIndexValue === 0 && deltaItems < 0
    const outwardAtEnd = this.focusedIndexValue === this.itemsValue.length - 1 && deltaItems > 0

    if (!outwardAtStart && !outwardAtEnd) {
      return 0
    }

    return Math.abs(this.gestureOffset + deltaItems)
  }

  onStateChange(listener: StateListener<TItem>): () => void {
    this.stateListeners.add(listener)
    listener(this.state)

    return () => this.stateListeners.delete(listener)
  }

  onFocusChange(listener: FocusListener<TItem>): () => void {
    this.focusListeners.add(listener)

    return () => this.focusListeners.delete(listener)
  }

  destroy(): void {
    this.cancelAnimation()
    this.stateListeners.clear()
    this.focusListeners.clear()
  }

  private commitThresholdCrossings(reason: FocusChangeReason): void {
    while (this.gestureOffset >= FOCUS_THRESHOLD && this.focusedIndexValue < this.itemsValue.length - 1) {
      this.focusedIndexValue += 1
      this.gestureOffset -= 1
      this.emitFocus(reason)
    }

    while (this.gestureOffset <= -FOCUS_THRESHOLD && this.focusedIndexValue > 0) {
      this.focusedIndexValue -= 1
      this.gestureOffset += 1
      this.emitFocus(reason)
    }
  }

  private resistedGestureOffset(): number {
    const minOffset = -this.focusedIndexValue
    const maxOffset = this.itemsValue.length - 1 - this.focusedIndexValue

    if (this.gestureOffset < minOffset) {
      return minOffset + (this.gestureOffset - minOffset) * BOUNDARY_RESISTANCE
    }

    if (this.gestureOffset > maxOffset) {
      return maxOffset + (this.gestureOffset - maxOffset) * BOUNDARY_RESISTANCE
    }

    return this.gestureOffset
  }

  private animateVisualPosition(targetIndex: number, reason: FocusChangeReason): void {
    this.cancelAnimation()

    if (this.prefersReducedMotion()) {
      this.visualPositionValue = targetIndex
      this.isTransitioningValue = false
      this.emitState()
      return
    }

    this.animationFrom = this.visualPositionValue
    this.animationTo = targetIndex
    this.animationStartedAt = performance.now()
    this.targetIndexValue = targetIndex
    this.isTransitioningValue = true
    this.emitState()

    const step = (timestamp: number): void => {
      const elapsedRatio = Math.min(1, (timestamp - this.animationStartedAt) / DEFAULT_TRANSITION_MS)
      const easedRatio = easeOutCubic(elapsedRatio)
      this.visualPositionValue = this.animationFrom + (this.animationTo - this.animationFrom) * easedRatio

      if (elapsedRatio >= 1) {
        this.animationFrame = 0
        this.visualPositionValue = this.animationTo
        this.isTransitioningValue = false
        this.emitState()
        return
      }

      this.emitState()
      this.animationFrame = requestAnimationFrame(step)
    }

    this.animationFrame = requestAnimationFrame(step)
  }

  private cancelAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = 0
    }

    this.isTransitioningValue = false
  }

  private emitState(): void {
    const state = this.state
    this.stateListeners.forEach((listener) => listener(state))
  }

  private emitFocus(reason: FocusChangeReason): void {
    const item = this.itemsValue[this.focusedIndexValue]

    if (!item) {
      return
    }

    this.focusListeners.forEach((listener) => listener({
      index: this.focusedIndexValue,
      item,
      reason,
    }))
  }
}

function clampIndex(index: number, itemCount: number): number {
  if (itemCount === 0) {
    return 0
  }

  return Math.min(Math.max(0, index), itemCount - 1)
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3)
}
