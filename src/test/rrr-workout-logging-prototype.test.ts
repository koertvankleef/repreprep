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
    }

    component.activateCurrentTimelineItem()

    const initialActive = element.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(initialActive).toBeTruthy()
    expect(initialActive?.dataset.motion).toBe('entering')

    const patched = component.patchTimelineStateInPlace()
    expect(patched).toBe(true)

    const activeAfterPatch = element.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(activeAfterPatch).toBe(initialActive)
    expect(activeAfterPatch?.dataset.motion).toBe('entering')
  })

  it('sets exiting and entering once on active switch, then remains stable', () => {
    const element = document.createElement('rrr-workout-logging-prototype') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activeTimelineIndex: number
      stage: string
      activateCurrentTimelineItem: () => void
      patchTimelineStateInPlace: () => boolean
      clearTimers: () => void
    }

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

    component.patchTimelineStateInPlace()
    expect(previousActive?.dataset.motion).toBe('exiting')
    expect(currentActive?.dataset.motion).toBe('entering')

    component.clearTimers()
  })

  it('keeps the confirm label aligned with the current rep value', () => {
    const element = document.createElement('rrr-workout-logging-prototype') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activateCurrentTimelineItem: () => void
      adjustRepValue: (delta: number) => void
      clearTimers: () => void
    }

    component.activateCurrentTimelineItem()

    const confirmButtonBefore = element.shadowRoot?.querySelector<HTMLElement>('.rep-confirm-action')
    expect(confirmButtonBefore?.textContent).toBe('Log 12 reps')

    component.adjustRepValue(1)

    const confirmButtonAfter = element.shadowRoot?.querySelector<HTMLElement>('.rep-confirm-action')
    const repValue = element.shadowRoot?.querySelector<HTMLElement>('.rep-value')
    expect(repValue?.textContent).toBe('13 reps')
    expect(confirmButtonAfter?.textContent).toBe('Log 13 reps')
    expect(confirmButtonAfter?.getAttribute('aria-label')).toBe('Log 13 reps')

    component.clearTimers()
  })

  it('announces the logged result without exposing countdown noise', () => {
    const element = document.createElement('rrr-workout-logging-prototype') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activateCurrentTimelineItem: () => void
      confirmRepResult: () => void
      clearTimers: () => void
    }

    component.activateCurrentTimelineItem()
    component.confirmRepResult()

    const announcement = element.shadowRoot?.querySelector<HTMLElement>('[data-role="workout-announcement"]')
    const countdownHint = element.shadowRoot?.querySelector<HTMLElement>('.rep-grace-hint')
    expect(announcement?.textContent).toBe('12 reps logged. Rest starts soon.')
    expect(countdownHint?.getAttribute('aria-live')).toBeNull()

    component.clearTimers()
  })
})
