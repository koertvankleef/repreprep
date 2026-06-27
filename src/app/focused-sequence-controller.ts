export type FocusChangeReason = 'scroll' | 'filter' | 'initial'

export type FocusSequenceState<TItem> = {
  items: TItem[]
  focusedIndex: number
  visualPosition: number
}

export type FocusChangeEvent<TItem> = {
  index: number
  item: TItem
  reason: FocusChangeReason
}

type StateListener<TItem> = (state: FocusSequenceState<TItem>) => void
type FocusListener<TItem> = (event: FocusChangeEvent<TItem>) => void

const FOCUS_THRESHOLD = 0.55

export class FocusedSequenceController<TItem> {
  private itemsValue: TItem[] = []
  private focusedIndexValue = 0
  private visualPositionValue = 0
  private readonly stateListeners = new Set<StateListener<TItem>>()
  private readonly focusListeners = new Set<FocusListener<TItem>>()

  get state(): FocusSequenceState<TItem> {
    return {
      items: this.itemsValue,
      focusedIndex: this.focusedIndexValue,
      visualPosition: this.visualPositionValue,
    }
  }

  setItems(
    items: TItem[],
    options: { focusedIndex?: number; reason?: FocusChangeReason } = {},
  ): void {
    const previousFocusedItem = this.itemsValue[this.focusedIndexValue]
    const nextIndex = clampIndex(options.focusedIndex ?? this.focusedIndexValue, items.length)

    this.itemsValue = [...items]
    this.focusedIndexValue = nextIndex
    this.visualPositionValue = nextIndex
    this.emitState()

    if (previousFocusedItem !== this.itemsValue[nextIndex]) {
      this.emitFocus(options.reason ?? 'filter')
    }
  }

  setVisualPosition(position: number, reason: FocusChangeReason = 'scroll'): void {
    if (this.itemsValue.length === 0) {
      return
    }

    const previousFocusedIndex = this.focusedIndexValue
    this.visualPositionValue = clamp(position, 0, this.itemsValue.length - 1)

    while (
      this.visualPositionValue - this.focusedIndexValue >= FOCUS_THRESHOLD
      && this.focusedIndexValue < this.itemsValue.length - 1
    ) {
      this.focusedIndexValue += 1
    }

    while (
      this.visualPositionValue - this.focusedIndexValue <= -FOCUS_THRESHOLD
      && this.focusedIndexValue > 0
    ) {
      this.focusedIndexValue -= 1
    }

    if (this.focusedIndexValue !== previousFocusedIndex) {
      this.emitFocus(reason)
    }

    this.emitState()
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
  return itemCount === 0 ? 0 : clamp(index, 0, itemCount - 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max)
}
