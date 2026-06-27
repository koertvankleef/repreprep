import { describe, expect, it, vi } from 'vitest'
import { FocusedSequenceController } from '../app/focused-sequence-controller.ts'

describe('FocusedSequenceController', () => {
  it('tracks fractional visual position without changing focus inside the threshold', () => {
    const controller = new FocusedSequenceController<string>()
    controller.setItems(['a', 'b', 'c'], { focusedIndex: 1, reason: 'initial' })

    controller.setVisualPosition(1.54)

    expect(controller.state).toEqual({
      items: ['a', 'b', 'c'],
      focusedIndex: 1,
      visualPosition: 1.54,
    })
  })

  it('changes logical focus with hysteresis as visual position crosses thresholds', () => {
    const controller = new FocusedSequenceController<string>()
    controller.setItems(['a', 'b', 'c'], { focusedIndex: 0, reason: 'initial' })

    controller.setVisualPosition(0.55)
    expect(controller.state.focusedIndex).toBe(1)

    controller.setVisualPosition(0.46)
    expect(controller.state.focusedIndex).toBe(1)

    controller.setVisualPosition(0.45)
    expect(controller.state.focusedIndex).toBe(0)
  })

  it('clamps position and can cross multiple focused items in one update', () => {
    const controller = new FocusedSequenceController<string>()
    controller.setItems(['a', 'b', 'c', 'd'], { reason: 'initial' })

    controller.setVisualPosition(99)

    expect(controller.state.focusedIndex).toBe(3)
    expect(controller.state.visualPosition).toBe(3)
  })

  it('emits focus only when the focused item identity changes', () => {
    const controller = new FocusedSequenceController<{ id: string }>()
    const first = { id: 'first' }
    const second = { id: 'second' }
    const listener = vi.fn()

    controller.setItems([first, second], { focusedIndex: 1, reason: 'initial' })
    controller.onFocusChange(listener)
    controller.setItems([first, second], { focusedIndex: 1, reason: 'filter' })
    expect(listener).not.toHaveBeenCalled()

    controller.setItems([first], { focusedIndex: 0, reason: 'filter' })
    expect(listener).toHaveBeenCalledWith({
      index: 0,
      item: first,
      reason: 'filter',
    })
  })
})
