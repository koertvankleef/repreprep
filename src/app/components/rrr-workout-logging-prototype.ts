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

type TimelineState = 'future' | 'active' | 'complete'

type SetItemViewModel = {
  timelineState: TimelineState
  exercise: Exercise
  setNumber: number
  stageDataAttribute: string
  isActiveSet: boolean
  isActiveTimedReady: boolean
  isActiveTimed: boolean
  isActiveTimedSet: boolean
  isActiveDebounce: boolean
  isActiveGrace: boolean
  repDisplay: string
  timedDisplay: string
  timedTargetDisplay: string
  graceCountdownText: string
  debounceCountdownText: string
  graceSummary: string
}

type RestItemViewModel = {
  timelineState: TimelineState
  durationSeconds: number
  isActiveRest: boolean
  restDisplayTime: string
  restRemainingPercent: string
  primaryAction: 'pause-rest' | 'resume-rest'
  primaryLabel: 'Pause' | 'Resume'
}

type TransitionItemViewModel = {
  timelineState: TimelineState
  durationSeconds: number
  isActiveTransition: boolean
  transitionDisplayTime: string
  transitionRemainingPercent: string
  transitionPrimaryAction: 'stay-here' | 'next'
  transitionPrimaryLabel: 'Stay Here' | 'Next'
  nextExerciseName: string
}

type ActivationPlan =
  | {
      kind: 'complete'
    }
  | {
      kind: 'set'
      stage: 'set'
      repValue: number
      clearLastConfirmedSummary: boolean
    }
  | {
      kind: 'timed-set'
      stage: 'timed-ready'
      timedSetElapsedSeconds: number
      clearLastConfirmedSummary: boolean
    }
  | {
      kind: 'rest'
      stage: 'rest'
      restRemainingSeconds: number
    }
  | {
      kind: 'transition'
      stage: 'transition'
      nextExerciseRemainingSeconds: number
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
    if (!this.isSetInteractionStage()) {
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
      || !this.isSetInteractionStage()
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
    if (!this.isSetInteractionStage()) {
      return
    }

    const currentItem = this.currentItem()
    if (this.isSetGraceStage() && currentItem && currentItem.kind === 'set') {
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

    const activationPlan = this.getActivationPlan(TIMELINE[this.activeTimelineIndex] ?? null)

    if (activationPlan.kind === 'complete') {
      this.stage = 'workout-complete'
      this.render()
      return
    }

    if (activationPlan.kind === 'set') {
      if (activationPlan.clearLastConfirmedSummary) {
        this.lastConfirmedSummary = null
      }
      this.stage = activationPlan.stage
      this.repValue = activationPlan.repValue
      this.transitionToCurrentActiveItem()
      return
    }

    if (activationPlan.kind === 'timed-set') {
      if (activationPlan.clearLastConfirmedSummary) {
        this.lastConfirmedSummary = null
      }
      this.stage = activationPlan.stage
      this.timedSetElapsedSeconds = activationPlan.timedSetElapsedSeconds
      this.transitionToCurrentActiveItem()
      return
    }

    if (activationPlan.kind === 'rest') {
      this.beginRest(activationPlan.restRemainingSeconds)
      return
    }

    this.beginExerciseTransition(activationPlan.nextExerciseRemainingSeconds)
  }

  private getActivationPlan(item: TimelineItem | null): ActivationPlan {
    if (!item) {
      return { kind: 'complete' }
    }

    if (item.kind === 'set') {
      const exercise = getExercise(item.exerciseIndex)
      if (exercise.loggingType === 'time') {
        return {
          kind: 'timed-set',
          stage: 'timed-ready',
          timedSetElapsedSeconds: 0,
          clearLastConfirmedSummary: true,
        }
      }

      return {
        kind: 'set',
        stage: 'set',
        repValue: exercise.suggestedReps ?? 0,
        clearLastConfirmedSummary: true,
      }
    }

    if (item.kind === 'rest') {
      return {
        kind: 'rest',
        stage: 'rest',
        restRemainingSeconds: item.durationSeconds,
      }
    }

    return {
      kind: 'transition',
      stage: 'transition',
      nextExerciseRemainingSeconds: item.durationSeconds,
    }
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
    if (!this.isRestActiveOrPausedStage() || this.currentItem()?.kind !== 'rest') {
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

  private isSetInteractionStage(): boolean {
    return this.stage === 'set' || this.stage === 'set-debounce' || this.stage === 'set-grace'
  }

  private isSetGraceStage(): boolean {
    return this.stage === 'set-grace'
  }

  private isSetDebounceStage(): boolean {
    return this.stage === 'set-debounce'
  }

  private isTimedReadyStage(): boolean {
    return this.stage === 'timed-ready'
  }

  private isTimedActiveStage(): boolean {
    return this.stage === 'timed-active'
  }

  private isTimedReadyOrActiveStage(): boolean {
    return this.isTimedReadyStage() || this.isTimedActiveStage()
  }

  private isRestActiveOrPausedStage(): boolean {
    return this.stage === 'rest' || this.stage === 'rest-paused'
  }

  private isRestActiveStage(): boolean {
    return this.stage === 'rest'
  }

  private isTransitionActiveOrPausedStage(): boolean {
    return this.stage === 'transition' || this.stage === 'transition-paused'
  }

  private isTransitionActiveStage(): boolean {
    return this.stage === 'transition'
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

      if (element === previousActive && timelineState !== 'active') {
        element.dataset.motion = 'exiting'
      }

      element.dataset.state = timelineState

      const item = TIMELINE[index]
      if (item?.kind === 'set') {
        this.patchSetItem(element, this.buildSetItemViewModel(item, timelineState))
      }

      if (item?.kind === 'rest') {
        this.patchRestItem(element, this.buildRestItemViewModel(item, timelineState))
      }

      if (item?.kind === 'transition') {
        this.patchTransitionItem(element, this.buildTransitionItemViewModel(item, timelineState))
      }
    })

    const currentActive = this.shadowRoot.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    if (previousActive !== currentActive) {
      this.shadowRoot.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
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

      this.scheduleMotionCleanup()
    }

    return true
  }

  private patchSetItem(element: HTMLElement, viewModel: SetItemViewModel): void {
    const { exercise } = viewModel

    if (viewModel.timelineState === 'active') {
      element.dataset.stage = this.stage
    } else {
      delete element.dataset.stage
    }

    const repValueEl = element.querySelector<HTMLElement>('.rep-value')
    if (repValueEl && exercise.loggingType === 'reps' && viewModel.isActiveSet) {
      repValueEl.textContent = viewModel.repDisplay
    }

    if (exercise.loggingType === 'reps') {
      const minusButton = element.querySelector<HTMLButtonElement>('[data-action="rep-minus"]')
      const plusButton = element.querySelector<HTMLButtonElement>('[data-action="rep-plus"]')
      const confirmButton = element.querySelector<HTMLButtonElement>('.rep-confirm-action')
      const startRestNowButton = element.querySelector<HTMLButtonElement>('.rep-start-rest-now-action')
      const debounceHint = element.querySelector<HTMLElement>('.rep-debounce-hint')
      const graceHint = element.querySelector<HTMLElement>('.rep-grace-hint')

      if (minusButton) {
        minusButton.disabled = !viewModel.isActiveSet
      }
      if (plusButton) {
        plusButton.disabled = !viewModel.isActiveSet
      }
      if (confirmButton) {
        confirmButton.disabled = !viewModel.isActiveSet
      }
      if (startRestNowButton) {
        startRestNowButton.disabled = !viewModel.isActiveGrace
        this.setElementHidden(startRestNowButton, !viewModel.isActiveGrace)
      }
      if (debounceHint) {
        this.setElementHidden(debounceHint, !viewModel.isActiveDebounce)
      }
      if (graceHint) {
        this.setElementHidden(graceHint, !viewModel.isActiveGrace)
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
        this.setElementHidden(timedMainGroup, viewModel.isActiveGrace)
      }
      if (timedGraceGroup) {
        this.setElementHidden(timedGraceGroup, !viewModel.isActiveGrace)
      }
      if (timedStartButton) {
        timedStartButton.disabled = !(viewModel.timelineState === 'active' && viewModel.isActiveTimedReady)
      }
      if (timedStopButton) {
        timedStopButton.disabled = !(viewModel.timelineState === 'active' && viewModel.isActiveTimed)
      }
      if (timedEditButton) {
        timedEditButton.disabled = !viewModel.isActiveGrace
      }
      if (timedStartRestNowButton) {
        timedStartRestNowButton.disabled = !viewModel.isActiveGrace
      }
    }

    const timedCountEl = element.querySelector<HTMLElement>('.timed-count-value')
    if (timedCountEl && exercise.loggingType === 'time' && viewModel.isActiveTimedSet) {
      timedCountEl.textContent = viewModel.timedDisplay
    }

    const graceCountdownValueEl = element.querySelector<HTMLElement>('.grace-countdown-value')
    if (graceCountdownValueEl && viewModel.isActiveGrace) {
      graceCountdownValueEl.textContent = viewModel.graceCountdownText
    }

    const graceSummaryEl = element.querySelector<HTMLElement>('.grace-summary')
    if (graceSummaryEl && viewModel.isActiveGrace && viewModel.graceSummary) {
      graceSummaryEl.textContent = viewModel.graceSummary
    }

    const debounceCountdownValueEl = element.querySelector<HTMLElement>('.debounce-countdown-value')
    if (debounceCountdownValueEl && viewModel.isActiveDebounce) {
      debounceCountdownValueEl.textContent = viewModel.debounceCountdownText
    }
  }

  private patchRestItem(element: HTMLElement, viewModel: RestItemViewModel): void {
    const countEl = element.querySelector<HTMLElement>('.stage-count--rest')
    if (countEl) {
      this.setElementHidden(countEl, !viewModel.isActiveRest)
      countEl.textContent = viewModel.restDisplayTime
    }

    const primaryActionEl = element.querySelector<HTMLElement>('.rest-primary-action')
    if (primaryActionEl) {
      primaryActionEl.dataset.action = viewModel.primaryAction
      primaryActionEl.textContent = viewModel.primaryLabel
    }

    const progressEl = element.querySelector<HTMLElement>('.bar--vertical > span')
    if (progressEl) {
      progressEl.style.height = viewModel.restRemainingPercent
    }
  }

  private patchTransitionItem(element: HTMLElement, viewModel: TransitionItemViewModel): void {
    const countEl = element.querySelector<HTMLElement>('.stage-count--transition')
    if (countEl) {
      this.setElementHidden(countEl, !viewModel.isActiveTransition)
      countEl.textContent = viewModel.transitionDisplayTime
    }

    const progressEl = element.querySelector<HTMLElement>('.bar--vertical--transition > span')
    if (progressEl) {
      progressEl.style.height = viewModel.transitionRemainingPercent
    }

    const primaryActionEl = element.querySelector<HTMLElement>('.transition-primary-action')
    if (primaryActionEl) {
      primaryActionEl.dataset.action = viewModel.transitionPrimaryAction
      primaryActionEl.textContent = viewModel.transitionPrimaryLabel
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

  private getTimelineState(index: number): TimelineState {
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
      return this.renderActivityItem(this.buildSetItemViewModel(item, state))
    }

    if (item.kind === 'rest') {
      return this.renderRestTimelineItem(this.buildRestItemViewModel(item, state))
    }

    return this.renderTransitionTimelineItem(this.buildTransitionItemViewModel(item, state))
  }

  private buildSetItemViewModel(item: Extract<TimelineItem, { kind: 'set' }>, timelineState: TimelineState): SetItemViewModel {
    const exercise = getExercise(item.exerciseIndex)
    const isActive = timelineState === 'active'
    const isActiveSet = isActive && this.isSetInteractionStage()
    const isActiveTimedReady = isActive && this.isTimedReadyStage()
    const isActiveTimed = isActive && this.isTimedActiveStage()
    const isActiveDebounce = isActive && this.isSetDebounceStage()
    const isActiveGrace = isActive && this.isSetGraceStage()
    const stageDataAttribute = isActive ? ` data-stage="${this.stage}"` : ''

    return {
      timelineState,
      exercise,
      setNumber: item.setNumber,
      stageDataAttribute,
      isActiveSet,
      isActiveTimedReady,
      isActiveTimed,
      isActiveTimedSet: isActive && this.isTimedReadyOrActiveStage(),
      isActiveDebounce,
      isActiveGrace,
      repDisplay: `${this.repValue} reps`,
      timedDisplay: this.formatClock(this.timedSetElapsedSeconds),
      timedTargetDisplay: this.formatClock(exercise.targetDurationSeconds ?? 0),
      graceCountdownText: `${this.repConfirmGraceRemainingSeconds}`,
      debounceCountdownText: `${this.repAdjustmentDebounceRemainingSeconds}`,
      graceSummary: this.lastConfirmedSummary ?? '',
    }
  }

  private buildRestItemViewModel(item: Extract<TimelineItem, { kind: 'rest' }>, timelineState: TimelineState): RestItemViewModel {
    const isActiveRest = timelineState === 'active' && this.isRestActiveOrPausedStage()
    return {
      timelineState,
      durationSeconds: item.durationSeconds,
      isActiveRest,
      restDisplayTime: isActiveRest ? this.formatClock(this.restRemainingSeconds) : this.formatClock(item.durationSeconds),
      restRemainingPercent: isActiveRest
        ? `${Math.max(0, Math.min(100, (this.restRemainingSeconds / item.durationSeconds) * 100))}%`
        : timelineState === 'complete'
          ? '0%'
          : '100%',
      primaryAction: this.isRestActiveStage() ? 'pause-rest' : 'resume-rest',
      primaryLabel: this.isRestActiveStage() ? 'Pause' : 'Resume',
    }
  }

  private buildTransitionItemViewModel(item: Extract<TimelineItem, { kind: 'transition' }>, timelineState: TimelineState): TransitionItemViewModel {
    const nextExercise = EXERCISES[item.exerciseIndex + 1]
    const isActiveTransition = timelineState === 'active' && this.isTransitionActiveOrPausedStage()
    return {
      timelineState,
      durationSeconds: item.durationSeconds,
      isActiveTransition,
      transitionDisplayTime: `${isActiveTransition ? this.nextExerciseRemainingSeconds : item.durationSeconds}`,
      transitionRemainingPercent: isActiveTransition
        ? `${Math.max(0, Math.min(100, (this.nextExerciseRemainingSeconds / item.durationSeconds) * 100))}%`
        : timelineState === 'complete'
          ? '0%'
          : '100%',
      transitionPrimaryAction: this.isTransitionActiveStage() ? 'stay-here' : 'next',
      transitionPrimaryLabel: this.isTransitionActiveStage() ? 'Stay Here' : 'Next',
      nextExerciseName: nextExercise ? nextExercise.name : 'Workout complete',
    }
  }

  private renderActivityItem(viewModel: SetItemViewModel): string {
    if (viewModel.exercise.loggingType === 'time') {
      return this.renderSetCard(viewModel, this.renderTimedSetDetail(viewModel))
    }

    return this.renderSetCard(viewModel, this.renderRepSetDetail(viewModel))
  }

  private renderSetCard(viewModel: SetItemViewModel, detailMarkup: string): string {
    return `
      <section class="timeline-item timeline-item--set" data-state="${viewModel.timelineState}"${viewModel.stageDataAttribute}>
        <div class="set-header">
          <h2 class="name"><span class="name-prefix">Doing&nbsp;</span><span class="name-text">${viewModel.exercise.name}</span></h2>
          <span class="set-count">${viewModel.setNumber} / ${viewModel.exercise.totalSets}</span>
        </div>
        <div class="set-detail">
          <div class="set-detail__inner">
            <div class="last-time">Previously: ${viewModel.exercise.previousPerformance}</div>
            ${detailMarkup}
          </div>
        </div>
      </section>
    `
  }

  private renderTimedSetDetail(viewModel: SetItemViewModel): string {
    return `
      <div class="timed-main-group"${viewModel.isActiveGrace ? ' hidden aria-hidden="true"' : ''}>
        <div class="rep-row">
          <div class="rep-value timed-count-value">${viewModel.timedDisplay}</div>
        </div>
        <div class="hint">Target: ${viewModel.timedTargetDisplay}</div>
        <div class="actions">
          <rrr-button type="button" data-action="start-timed-set" class="timed-start-action" ${viewModel.isActiveTimedReady ? '' : 'disabled'}>Start</rrr-button>
          <rrr-button type="button" variant="outline" data-action="stop-timed-set" class="timed-stop-action" ${viewModel.isActiveTimed ? '' : 'disabled'}>Stop</rrr-button>
        </div>
      </div>
      <div class="timed-grace-group"${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>
        <div class="rep-row">
          <div class="rep-value grace-summary">${viewModel.graceSummary}</div>
        </div>
        <div class="hint">Rest starts in <span class="grace-countdown-value">${viewModel.graceCountdownText}</span>...</div>
        <div class="actions">
          <rrr-button type="button" variant="outline" data-action="edit-grace" class="timed-edit-grace-action" ${viewModel.isActiveGrace ? '' : 'disabled'}>Edit</rrr-button>
          <rrr-button type="button" data-action="start-rest-now" class="timed-start-rest-now-action" ${viewModel.isActiveGrace ? '' : 'disabled'}>Start Rest Now</rrr-button>
        </div>
      </div>
    `
  }

  private renderRepSetDetail(viewModel: SetItemViewModel): string {
    return `
      <div class="rep-row">
        <rrr-button type="button" variant="outline" data-action="rep-minus" aria-label="decrease reps" ${viewModel.isActiveSet ? '' : 'disabled'}>-</rrr-button>
        <div class="rep-value">${viewModel.repDisplay}</div>
        <rrr-button type="button" variant="outline" data-action="rep-plus" aria-label="increase reps" ${viewModel.isActiveSet ? '' : 'disabled'}>+</rrr-button>
      </div>
      <div class="hint rep-debounce-hint"${viewModel.isActiveDebounce ? '' : ' hidden aria-hidden="true"'}>Auto-confirm in <span class="debounce-countdown-value">${viewModel.debounceCountdownText}</span>...</div>
      <div class="hint rep-grace-hint"${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>Rest starts in <span class="grace-countdown-value">${viewModel.graceCountdownText}</span>...</div>
      <div class="actions">
        <rrr-button type="button" data-action="done-set" class="rep-confirm-action" ${viewModel.isActiveSet ? '' : 'disabled'}>Confirm</rrr-button>
        <rrr-button type="button" data-action="start-rest-now" class="rep-start-rest-now-action" ${viewModel.isActiveGrace ? '' : 'disabled'}${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>Start Rest Now</rrr-button>
      </div>
    `
  }

  private renderRestTimelineItem(viewModel: RestItemViewModel): string {

    return `
      <section class="timeline-item timeline-item--rest" data-state="${viewModel.timelineState}">
        <div class="countdown countdown--vertical" aria-hidden="true">
          <div class="bar bar--vertical"><span style="height: ${viewModel.restRemainingPercent};"></span></div>
        </div>
        <div class="rest-header">
          <div class="rest-title"><rrr-icon name="water-bottle"></rrr-icon>Rest</div>
          <span class="stage-count stage-count--rest"${viewModel.isActiveRest ? '' : ' hidden aria-hidden="true"'}>${viewModel.restDisplayTime}</span>
        </div>
        <div class="rest-detail">
          <div class="rest-detail__inner">
            <div class="actions">
              <rrr-button type="button" variant="secondary" tone="accent" data-action="${viewModel.primaryAction}" class="rest-primary-action">${viewModel.primaryLabel}</rrr-button>
              <rrr-button type="button" variant="outline" tone="accent" data-action="skip-rest">Skip Rest</rrr-button>
            </div>
          </div>
        </div>
      </section>
    `
  }

  private renderTransitionTimelineItem(viewModel: TransitionItemViewModel): string {

    return `
      <section class="timeline-item timeline-item--transition" data-state="${viewModel.timelineState}">
        <div class="countdown countdown--vertical" aria-hidden="true">
          <div class="bar bar--vertical bar--vertical--transition"><span style="height: ${viewModel.transitionRemainingPercent};"></span></div>
        </div>
        <div class="rest-header">
          <div class="rest-title">Time to switch to: ${viewModel.nextExerciseName}</div>
          <span class="stage-count stage-count--transition"${viewModel.isActiveTransition ? '' : ' hidden aria-hidden="true"'}>${viewModel.transitionDisplayTime}</span>
        </div>
        <div class="transition-detail transition-detail--actions">
          <div class="transition-detail__inner">
            <div class="actions">
              <rrr-button type="button" variant="secondary" tone="accent" data-action="${viewModel.transitionPrimaryAction}" class="transition-primary-action">${viewModel.transitionPrimaryLabel}</rrr-button>
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