import type { TimelineState } from './rrr-workout-logging-prototype-model.ts'
import { ManagedTimer } from './rrr-workout-logging-prototype-runtime.ts'

export class TimelineMotionController {
  private static readonly DEFAULT_STATE_TRANSITION_MS = 180
  private static readonly STATE_TRANSITION_BUFFER_MS = 60

  private readonly cleanupTimer = new ManagedTimer()

  constructor(private readonly host: HTMLElement) {}

  dispose(): void {
    this.cleanupTimer.clear()
  }

  markExitingBeforeStateChange(element: HTMLElement | null, timelineState: TimelineState): void {
    if (element && timelineState !== 'active') {
      element.dataset.motion = 'exiting'
    }
  }

  sync(root: ShadowRoot, previousActive: HTMLElement | null, currentActive: HTMLElement | null): void {
    if (previousActive === currentActive) {
      return
    }

    root.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
      if (element !== previousActive && element !== currentActive) {
        element.removeAttribute('data-motion')
      }
    })

    if (previousActive) {
      previousActive.dataset.motion = 'exiting'
    }
    if (currentActive) {
      currentActive.dataset.motion = 'entering'
    }

    this.scheduleCleanup(root)
  }

  private scheduleCleanup(root: ShadowRoot): void {
    const cleanupDelay = Math.max(
      this.getTransitionDurationMs('--proto-transition-duration'),
      this.getTransitionDurationMs('--proto-transition-duration-exit'),
    ) + TimelineMotionController.STATE_TRANSITION_BUFFER_MS

    this.cleanupTimer.timeout(() => {
      root.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
        element.removeAttribute('data-motion')
      })
    }, cleanupDelay)
  }

  private getTransitionDurationMs(variableName: '--proto-transition-duration' | '--proto-transition-duration-exit'): number {
    const rawDuration = getComputedStyle(this.host).getPropertyValue(variableName).trim()
    const durationMatch = rawDuration.match(/^(\d*\.?\d+)(ms|s)$/)

    if (!durationMatch) {
      return TimelineMotionController.DEFAULT_STATE_TRANSITION_MS
    }

    const numericPart = durationMatch[1] ?? ''
    const unit = durationMatch[2] ?? 'ms'
    const parsed = Number.parseFloat(numericPart)

    if (Number.isNaN(parsed)) {
      return TimelineMotionController.DEFAULT_STATE_TRANSITION_MS
    }

    return unit === 's' ? parsed * 1000 : parsed
  }
}
