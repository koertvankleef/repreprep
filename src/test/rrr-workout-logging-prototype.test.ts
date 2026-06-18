import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import '../app/components/rrr-workout-logging-prototype.ts'

describe('rrr-workout-logging-prototype motion invariants', () => {
  beforeAll(() => {
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        value: () => {},
        writable: true,
      })
    }
  })

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('does not re-trigger motion cleanup when active item stays the same', () => {
    const element = document.createElement('rrr-workout-logging-prototype') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activateCurrentTimelineItem: () => void
      patchTimelineStateInPlace: () => boolean
      scheduleMotionCleanup: () => void
    }

    const motionCleanupSpy = vi.spyOn(component, 'scheduleMotionCleanup')

    component.activateCurrentTimelineItem()

    const initialActive = element.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(initialActive).toBeTruthy()
    expect(initialActive?.dataset.motion).toBe('entering')
    expect(motionCleanupSpy).toHaveBeenCalledTimes(1)

    const patched = component.patchTimelineStateInPlace()
    expect(patched).toBe(true)

    const activeAfterPatch = element.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(activeAfterPatch).toBe(initialActive)
    expect(activeAfterPatch?.dataset.motion).toBe('entering')
    expect(motionCleanupSpy).toHaveBeenCalledTimes(1)
  })

  it('sets exiting and entering once on active switch, then remains stable', () => {
    const element = document.createElement('rrr-workout-logging-prototype') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activeTimelineIndex: number
      stage: string
      activateCurrentTimelineItem: () => void
      patchTimelineStateInPlace: () => boolean
      scheduleMotionCleanup: () => void
      clearTimers: () => void
    }

    const motionCleanupSpy = vi.spyOn(component, 'scheduleMotionCleanup')
    component.activateCurrentTimelineItem()

    const previousActive = element.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(previousActive).toBeTruthy()

    component.activeTimelineIndex = 1
    component.stage = 'rest-paused'
    const patchedOnSwitch = component.patchTimelineStateInPlace()

    expect(patchedOnSwitch).toBe(true)

    const currentActive = element.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(currentActive).toBeTruthy()
    expect(currentActive).not.toBe(previousActive)
    expect(currentActive?.classList.contains('timeline-item--rest')).toBe(true)

    expect(previousActive?.dataset.motion).toBe('exiting')
    expect(currentActive?.dataset.motion).toBe('entering')
    expect(motionCleanupSpy).toHaveBeenCalledTimes(2)

    component.patchTimelineStateInPlace()
    expect(previousActive?.dataset.motion).toBe('exiting')
    expect(currentActive?.dataset.motion).toBe('entering')
    expect(motionCleanupSpy).toHaveBeenCalledTimes(2)

    component.clearTimers()
  })
})
