import styles from './rrr-workout-logging-prototype.css?inline'

type Exercise = {
  name: string
  loggingType: 'reps' | 'time'
  totalSets: number
  restSeconds: number
  previousPerformance: string
  suggestedReps?: number
  targetDurationSeconds?: number
}

type TimelineItem =
  | {
      kind: 'set'
      exerciseIndex: number
      setNumber: number
    }
  | {
      kind: 'rest'
      exerciseIndex: number
      setNumber: number
      durationSeconds: number
    }
  | {
      kind: 'transition'
      exerciseIndex: number
      durationSeconds: number
    }

type ActiveStage =
  | 'locked'
  | 'set'
  | 'set-debounce'
  | 'timed-ready'
  | 'timed-active'
  | 'set-grace'
  | 'rest'
  | 'rest-paused'
  | 'transition'
  | 'transition-paused'
  | 'workout-complete'

type WorkoutEvent =
  | {
      type: 'repResultConfirmed'
      exerciseIndex: number
      setNumber: number
      reps: number
    }
  | {
      type: 'timedSetStarted'
      exerciseIndex: number
      setNumber: number
      targetDurationSeconds: number
    }
  | {
      type: 'timedSetCompleted'
      exerciseIndex: number
      setNumber: number
      durationSeconds: number
      completionType: 'target-reached' | 'stopped-early'
    }

const EXERCISES: Exercise[] = [
  { name: 'Push-ups', loggingType: 'reps', totalSets: 3, restSeconds: 20, previousPerformance: '10 reps', suggestedReps: 12 },
  {
    name: 'Dumbbell Row',
    loggingType: 'reps',
    totalSets: 3,
    restSeconds: 20,
    previousPerformance: '12 reps @ 14kg',
    suggestedReps: 12,
  },
  { name: 'Plank', loggingType: 'time', totalSets: 1, restSeconds: 0, previousPerformance: '45 sec', targetDurationSeconds: 30 },
]

const EXERCISE_TRANSITION_SECONDS = 10
const REP_CONFIRM_GRACE_SECONDS = 5
const REP_ADJUST_AUTO_PROCEED_SECONDS = 3

function getExercise(index: number): Exercise {
  const exercise = EXERCISES[index]
  if (!exercise) {
    throw new Error(`Missing exercise at index ${index}`)
  }
  return exercise
}

function buildTimeline(): TimelineItem[] {
  const timeline: TimelineItem[] = []

  EXERCISES.forEach((exercise, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= exercise.totalSets; setNumber += 1) {
      timeline.push({ kind: 'set', exerciseIndex, setNumber })

      if (setNumber < exercise.totalSets) {
        timeline.push({ kind: 'rest', exerciseIndex, setNumber, durationSeconds: exercise.restSeconds })
      }
    }

    if (exerciseIndex < EXERCISES.length - 1) {
      timeline.push({ kind: 'transition', exerciseIndex, durationSeconds: EXERCISE_TRANSITION_SECONDS })
    }
  })

  return timeline
}

const TIMELINE = buildTimeline()

class ManagedTimer {
  private id: number | null = null

  interval(callback: () => void, ms: number): void {
    this.clear()
    this.id = window.setInterval(callback, ms)
  }

  timeout(callback: () => void, ms: number): void {
    this.clear()
    this.id = window.setTimeout(callback, ms)
  }

  clear(): void {
    if (this.id !== null) {
      clearInterval(this.id)
      this.id = null
    }
  }
}

export class RrrWorkoutLoggingPrototype extends HTMLElement {
  private static readonly DEFAULT_STATE_TRANSITION_MS = 180
  private static readonly STATE_TRANSITION_BUFFER_MS = 60

  private activeTimelineIndex = 0
  private repValue = getExercise(0).suggestedReps ?? 0
  private stage: ActiveStage = 'locked'
  private repAdjustmentDebounceRemainingSeconds = 0
  private timedSetElapsedSeconds = 0
  private restRemainingSeconds = 0
  private repConfirmGraceRemainingSeconds = REP_CONFIRM_GRACE_SECONDS
  private nextExerciseRemainingSeconds = EXERCISE_TRANSITION_SECONDS
  private readonly restTimer = new ManagedTimer()
  private readonly debounceTimer = new ManagedTimer()
  private readonly timedSetTimer = new ManagedTimer()
  private readonly graceTimer = new ManagedTimer()
  private readonly transitionTimer = new ManagedTimer()
  private readonly motionCleanupTimer = new ManagedTimer()
  private lastConfirmedSummary: string | null = null
  private readonly completedSetsByExercise = EXERCISES.map(() => 0)
  private overallProgressVisualPercent = 0

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
    this.shadowRoot?.addEventListener('click', this.handleClick)
  }

  disconnectedCallback(): void {
    this.shadowRoot?.removeEventListener('click', this.handleClick)
    this.motionCleanupTimer.clear()
    this.clearTimers()
  }

  private readonly handleClick = (event: Event): void => {
    const target = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)

    if (!target) {
      return
    }

    const action = target.dataset.action

    if (action === 'go') {
      this.activateCurrentTimelineItem()
      return
    }

    if (action === 'rep-minus') {
      this.adjustRepValue(-1)
      return
    }

    if (action === 'rep-plus') {
      this.adjustRepValue(1)
      return
    }

    if (action === 'done-set') {
      this.confirmRepResult()
      return
    }

    if (action === 'start-timed-set') {
      this.startTimedSet()
      return
    }

    if (action === 'stop-timed-set') {
      this.stopTimedSetEarly()
      return
    }

    if (action === 'edit-grace') {
      this.editDuringGrace()
      return
    }

    if (action === 'start-rest-now') {
      this.startRestNowFromGrace()
      return
    }

    if (action === 'pause-rest') {
      this.pauseRest()
      return
    }

    if (action === 'resume-rest') {
      this.resumeRest()
      return
    }

    if (action === 'skip-rest') {
      this.skipRest()
      return
    }

    if (action === 'stay-here') {
      this.pauseExerciseTransition()
      return
    }

    if (action === 'next-now' || action === 'next') {
      this.moveToNextTimelineItem()
    }
  }

  private adjustRepValue(delta: number): void {
    if (this.stage !== 'set' && this.stage !== 'set-debounce' && this.stage !== 'set-grace') {
      return
    }
    this.repValue = Math.max(0, this.repValue + delta)
    this.scheduleRepAdjustmentAutoProceed()
  }

  private confirmRepResult(source: 'explicit-confirm' | 'adjusted-auto' = 'explicit-confirm'): void {
    const currentItem = TIMELINE[this.activeTimelineIndex]
    if (
      !currentItem
      || currentItem.kind !== 'set'
      || (this.stage !== 'set' && this.stage !== 'set-debounce' && this.stage !== 'set-grace')
    ) {
      return
    }

    const exercise = getExercise(currentItem.exerciseIndex)
    if (exercise.loggingType !== 'reps') {
      return
    }

    this.debounceTimer.clear()
    this.repAdjustmentDebounceRemainingSeconds = 0
    this.completedSetsByExercise[currentItem.exerciseIndex] = currentItem.setNumber
    this.lastConfirmedSummary = source === 'adjusted-auto'
      ? `${this.repValue} reps logged (auto).`
      : `${this.repValue} reps logged.`
    this.emitWorkoutEvent({
      type: 'repResultConfirmed',
      exerciseIndex: currentItem.exerciseIndex,
      setNumber: currentItem.setNumber,
      reps: this.repValue,
    })
    this.syncOverallProgress()

    this.enterRepConfirmGracePeriod()
  }

  private startTimedSet(): void {
    const currentItem = this.currentItem()
    if (!currentItem || currentItem.kind !== 'set' || this.stage !== 'timed-ready') {
      return
    }

    const exercise = getExercise(currentItem.exerciseIndex)
    const targetDurationSeconds = exercise.targetDurationSeconds ?? 0
    if (exercise.loggingType !== 'time' || targetDurationSeconds <= 0) {
      return
    }

    this.timedSetTimer.clear()
    this.timedSetElapsedSeconds = 0
    this.stage = 'timed-active'
    this.emitWorkoutEvent({
      type: 'timedSetStarted',
      exerciseIndex: currentItem.exerciseIndex,
      setNumber: currentItem.setNumber,
      targetDurationSeconds,
    })

    this.timedSetTimer.interval(() => {
      this.timedSetElapsedSeconds += 1

      if (this.timedSetElapsedSeconds >= targetDurationSeconds) {
        this.completeTimedSet('target-reached')
        return
      }

        this.patchTimelineStateInPlace()
    }, 1000)

    if (!this.patchTimelineStateInPlace()) {
      this.render()
    }
  }

  private stopTimedSetEarly(): void {
    if (this.stage !== 'timed-active') {
      return
    }

    this.completeTimedSet('stopped-early')
  }

  private completeTimedSet(completionType: 'target-reached' | 'stopped-early'): void {
    const currentItem = this.currentItem()
    if (!currentItem || currentItem.kind !== 'set') {
      return
    }

    const exercise = getExercise(currentItem.exerciseIndex)
    const targetDurationSeconds = exercise.targetDurationSeconds ?? 0
    if (exercise.loggingType !== 'time') {
      return
    }

    const actualDurationSeconds = Math.max(0, Math.min(targetDurationSeconds, this.timedSetElapsedSeconds))

    this.timedSetTimer.clear()
    this.completedSetsByExercise[currentItem.exerciseIndex] = currentItem.setNumber
    this.lastConfirmedSummary = `${actualDurationSeconds} sec logged.`
    this.emitWorkoutEvent({
      type: 'timedSetCompleted',
      exerciseIndex: currentItem.exerciseIndex,
      setNumber: currentItem.setNumber,
      durationSeconds: actualDurationSeconds,
      completionType,
    })
    this.syncOverallProgress()

    this.enterRepConfirmGracePeriod()
  }

  private emitWorkoutEvent(detail: WorkoutEvent): void {
    this.dispatchEvent(
      new CustomEvent<WorkoutEvent>('rrr-workout-event', {
        detail,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private enterRepConfirmGracePeriod(): void {
    this.graceTimer.clear()
    this.debounceTimer.clear()
    this.repAdjustmentDebounceRemainingSeconds = 0
    this.timedSetTimer.clear()
    this.repConfirmGraceRemainingSeconds = REP_CONFIRM_GRACE_SECONDS
    this.stage = 'set-grace'

    this.graceTimer.interval(() => {
      this.repConfirmGraceRemainingSeconds -= 1
      if (this.repConfirmGraceRemainingSeconds <= 0) {
        this.graceTimer.clear()
        this.moveToNextTimelineItem()
        return
      }

        this.patchTimelineStateInPlace()
    }, 1000)

    this.transitionToCurrentActiveItem()
  }

  private scheduleRepAdjustmentAutoProceed(): void {
    if (this.stage !== 'set' && this.stage !== 'set-debounce' && this.stage !== 'set-grace') {
      return
    }

    const currentItem = this.currentItem()
    if (this.stage === 'set-grace' && currentItem && currentItem.kind === 'set') {
      this.graceTimer.clear()
      this.completedSetsByExercise[currentItem.exerciseIndex] = Math.max(0, currentItem.setNumber - 1)
      this.syncOverallProgress()
      this.lastConfirmedSummary = null
    }

    this.debounceTimer.clear()
    this.repAdjustmentDebounceRemainingSeconds = 0
    this.stage = 'set-debounce'
    this.repAdjustmentDebounceRemainingSeconds = REP_ADJUST_AUTO_PROCEED_SECONDS

    this.debounceTimer.interval(() => {
      this.repAdjustmentDebounceRemainingSeconds -= 1
      if (this.repAdjustmentDebounceRemainingSeconds <= 0) {
        this.debounceTimer.clear()
        this.repAdjustmentDebounceRemainingSeconds = 0
        this.confirmRepResult('adjusted-auto')
        return
      }

        this.patchTimelineStateInPlace()
    }, 1000)

    if (!this.patchTimelineStateInPlace()) {
      this.render()
    }
  }

  private editDuringGrace(): void {
    if (this.stage !== 'set-grace') {
      return
    }

    const currentItem = this.currentItem()
    if (!currentItem || currentItem.kind !== 'set') {
      return
    }

    this.graceTimer.clear()
    this.debounceTimer.clear()
    this.repAdjustmentDebounceRemainingSeconds = 0

    this.completedSetsByExercise[currentItem.exerciseIndex] = Math.max(0, currentItem.setNumber - 1)
    this.syncOverallProgress()

    const exercise = getExercise(currentItem.exerciseIndex)
    if (exercise.loggingType === 'time') {
      this.stage = 'timed-ready'
      this.timedSetElapsedSeconds = 0
    } else {
      this.stage = 'set'
    }

    this.lastConfirmedSummary = null
    this.transitionToCurrentActiveItem()
  }

  private startRestNowFromGrace(): void {
    if (this.stage !== 'set-grace') {
      return
    }

    this.graceTimer.clear()
    this.moveToNextTimelineItem()
  }

  private moveToNextTimelineItem(): void {
    if (this.activeTimelineIndex >= TIMELINE.length - 1) {
      this.clearTimers()
      this.stage = 'workout-complete'
      this.render()
      return
    }

    this.activeTimelineIndex += 1
    this.activateCurrentTimelineItem()
  }

  private activateCurrentTimelineItem(): void {
    // Defensively clear timers from the previously active item.
    // This prevents stale interval callbacks when users advance quickly.
    this.clearTimers()

    const item = TIMELINE[this.activeTimelineIndex]
    if (!item) {
      this.clearTimers()
      this.stage = 'workout-complete'
      this.render()
      return
    }

    if (item.kind === 'set') {
      this.lastConfirmedSummary = null

      const exercise = getExercise(item.exerciseIndex)
      if (exercise.loggingType === 'time') {
        this.stage = 'timed-ready'
        this.timedSetElapsedSeconds = 0
        this.transitionToCurrentActiveItem()
        return
      }

      this.stage = 'set'
      this.repValue = exercise.suggestedReps ?? 0
      this.transitionToCurrentActiveItem()
      return
    }

    if (item.kind === 'rest') {
      this.beginRest(item.durationSeconds)
      return
    }

    this.beginExerciseTransition(item.durationSeconds)
  }

  private beginRest(seconds: number): void {
    this.restTimer.clear()
    this.restRemainingSeconds = seconds
    this.stage = 'rest'

    this.startRestCountdown()
    this.transitionToCurrentActiveItem()
  }

  private startRestCountdown(): void {
    this.restTimer.interval(() => {
      this.restRemainingSeconds -= 1
      if (this.restRemainingSeconds <= 0) {
        this.restTimer.clear()
        this.moveToNextTimelineItem()
        return
      }
      this.patchTimelineStateInPlace()
    }, 1000)
  }

  private clearTimers(): void {
    this.debounceTimer.clear()
    this.repAdjustmentDebounceRemainingSeconds = 0
    this.timedSetTimer.clear()
    this.graceTimer.clear()
    this.restTimer.clear()
    this.transitionTimer.clear()
  }

  private pauseRest(): void {
    if (this.stage !== 'rest' || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.restTimer.clear()
    this.stage = 'rest-paused'
    this.patchTimelineStateInPlace()
  }

  private resumeRest(): void {
    if (this.stage !== 'rest-paused' || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.stage = 'rest'
    this.startRestCountdown()
    this.patchTimelineStateInPlace()
  }

  private skipRest(): void {
    if ((this.stage !== 'rest' && this.stage !== 'rest-paused') || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.restTimer.clear()
    this.moveToNextTimelineItem()
  }

  private beginExerciseTransition(seconds: number): void {
    this.transitionTimer.clear()
    this.nextExerciseRemainingSeconds = seconds
    this.stage = 'transition'

    this.transitionTimer.interval(() => {
      this.nextExerciseRemainingSeconds -= 1
      if (this.nextExerciseRemainingSeconds <= 0) {
        this.transitionTimer.clear()
        this.moveToNextTimelineItem()
        return
      }
        this.patchTimelineStateInPlace()
    }, 1000)

    this.transitionToCurrentActiveItem()
  }

  private pauseExerciseTransition(): void {
    if (this.stage !== 'transition' || this.currentItem()?.kind !== 'transition') {
      return
    }

    this.transitionTimer.clear()
    this.stage = 'transition-paused'
    this.patchTimelineStateInPlace()
  }

  private getTransitionDurationMs(variableName: '--proto-transition-duration' | '--proto-transition-duration-exit'): number {
    const rawDuration = getComputedStyle(this).getPropertyValue(variableName).trim()
    const durationMatch = rawDuration.match(/^(\d*\.?\d+)(ms|s)$/)

    if (!durationMatch) {
      return RrrWorkoutLoggingPrototype.DEFAULT_STATE_TRANSITION_MS
    }

    const numericPart = durationMatch[1] ?? ''
    const unit = durationMatch[2] ?? 'ms'
    const parsed = Number.parseFloat(numericPart)

    if (Number.isNaN(parsed)) {
      return RrrWorkoutLoggingPrototype.DEFAULT_STATE_TRANSITION_MS
    }

    return unit === 's' ? parsed * 1000 : parsed
  }

  private scheduleMotionCleanup(): void {
    const cleanupDelay = Math.max(
      this.getTransitionDurationMs('--proto-transition-duration'),
      this.getTransitionDurationMs('--proto-transition-duration-exit')
    ) + RrrWorkoutLoggingPrototype.STATE_TRANSITION_BUFFER_MS

    this.motionCleanupTimer.clear()
    this.motionCleanupTimer.timeout(() => {
      this.shadowRoot?.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
        element.removeAttribute('data-motion')
      })
    }, cleanupDelay)
  }

  private patchTimelineStateInPlace(): boolean {
    if (!this.shadowRoot) {
      return false
    }

    const startItem = this.shadowRoot.querySelector<HTMLElement>('.timeline-item--start')
    const timelineItems = Array.from(this.shadowRoot.querySelectorAll<HTMLElement>('.timeline-item:not(.timeline-item--start)'))
    const previousActive = this.shadowRoot.querySelector<HTMLElement>('.timeline-item[data-state="active"]')

    if (!startItem || timelineItems.length !== TIMELINE.length) {
      return false
    }

    startItem.dataset.state = this.stage === 'locked' ? 'active' : 'complete'
    this.syncStartSectionState(startItem)

    timelineItems.forEach((element, index) => {
      const timelineState = this.getTimelineState(index)
      element.dataset.state = timelineState

      const item = TIMELINE[index]
      if (item?.kind === 'set') {
        this.patchSetItem(element, item, timelineState)
      }

      if (item?.kind === 'rest') {
        this.patchRestItem(element, item, timelineState)
      }

      if (item?.kind === 'transition') {
        this.patchTransitionItem(element, item, timelineState)
      }
    })

    const currentActive = this.shadowRoot.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    if (previousActive !== currentActive) {
      this.shadowRoot.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
        element.removeAttribute('data-motion')
      })

      if (previousActive) {
        previousActive.dataset.motion = 'exiting'
      }
      if (currentActive) {
        currentActive.dataset.motion = 'entering'
      }

      this.scheduleMotionCleanup()
    }

    return true
  }

  private patchSetItem(element: HTMLElement, item: Extract<TimelineItem, { kind: 'set' }>, timelineState: 'future' | 'active' | 'complete'): void {
    const exercise = getExercise(item.exerciseIndex)
    const isActiveSet = timelineState === 'active' && (this.stage === 'set' || this.stage === 'set-debounce' || this.stage === 'set-grace')
    const isActiveTimedSet = timelineState === 'active' && (this.stage === 'timed-ready' || this.stage === 'timed-active')
    const isActiveGrace = timelineState === 'active' && this.stage === 'set-grace'
    const isActiveDebounce = timelineState === 'active' && this.stage === 'set-debounce'

    if (timelineState === 'active') {
      element.dataset.stage = this.stage
    } else {
      delete element.dataset.stage
    }

    const repValueEl = element.querySelector<HTMLElement>('.rep-value')
    if (repValueEl && exercise.loggingType === 'reps' && isActiveSet) {
      repValueEl.textContent = `${this.repValue} reps`
    }

    if (exercise.loggingType === 'reps') {
      const minusButton = element.querySelector<HTMLButtonElement>('[data-action="rep-minus"]')
      const plusButton = element.querySelector<HTMLButtonElement>('[data-action="rep-plus"]')
      const confirmButton = element.querySelector<HTMLButtonElement>('.rep-confirm-action')
      const startRestNowButton = element.querySelector<HTMLButtonElement>('.rep-start-rest-now-action')
      const debounceHint = element.querySelector<HTMLElement>('.rep-debounce-hint')
      const graceHint = element.querySelector<HTMLElement>('.rep-grace-hint')

      if (minusButton) {
        minusButton.disabled = !isActiveSet
      }
      if (plusButton) {
        plusButton.disabled = !isActiveSet
      }
      if (confirmButton) {
        confirmButton.disabled = !isActiveSet
      }
      if (startRestNowButton) {
        startRestNowButton.disabled = !isActiveGrace
        this.setElementHidden(startRestNowButton, !isActiveGrace)
      }
      if (debounceHint) {
        this.setElementHidden(debounceHint, !isActiveDebounce)
      }
      if (graceHint) {
        this.setElementHidden(graceHint, !isActiveGrace)
      }
    }

    if (exercise.loggingType === 'time') {
      const timedMainGroup = element.querySelector<HTMLElement>('.timed-main-group')
      const timedGraceGroup = element.querySelector<HTMLElement>('.timed-grace-group')
      const timedStartButton = element.querySelector<HTMLButtonElement>('.timed-start-action')
      const timedStopButton = element.querySelector<HTMLButtonElement>('.timed-stop-action')
      const timedEditButton = element.querySelector<HTMLButtonElement>('.timed-edit-grace-action')
      const timedStartRestNowButton = element.querySelector<HTMLButtonElement>('.timed-start-rest-now-action')

      if (timedMainGroup) {
        this.setElementHidden(timedMainGroup, isActiveGrace)
      }
      if (timedGraceGroup) {
        this.setElementHidden(timedGraceGroup, !isActiveGrace)
      }
      if (timedStartButton) {
        timedStartButton.disabled = !(timelineState === 'active' && this.stage === 'timed-ready')
      }
      if (timedStopButton) {
        timedStopButton.disabled = !(timelineState === 'active' && this.stage === 'timed-active')
      }
      if (timedEditButton) {
        timedEditButton.disabled = !isActiveGrace
      }
      if (timedStartRestNowButton) {
        timedStartRestNowButton.disabled = !isActiveGrace
      }
    }

    const timedCountEl = element.querySelector<HTMLElement>('.timed-count-value')
    if (timedCountEl && exercise.loggingType === 'time' && isActiveTimedSet) {
      timedCountEl.textContent = this.formatClock(this.timedSetElapsedSeconds)
    }

    const graceCountdownValueEl = element.querySelector<HTMLElement>('.grace-countdown-value')
    if (graceCountdownValueEl && isActiveGrace) {
      graceCountdownValueEl.textContent = `${this.repConfirmGraceRemainingSeconds}`
    }

    const graceSummaryEl = element.querySelector<HTMLElement>('.grace-summary')
    if (graceSummaryEl && isActiveGrace && this.lastConfirmedSummary) {
      graceSummaryEl.textContent = this.lastConfirmedSummary
    }

    const debounceCountdownValueEl = element.querySelector<HTMLElement>('.debounce-countdown-value')
    if (debounceCountdownValueEl && isActiveDebounce) {
      debounceCountdownValueEl.textContent = `${this.repAdjustmentDebounceRemainingSeconds}`
    }
  }

  private patchRestItem(element: HTMLElement, item: Extract<TimelineItem, { kind: 'rest' }>, timelineState: 'future' | 'active' | 'complete'): void {
    const isActiveRest = timelineState === 'active' && (this.stage === 'rest' || this.stage === 'rest-paused')

    const countEl = element.querySelector<HTMLElement>('.stage-count--rest')
    if (countEl) {
      this.setElementHidden(countEl, !isActiveRest)
      countEl.textContent = isActiveRest ? this.formatClock(this.restRemainingSeconds) : this.formatClock(item.durationSeconds)
    }

    const primaryActionEl = element.querySelector<HTMLElement>('.rest-primary-action')
    if (primaryActionEl) {
      if (this.stage === 'rest') {
        primaryActionEl.dataset.action = 'pause-rest'
        primaryActionEl.textContent = 'Pause'
      } else {
        primaryActionEl.dataset.action = 'resume-rest'
        primaryActionEl.textContent = 'Resume'
      }
    }

    const progressEl = element.querySelector<HTMLElement>('.bar--vertical > span')
    if (progressEl) {
      const restRemainingPercent = isActiveRest
        ? `${(this.restRemainingSeconds / item.durationSeconds) * 100}%`
        : timelineState === 'complete'
          ? '0%'
          : '100%'
      progressEl.style.height = restRemainingPercent
    }
  }

  private patchTransitionItem(element: HTMLElement, item: Extract<TimelineItem, { kind: 'transition' }>, timelineState: 'future' | 'active' | 'complete'): void {
    const isActiveTransition = timelineState === 'active' && (this.stage === 'transition' || this.stage === 'transition-paused')

    const countEl = element.querySelector<HTMLElement>('.stage-count--transition')
    if (countEl) {
      this.setElementHidden(countEl, !isActiveTransition)
      countEl.textContent = `${isActiveTransition ? this.nextExerciseRemainingSeconds : item.durationSeconds}`
    }

    const progressEl = element.querySelector<HTMLElement>('.bar--vertical--transition > span')
    if (progressEl) {
      const transitionRemainingPercent = isActiveTransition
        ? `${(this.nextExerciseRemainingSeconds / EXERCISE_TRANSITION_SECONDS) * 100}%`
        : timelineState === 'complete'
          ? '0%'
          : '100%'
      progressEl.style.height = transitionRemainingPercent
    }

    const primaryActionEl = element.querySelector<HTMLElement>('.transition-primary-action')
    if (primaryActionEl) {
      if (this.stage === 'transition') {
        primaryActionEl.dataset.action = 'stay-here'
        primaryActionEl.textContent = 'Stay Here'
      } else {
        primaryActionEl.dataset.action = 'next'
        primaryActionEl.textContent = 'Next'
      }
    }
  }

  private transitionToCurrentActiveItem(): void {
    if (!this.patchTimelineStateInPlace()) {
      this.render()
      this.scrollActiveIntoView()
      return
    }

    this.scrollActiveIntoView('smooth')
  }

  private syncStartSectionState(startItem: HTMLElement): void {
    const startActions = startItem.querySelector<HTMLElement>('.start-actions')
    const startHint = startItem.querySelector<HTMLElement>('.start-hint')
    const isLocked = this.stage === 'locked'

    if (startActions) {
      this.setElementHidden(startActions, !isLocked)
    }
    if (startHint) {
      this.setElementHidden(startHint, isLocked)
    }
  }

  private setElementHidden(element: HTMLElement, hidden: boolean): void {
    element.toggleAttribute('hidden', hidden)
    if (hidden) {
      element.setAttribute('aria-hidden', 'true')
      return
    }

    element.removeAttribute('aria-hidden')
  }

  private syncOverallProgress(): void {
    const fill = this.shadowRoot?.querySelector<HTMLElement>('.overall-progress__fill')
    if (!fill) {
      return
    }

    const totalSetCount = this.getTotalSetCount()
    const completedSetCount = this.getCompletedSetCount()
    const overallProgressPercent = totalSetCount > 0 ? (completedSetCount / totalSetCount) * 100 : 0

    fill.style.height = `${overallProgressPercent}%`
    this.overallProgressVisualPercent = overallProgressPercent
  }

  private currentItem(): TimelineItem | null {
    return TIMELINE[this.activeTimelineIndex] ?? null
  }

  private scrollActiveIntoView(behavior: ScrollBehavior = 'smooth'): void {
    requestAnimationFrame(() => {
      const active = this.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
      active?.scrollIntoView({ behavior, block: 'center' })
    })
  }

  private getTimelineState(index: number): 'future' | 'active' | 'complete' {
    if (this.stage === 'locked') {
      return 'future'
    }

    if (this.stage === 'workout-complete') {
      return 'complete'
    }

    if (index < this.activeTimelineIndex) {
      return 'complete'
    }

    if (index > this.activeTimelineIndex) {
      return 'future'
    }

    return 'active'
  }

  private formatClock(totalSeconds: number): string {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  private getCompletedSetCount(): number {
    return this.completedSetsByExercise.reduce((sum, value) => sum + value, 0)
  }

  private getTotalSetCount(): number {
    return EXERCISES.reduce((sum, exercise) => sum + exercise.totalSets, 0)
  }

  private renderTimelineItem(item: TimelineItem, index: number): string {
    const state = this.getTimelineState(index)
    if (item.kind === 'set') {
      return this.renderActivityItem(item, state)
    }

    if (item.kind === 'rest') {
      return this.renderRestTimelineItem(item, state)
    }

    return this.renderTransitionTimelineItem(item, state)
  }

  private renderActivityItem(item: Extract<TimelineItem, { kind: 'set' }>, state: 'future' | 'active' | 'complete'): string {
    const exercise = getExercise(item.exerciseIndex)
    const isActive = state === 'active'
    const isActiveSet = isActive && (this.stage === 'set' || this.stage === 'set-debounce' || this.stage === 'set-grace')
    const isActiveTimedReady = isActive && this.stage === 'timed-ready'
    const isActiveTimed = isActive && this.stage === 'timed-active'
    const isActiveDebounce = isActive && this.stage === 'set-debounce'
    const isActiveGrace = isActive && this.stage === 'set-grace'
    const timedTarget = exercise.targetDurationSeconds ?? 0
    const timedDisplay = this.formatClock(this.timedSetElapsedSeconds)
    const stageDataAttribute = isActive ? ` data-stage="${this.stage}"` : ''

    if (exercise.loggingType === 'time') {
      return `
        <section class="timeline-item timeline-item--set" data-state="${state}"${stageDataAttribute}>
          <div class="set-header">
            <h2 class="name"><span class="name-prefix">Doing&nbsp;</span><span class="name-text">${exercise.name}</span></h2>
            <span class="set-count">${item.setNumber} / ${exercise.totalSets}</span>
          </div>
          <div class="set-detail">
            <div class="set-detail__inner">
              <div class="last-time">Previously: ${exercise.previousPerformance}</div>
              <div class="timed-main-group"${isActiveGrace ? ' hidden aria-hidden="true"' : ''}>
                <div class="rep-row">
                  <div class="rep-value timed-count-value">${timedDisplay}</div>
                </div>
                <div class="hint">Target: ${this.formatClock(timedTarget)}</div>
                <div class="actions">
                  <rrr-button type="button" data-action="start-timed-set" class="timed-start-action" ${isActiveTimedReady ? '' : 'disabled'}>Start</rrr-button>
                  <rrr-button type="button" variant="outline" data-action="stop-timed-set" class="timed-stop-action" ${isActiveTimed ? '' : 'disabled'}>Stop</rrr-button>
                </div>
              </div>
              <div class="timed-grace-group"${isActiveGrace ? '' : ' hidden aria-hidden="true"'}>
                <div class="rep-row">
                  <div class="rep-value grace-summary">${this.lastConfirmedSummary ?? ''}</div>
                </div>
                <div class="hint">Rest starts in <span class="grace-countdown-value">${this.repConfirmGraceRemainingSeconds}</span>...</div>
                <div class="actions">
                  <rrr-button type="button" variant="outline" data-action="edit-grace" class="timed-edit-grace-action" ${isActiveGrace ? '' : 'disabled'}>Edit</rrr-button>
                  <rrr-button type="button" data-action="start-rest-now" class="timed-start-rest-now-action" ${isActiveGrace ? '' : 'disabled'}>Start Rest Now</rrr-button>
                </div>
              </div>
            </div>
          </div>
        </section>
      `
    }

    const repDisplay = `${this.repValue} reps`
    return `
      <section class="timeline-item timeline-item--set" data-state="${state}"${stageDataAttribute}>
        <div class="set-header">
          <h2 class="name"><span class="name-prefix">Doing&nbsp;</span><span class="name-text">${exercise.name}</span></h2>
          <span class="set-count">${item.setNumber} / ${exercise.totalSets}</span>
        </div>
        <div class="set-detail">
          <div class="set-detail__inner">
            <div class="last-time">Previously: ${exercise.previousPerformance}</div>
            <div class="rep-row">
              <rrr-button type="button" variant="outline" data-action="rep-minus" aria-label="decrease reps" ${isActiveSet ? '' : 'disabled'}>-</rrr-button>
              <div class="rep-value">${repDisplay}</div>
              <rrr-button type="button" variant="outline" data-action="rep-plus" aria-label="increase reps" ${isActiveSet ? '' : 'disabled'}>+</rrr-button>
            </div>
            <div class="hint rep-debounce-hint"${isActiveDebounce ? '' : ' hidden aria-hidden="true"'}>Auto-confirm in <span class="debounce-countdown-value">${this.repAdjustmentDebounceRemainingSeconds}</span>...</div>
            <div class="hint rep-grace-hint"${isActiveGrace ? '' : ' hidden aria-hidden="true"'}>Rest starts in <span class="grace-countdown-value">${this.repConfirmGraceRemainingSeconds}</span>...</div>
            <div class="actions">
              <rrr-button type="button" data-action="done-set" class="rep-confirm-action" ${isActiveSet ? '' : 'disabled'}>Confirm</rrr-button>
              <rrr-button type="button" data-action="start-rest-now" class="rep-start-rest-now-action" ${isActiveGrace ? '' : 'disabled'}${isActiveGrace ? '' : ' hidden aria-hidden="true"'}>Start Rest Now</rrr-button>
            </div>
          </div>
        </div>
      </section>
    `
  }

  private renderRestTimelineItem(item: Extract<TimelineItem, { kind: 'rest' }>, state: 'future' | 'active' | 'complete'): string {
    const isActive = state === 'active'
    const isActiveRest = isActive && (this.stage === 'rest' || this.stage === 'rest-paused')
    const isCompletedRest = state === 'complete'
    const restRemainingPercent = isActiveRest
      ? Math.max(0, Math.min(100, (this.restRemainingSeconds / item.durationSeconds) * 100))
      : isCompletedRest
        ? 0
        : 100
    const restDisplayTime = isActiveRest ? this.formatClock(this.restRemainingSeconds) : this.formatClock(item.durationSeconds)

    return `
      <section class="timeline-item timeline-item--rest" data-state="${state}">
        <div class="countdown countdown--vertical" aria-hidden="true">
          <div class="bar bar--vertical"><span style="height: ${restRemainingPercent}%;"></span></div>
        </div>
        <div class="rest-header">
          <div class="rest-title"><rrr-icon name="water-bottle"></rrr-icon>Rest</div>
          <span class="stage-count stage-count--rest"${isActiveRest ? '' : ' hidden aria-hidden="true"'}>${restDisplayTime}</span>
        </div>
        <div class="rest-detail">
          <div class="rest-detail__inner">
            <div class="actions">
              <rrr-button type="button" variant="secondary" tone="accent" data-action="${this.stage === 'rest' ? 'pause-rest' : 'resume-rest'}" class="rest-primary-action">${this.stage === 'rest' ? 'Pause' : 'Resume'}</rrr-button>
              <rrr-button type="button" variant="outline" tone="accent" data-action="skip-rest">Skip Rest</rrr-button>
            </div>
          </div>
        </div>
      </section>
    `
  }

  private renderTransitionTimelineItem(item: Extract<TimelineItem, { kind: 'transition' }>, state: 'future' | 'active' | 'complete'): string {
    const nextExercise = EXERCISES[item.exerciseIndex + 1]
    const isActive = state === 'active'
    const isActiveTransition = isActive && (this.stage === 'transition' || this.stage === 'transition-paused')
    const transitionDisplayTime = isActiveTransition ? this.nextExerciseRemainingSeconds : item.durationSeconds
    const transitionRemainingPercent = isActiveTransition
      ? Math.max(0, Math.min(100, (this.nextExerciseRemainingSeconds / item.durationSeconds) * 100))
      : state === 'complete'
        ? 0
        : 100
    const transitionPrimaryLabel = this.stage === 'transition' ? 'Stay Here' : 'Next'
    const transitionPrimaryAction = this.stage === 'transition' ? 'stay-here' : 'next'

    return `
      <section class="timeline-item timeline-item--transition" data-state="${state}">
        <div class="countdown countdown--vertical" aria-hidden="true">
          <div class="bar bar--vertical bar--vertical--transition"><span style="height: ${transitionRemainingPercent}%;"></span></div>
        </div>
        <div class="rest-header">
          <div class="rest-title">Time to switch to: ${nextExercise ? nextExercise.name : 'Workout complete'}</div>
          <span class="stage-count stage-count--transition"${isActiveTransition ? '' : ' hidden aria-hidden="true"'}>${transitionDisplayTime}</span>
        </div>
        <div class="transition-detail transition-detail--actions">
          <div class="transition-detail__inner">
            <div class="actions">
              <rrr-button type="button" variant="secondary" tone="accent" data-action="${transitionPrimaryAction}" class="transition-primary-action">${transitionPrimaryLabel}</rrr-button>
              <rrr-button type="button" variant="outline" tone="accent" data-action="next-now">Next Now</rrr-button>
            </div>
          </div>
        </div>
      </section>
    `
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    const startState = this.stage === 'locked' ? 'active' : 'complete'
    const completedSetCount = this.getCompletedSetCount()
    const totalSetCount = this.getTotalSetCount()

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="prototype">
        <div class="overall-progress" aria-hidden="true">
          <div class="overall-progress__track">
            <span class="overall-progress__fill" style="height: ${this.overallProgressVisualPercent}%;"></span>
          </div>
        </div>
        <div class="stack is-dimmed">
          <section class="timeline-item timeline-item--start" data-state="${startState}">
            <h2 class="name">Ready?</h2>
            <div class="actions start-actions"${this.stage !== 'locked' ? ' hidden aria-hidden="true"' : ''}><rrr-button data-action="go" type="button" tone="accent">GO</rrr-button></div>
            <div class="hint start-hint"${this.stage === 'locked' ? ' hidden aria-hidden="true"' : ''}>Workout flow is running. Active section is centered when possible.</div>
          </section>

          ${TIMELINE.map((item, index) => this.renderTimelineItem(item, index)).join('')}

          ${this.stage === 'workout-complete'
            ? `
              <section class="complete">
                <h2 class="name">Workout complete</h2>
                <div class="hint">Logged sets: ${completedSetCount}</div>
                <div class="hint">Prototype success condition: you should feel guided without extra taps.</div>
              </section>
            `
            : ''}
        </div>
      </section>
    `

    requestAnimationFrame(() => {
      const fill = this.shadowRoot?.querySelector<HTMLElement>('.overall-progress__fill')
      if (!fill) {
        return
      }

      // Set the target on the next frame so the initial inline height is painted first.
      requestAnimationFrame(() => {
        const percent = totalSetCount > 0 ? (completedSetCount / totalSetCount) * 100 : 0
        fill.style.height = `${percent}%`
        this.overallProgressVisualPercent = percent
      })
    })
  }
}

customElements.define('rrr-workout-logging-prototype', RrrWorkoutLoggingPrototype)