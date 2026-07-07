import styles from './rrr-workout-logging-flow.css?inline'
import {
  createTimelineItemDomAdapter,
  syncTimelineItemState,
  type RestTimelineItemDomAdapter,
  type SetTimelineItemDomAdapter,
  type TimelineItemDomAdapter,
  type TransitionTimelineItemDomAdapter,
} from './rrr-workout-logging-dom.ts'
import {
  EXERCISES,
  EXERCISE_TRANSITION_SECONDS,
  REP_ADJUST_AUTO_PROCEED_SECONDS,
  REP_CONFIRM_GRACE_SECONDS,
  TIMELINE,
  getExercise,
  type ActivationPlan,
  type ActiveStage,
  type RestItemViewModel,
  type SetItemViewModel,
  type TimelineItem,
  type TimelineState,
  type TransitionItemViewModel,
  type WorkoutEvent,
} from './rrr-workout-logging-model.ts'
import { TimelineMotionController } from './rrr-workout-logging-motion.ts'
import { ManagedTimer, startManagedCountdown } from './rrr-workout-logging-runtime.ts'
import {
  formatClock,
  getTimelineState,
  renderWorkoutLoggingMarkup,
  buildRestItemViewModel,
  buildSetItemViewModelForState,
  buildTransitionItemViewModel,
  type WorkoutLoggingViewState,
} from './rrr-workout-logging-view.ts'
import {
  getActivationPlan,
  getTotalSetCount,
  isRestActiveOrPausedStage,
  isSetGraceStage,
  isSetInteractionStage,
} from './rrr-workout-logging-workflow.ts'
import { t } from '../../../../i18n/index.ts'

export class RrrWorkoutLoggingFlow extends HTMLElement {
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
  private readonly motionController = new TimelineMotionController(this)
  private lastConfirmedSummary: string | null = null
  private readonly completedSetsByExercise = EXERCISES.map(() => 0)
  private overallProgressVisualPercent = 0
  private startItem: HTMLElement | null = null
  private timelineItemAdapters: TimelineItemDomAdapter[] = []
  private liveAnnouncement = ''

  connectedCallback(): void {
    this.render()
    this.addEventListener('click', this.handleClick)
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.handleClick)
    this.motionController.dispose()
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
      return
    }

    if (action === 'finish-and-use' || action === 'finish-without-use') {
      this.dispatchEvent(
        new CustomEvent<{ useAsPrefill: boolean }>('rrr-workout-flow-finished', {
          bubbles: true,
          composed: true,
          detail: {
            useAsPrefill: action === 'finish-and-use',
          },
        }),
      )
    }
  }

  private adjustRepValue(delta: number): void {
    if (!isSetInteractionStage(this.stage)) {
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
      || !isSetInteractionStage(this.stage)
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
      ? t('workoutLogging.reps.loggedAuto', { count: this.repValue })
      : t('workoutLogging.reps.logged', { count: this.repValue })
    this.announce(t('workoutLogging.reps.loggedRestSoon', { count: this.repValue }))
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
    this.lastConfirmedSummary = t('workoutLogging.timed.loggedShort', { seconds: actualDurationSeconds })
    this.announce(t('workoutLogging.timed.loggedRestSoon', { seconds: actualDurationSeconds }))
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

    startManagedCountdown({
      timer: this.graceTimer,
      getRemaining: () => this.repConfirmGraceRemainingSeconds,
      setRemaining: (value) => {
        this.repConfirmGraceRemainingSeconds = value
      },
      onDone: () => {
        this.moveToNextTimelineItem()
      },
      onTick: () => {
        this.patchTimelineStateInPlace()
      },
    })

    this.transitionToCurrentActiveItem()
  }

  private scheduleRepAdjustmentAutoProceed(): void {
    if (!isSetInteractionStage(this.stage)) {
      return
    }

    const currentItem = this.currentItem()
    if (isSetGraceStage(this.stage) && currentItem && currentItem.kind === 'set') {
      this.graceTimer.clear()
      this.completedSetsByExercise[currentItem.exerciseIndex] = Math.max(0, currentItem.setNumber - 1)
      this.syncOverallProgress()
      this.lastConfirmedSummary = null
    }

    this.debounceTimer.clear()
    this.repAdjustmentDebounceRemainingSeconds = 0
    this.stage = 'set-debounce'
    this.repAdjustmentDebounceRemainingSeconds = REP_ADJUST_AUTO_PROCEED_SECONDS

    startManagedCountdown({
      timer: this.debounceTimer,
      getRemaining: () => this.repAdjustmentDebounceRemainingSeconds,
      setRemaining: (value) => {
        this.repAdjustmentDebounceRemainingSeconds = value
      },
      onDone: () => {
        this.repAdjustmentDebounceRemainingSeconds = 0
        this.confirmRepResult('adjusted-auto')
      },
      onTick: () => {
        this.patchTimelineStateInPlace()
      },
    })

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
      this.scrollCompleteIntoView()
      return
    }

    this.activeTimelineIndex += 1
    this.activateCurrentTimelineItem()
  }

  private activateCurrentTimelineItem(): void {
    // Defensively clear timers from the previously active item.
    // This prevents stale interval callbacks when users advance quickly.
    this.clearTimers()

    const activationPlan = getActivationPlan(TIMELINE[this.activeTimelineIndex] ?? null)

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

  private beginRest(seconds: number): void {
    this.restTimer.clear()
    this.restRemainingSeconds = seconds
    this.stage = 'rest'

    this.startRestCountdown()
    this.transitionToCurrentActiveItem()
  }

  private startRestCountdown(): void {
    startManagedCountdown({
      timer: this.restTimer,
      getRemaining: () => this.restRemainingSeconds,
      setRemaining: (value) => {
        this.restRemainingSeconds = value
      },
      onDone: () => {
        this.moveToNextTimelineItem()
      },
      onTick: () => {
        this.patchTimelineStateInPlace()
      },
    })
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

  private skipRest(): void {
    if (!isRestActiveOrPausedStage(this.stage) || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.restTimer.clear()
    this.moveToNextTimelineItem()
  }

  private beginExerciseTransition(seconds: number): void {
    this.transitionTimer.clear()
    this.nextExerciseRemainingSeconds = seconds
    this.stage = 'transition'

    startManagedCountdown({
      timer: this.transitionTimer,
      getRemaining: () => this.nextExerciseRemainingSeconds,
      setRemaining: (value) => {
        this.nextExerciseRemainingSeconds = value
      },
      onDone: () => {
        this.moveToNextTimelineItem()
      },
      onTick: () => {
        this.patchTimelineStateInPlace()
      },
    })

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

  private patchTimelineStateInPlace(): boolean {
    if (!this.startItem || this.timelineItemAdapters.length !== TIMELINE.length) {
      return false
    }

    const previousActive = this.querySelector<HTMLElement>('.timeline-item[data-state="active"]')

    this.startItem.dataset.state = this.stage === 'locked' ? 'active' : 'complete'
    this.syncStartSectionState(this.startItem)

    this.timelineItemAdapters.forEach((adapter, index) => {
      const timelineState = getTimelineState(this.stage, this.activeTimelineIndex, index)

      this.motionController.markExitingBeforeStateChange(adapter.element === previousActive ? previousActive : null, timelineState)
      syncTimelineItemState(adapter.element, timelineState)

      const item = TIMELINE[index]
      if (item?.kind === 'set' && adapter.kind === 'set') {
        this.patchSetItem(adapter, buildSetItemViewModelForState(item, timelineState, this.getViewState()))
      }

      if (item?.kind === 'rest' && adapter.kind === 'rest') {
        this.patchRestItem(adapter, buildRestItemViewModel(item, timelineState, this.getViewState()))
      }

      if (item?.kind === 'transition' && adapter.kind === 'transition') {
        this.patchTransitionItem(adapter, buildTransitionItemViewModel(item, timelineState, this.getViewState()))
      }
    })

    const currentActive = this.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    this.motionController.sync(this, previousActive, currentActive)
    this.syncAnnouncementRegion()

    return true
  }

  private patchSetItem(adapter: SetTimelineItemDomAdapter, viewModel: SetItemViewModel): void {
    const { exercise } = viewModel

    if (viewModel.timelineState === 'active') {
      adapter.element.dataset.stage = this.stage
    } else {
      delete adapter.element.dataset.stage
    }

    if (adapter.repValueEl && exercise.loggingType === 'reps' && viewModel.isActiveSet) {
      adapter.repValueEl.textContent = viewModel.repDisplay
      adapter.repValueEl.setAttribute('aria-label', viewModel.repDisplay)
    }

    if (exercise.loggingType === 'reps') {
      if (adapter.minusButton) {
        adapter.minusButton.disabled = !viewModel.isActiveSet
      }
      if (adapter.plusButton) {
        adapter.plusButton.disabled = !viewModel.isActiveSet
      }
      if (adapter.confirmButton) {
        adapter.confirmButton.disabled = !viewModel.isActiveSet
        this.setRrrButtonLabel(adapter.confirmButton, viewModel.confirmLabel)
        adapter.confirmButton.setAttribute('aria-label', viewModel.confirmLabel)
      }
      if (adapter.startRestNowButton) {
        adapter.startRestNowButton.disabled = !viewModel.isActiveGrace
        this.setElementHidden(adapter.startRestNowButton, !viewModel.isActiveGrace)
      }
      if (adapter.debounceHint) {
        this.setElementHidden(adapter.debounceHint, !viewModel.isActiveDebounce)
      }
      if (adapter.graceHint) {
        this.setElementHidden(adapter.graceHint, !viewModel.isActiveGrace)
      }
    }

    if (exercise.loggingType === 'time') {
      if (adapter.timedMainGroup) {
        this.setElementHidden(adapter.timedMainGroup, viewModel.isActiveGrace)
      }
      if (adapter.timedGraceGroup) {
        this.setElementHidden(adapter.timedGraceGroup, !viewModel.isActiveGrace)
      }
      if (adapter.timedStartButton) {
        adapter.timedStartButton.disabled = !(viewModel.timelineState === 'active' && viewModel.isActiveTimedReady)
      }
      if (adapter.timedStopButton) {
        adapter.timedStopButton.disabled = !(viewModel.timelineState === 'active' && viewModel.isActiveTimed)
      }
      if (adapter.timedEditButton) {
        adapter.timedEditButton.disabled = !viewModel.isActiveGrace
      }
      if (adapter.timedStartRestNowButton) {
        adapter.timedStartRestNowButton.disabled = !viewModel.isActiveGrace
      }
    }

    if (adapter.timedCountEl && exercise.loggingType === 'time' && viewModel.isActiveTimedSet) {
      adapter.timedCountEl.textContent = viewModel.timedDisplay
    }

    if (adapter.graceCountdownValueEl && viewModel.isActiveGrace) {
      adapter.graceCountdownValueEl.textContent = viewModel.graceCountdownText
    }

    if (adapter.graceSummaryEl && viewModel.isActiveGrace && viewModel.graceSummary) {
      adapter.graceSummaryEl.textContent = viewModel.graceSummary
    }

    if (adapter.debounceCountdownValueEl && viewModel.isActiveDebounce) {
      adapter.debounceCountdownValueEl.textContent = viewModel.debounceCountdownText
    }
  }

  private patchRestItem(adapter: RestTimelineItemDomAdapter, viewModel: RestItemViewModel): void {
    if (adapter.countEl) {
      adapter.countEl.classList.toggle('is-countdown-hidden', !viewModel.showCountdown)
      adapter.countEl.toggleAttribute('aria-hidden', !viewModel.showCountdown)
      adapter.countEl.textContent = viewModel.restDisplayTime
    }

    if (adapter.actionsEl) {
      adapter.actionsEl.classList.toggle('is-wait-hidden', !viewModel.showPrimaryAction)
    }

    if (adapter.primaryActionEl) {
      adapter.primaryActionEl.dataset.action = viewModel.primaryAction
      adapter.primaryActionEl.setAttribute('aria-label', viewModel.primaryLabel)
      adapter.primaryActionEl.setAttribute('title', viewModel.primaryLabel)
      adapter.primaryActionEl.toggleAttribute('disabled', !viewModel.showPrimaryAction)
      adapter.primaryActionEl.toggleAttribute('aria-hidden', !viewModel.showPrimaryAction)
    }

    if (adapter.progressEl) {
      adapter.progressEl.style.height = viewModel.restRemainingPercent
    }
  }

  private patchTransitionItem(adapter: TransitionTimelineItemDomAdapter, viewModel: TransitionItemViewModel): void {
    if (adapter.countEl) {
      adapter.countEl.classList.toggle('is-countdown-hidden', !viewModel.showCountdown)
      adapter.countEl.toggleAttribute('aria-hidden', !viewModel.showCountdown)
      adapter.countEl.textContent = viewModel.transitionDisplayTime
    }

    if (adapter.progressEl) {
      adapter.progressEl.style.height = viewModel.transitionRemainingPercent
    }

    if (adapter.actionsEl) {
      adapter.actionsEl.classList.toggle('is-wait-hidden', !viewModel.showPrimaryAction)
    }

    if (adapter.primaryActionEl) {
      adapter.primaryActionEl.dataset.action = viewModel.transitionPrimaryAction
      adapter.primaryActionEl.setAttribute('aria-label', viewModel.transitionPrimaryLabel)
      adapter.primaryActionEl.setAttribute('title', viewModel.transitionPrimaryLabel)
      adapter.primaryActionEl.toggleAttribute('disabled', !viewModel.showPrimaryAction)
      adapter.primaryActionEl.toggleAttribute('aria-hidden', !viewModel.showPrimaryAction)
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

  private setRrrButtonLabel(buttonHost: HTMLElement, label: string): void {
    const innerButton = buttonHost.querySelector<HTMLButtonElement>('button[data-rrr-button-inner]')
    if (innerButton) {
      innerButton.textContent = label
      return
    }

    buttonHost.textContent = label
  }

  private announce(message: string): void {
    this.liveAnnouncement = message
    this.syncAnnouncementRegion()
  }

  private syncAnnouncementRegion(): void {
    const announcementEl = this.querySelector<HTMLElement>('[data-role="workout-announcement"]')
    if (announcementEl) {
      announcementEl.textContent = this.liveAnnouncement
    }
  }

  private cacheDomReferences(): void {
    this.startItem = this.querySelector<HTMLElement>('.timeline-item--start')
    const timelineElements = Array.from(this.querySelectorAll<HTMLElement>('.timeline-item:not(.timeline-item--start)'))
    this.timelineItemAdapters = timelineElements.length === TIMELINE.length
      ? TIMELINE.map((item, index) => createTimelineItemDomAdapter(item, timelineElements[index]!))
      : []
  }

  private syncOverallProgress(): void {
    const fill = this.querySelector<HTMLElement>('.overall-progress__fill')
    if (!fill) {
      return
    }

    const totalSetCount = getTotalSetCount()
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
      const active = this.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
      active?.scrollIntoView({ behavior, block: 'center' })
    })
  }

  private scrollCompleteIntoView(): void {
    requestAnimationFrame(() => {
      const complete = this.querySelector<HTMLElement>('.timeline-item--complete')
      complete?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  private getCompletedSetCount(): number {
    return this.completedSetsByExercise.reduce((sum, value) => sum + value, 0)
  }

  private getViewState(): WorkoutLoggingViewState {
    return {
      stage: this.stage,
      activeTimelineIndex: this.activeTimelineIndex,
      repValue: this.repValue,
      timedSetElapsedSeconds: this.timedSetElapsedSeconds,
      restRemainingSeconds: this.restRemainingSeconds,
      repConfirmGraceRemainingSeconds: this.repConfirmGraceRemainingSeconds,
      repAdjustmentDebounceRemainingSeconds: this.repAdjustmentDebounceRemainingSeconds,
      nextExerciseRemainingSeconds: this.nextExerciseRemainingSeconds,
      lastConfirmedSummary: this.lastConfirmedSummary,
      overallProgressVisualPercent: this.overallProgressVisualPercent,
      completedSetCount: this.getCompletedSetCount(),
      totalSetCount: getTotalSetCount(),
      liveAnnouncement: this.liveAnnouncement,
    }
  }

  private render(): void {
    const viewState = this.getViewState()
    this.innerHTML = renderWorkoutLoggingMarkup(viewState, styles, TIMELINE)

    this.cacheDomReferences()
    this.syncAnnouncementRegion()

    requestAnimationFrame(() => {
      const fill = this.querySelector<HTMLElement>('.overall-progress__fill')
      if (!fill) {
        return
      }

      // Set the target on the next frame so the initial inline height is painted first.
      requestAnimationFrame(() => {
        const percent = viewState.totalSetCount > 0 ? (viewState.completedSetCount / viewState.totalSetCount) * 100 : 0
        fill.style.height = `${percent}%`
        this.overallProgressVisualPercent = percent
      })
    })
  }
}

customElements.define('rrr-workout-logging-flow', RrrWorkoutLoggingFlow)
