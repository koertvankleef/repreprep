import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import '../app/components/workouts/logging/rrr-workout-logging-flow.ts'

describe('rrr-workout-logging-flow motion invariants', () => {
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
    const element = document.createElement('rrr-workout-logging-flow') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activateCurrentTimelineItem: () => void
      patchTimelineStateInPlace: () => boolean
    }

    component.activateCurrentTimelineItem()

    const initialActive = element.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(initialActive).toBeTruthy()
    expect(initialActive?.dataset.motion).toBe('entering')

    const patched = component.patchTimelineStateInPlace()
    expect(patched).toBe(true)

    const activeAfterPatch = element.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(activeAfterPatch).toBe(initialActive)
    expect(activeAfterPatch?.dataset.motion).toBe('entering')
  })

  it('sets exiting and entering once on active switch, then remains stable', () => {
    const element = document.createElement('rrr-workout-logging-flow') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activeTimelineIndex: number
      stage: string
      activateCurrentTimelineItem: () => void
      patchTimelineStateInPlace: () => boolean
      clearTimers: () => void
    }

    component.activateCurrentTimelineItem()

    const previousActive = element.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    expect(previousActive).toBeTruthy()

    component.activeTimelineIndex = 1
    component.stage = 'rest-paused'
    const patchedOnSwitch = component.patchTimelineStateInPlace()

    expect(patchedOnSwitch).toBe(true)

    const currentActive = element.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
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
    const element = document.createElement('rrr-workout-logging-flow') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activateCurrentTimelineItem: () => void
      adjustRepValue: (delta: number) => void
      clearTimers: () => void
    }

    component.activateCurrentTimelineItem()

    const confirmButtonBefore = element.querySelector<HTMLElement>('.rep-confirm-action')
    expect(confirmButtonBefore?.textContent).toBe('Log 12 reps')

    component.adjustRepValue(1)

    const confirmButtonAfter = element.querySelector<HTMLElement>('.rep-confirm-action')
    const repValue = element.querySelector<HTMLElement>('.rep-value')
    expect(repValue?.textContent).toBe('13 reps')
    expect(confirmButtonAfter?.textContent).toBe('Log 13 reps')
    expect(confirmButtonAfter?.getAttribute('aria-label')).toBe('Log 13 reps')

    component.clearTimers()
  })

  it('announces the logged result without exposing countdown noise', () => {
    const element = document.createElement('rrr-workout-logging-flow') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      activateCurrentTimelineItem: () => void
      confirmRepResult: () => void
      clearTimers: () => void
    }

    component.activateCurrentTimelineItem()
    component.confirmRepResult()

    const announcement = element.querySelector<HTMLElement>('[data-role="workout-announcement"]')
    const countdownHint = element.querySelector<HTMLElement>('.rep-grace-hint')
    expect(announcement?.textContent).toBe('12 reps logged. Rest starts soon.')
    expect(countdownHint?.getAttribute('aria-live')).toBeNull()

    component.clearTimers()
  })

  it('renders completion as active and emits finish event for handoff', () => {
    const element = document.createElement('rrr-workout-logging-flow') as HTMLElement & Record<string, unknown>
    document.body.appendChild(element)

    const component = element as unknown as {
      stage: string
      render: () => void
    }

    const finishedSpy = vi.fn()
    element.addEventListener('rrr-workout-flow-finished', finishedSpy)

    component.stage = 'workout-complete'
    component.render()

    const completionCard = element.querySelector<HTMLElement>('.timeline-item--complete')
    expect(completionCard).toBeTruthy()
    expect(completionCard?.dataset.state).toBe('active')

    const finishButton = completionCard?.querySelector<HTMLElement>('rrr-button[data-action="finish-workout"]')
    expect(finishButton).toBeTruthy()
    finishButton?.click()
    expect(finishedSpy).toHaveBeenCalledTimes(1)
  })
})
