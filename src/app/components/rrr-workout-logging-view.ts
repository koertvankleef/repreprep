import {
  EXERCISES,
  getExercise,
  type ActiveStage,
  type RestItemViewModel,
  type SetItemViewModel,
  type TimelineItem,
  type TimelineState,
  type TransitionItemViewModel,
} from './rrr-workout-logging-model.ts'
import {
  isRestActiveOrPausedStage,
  isRestActiveStage,
  isSetDebounceStage,
  isSetGraceStage,
  isSetInteractionStage,
  isTimedActiveStage,
  isTimedReadyOrActiveStage,
  isTimedReadyStage,
  isTransitionActiveOrPausedStage,
  isTransitionActiveStage,
} from './rrr-workout-logging-workflow.ts'

export type WorkoutLoggingViewState = {
  stage: ActiveStage
  activeTimelineIndex: number
  repValue: number
  timedSetElapsedSeconds: number
  restRemainingSeconds: number
  repConfirmGraceRemainingSeconds: number
  repAdjustmentDebounceRemainingSeconds: number
  nextExerciseRemainingSeconds: number
  lastConfirmedSummary: string | null
  overallProgressVisualPercent: number
  completedSetCount: number
  totalSetCount: number
  liveAnnouncement: string
}

export function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function getTimelineState(stage: ActiveStage, activeTimelineIndex: number, index: number): TimelineState {
  if (stage === 'locked') {
    return 'future'
  }

  if (stage === 'workout-complete') {
    return 'complete'
  }

  if (index < activeTimelineIndex) {
    return 'complete'
  }

  if (index > activeTimelineIndex) {
    return 'future'
  }

  return 'active'
}

export function buildSetItemViewModelForState(item: Extract<TimelineItem, { kind: 'set' }>, timelineState: TimelineState, state: WorkoutLoggingViewState): SetItemViewModel {
  const exercise = getExercise(item.exerciseIndex)
  const isActive = timelineState === 'active'
  return {
    timelineState,
    exercise,
    setNumber: item.setNumber,
    stageDataAttribute: isActive ? ` data-stage="${state.stage}"` : '',
    isActiveSet: isActive && isSetInteractionStage(state.stage),
    isActiveTimedReady: isActive && isTimedReadyStage(state.stage),
    isActiveTimed: isActive && isTimedActiveStage(state.stage),
    isActiveTimedSet: isActive && isTimedReadyOrActiveStage(state.stage),
    isActiveDebounce: isActive && isSetDebounceStage(state.stage),
    isActiveGrace: isActive && isSetGraceStage(state.stage),
    repDisplay: `${state.repValue} reps`,
    timedDisplay: formatClock(state.timedSetElapsedSeconds),
    timedTargetDisplay: formatClock(exercise.targetDurationSeconds ?? 0),
    graceCountdownText: `${state.repConfirmGraceRemainingSeconds}`,
    debounceCountdownText: `${state.repAdjustmentDebounceRemainingSeconds}`,
    graceSummary: state.lastConfirmedSummary ?? '',
    confirmLabel: `Log ${state.repValue} reps`,
  }
}

export function buildRestItemViewModel(item: Extract<TimelineItem, { kind: 'rest' }>, timelineState: TimelineState, state: WorkoutLoggingViewState): RestItemViewModel {
  const isActiveRest = timelineState === 'active' && isRestActiveOrPausedStage(state.stage)
  return {
    timelineState,
    durationSeconds: item.durationSeconds,
    isActiveRest,
    restDisplayTime: isActiveRest ? formatClock(state.restRemainingSeconds) : formatClock(item.durationSeconds),
    restRemainingPercent: isActiveRest
      ? `${Math.max(0, Math.min(100, (state.restRemainingSeconds / item.durationSeconds) * 100))}%`
      : timelineState === 'complete'
        ? '0%'
        : '100%',
    primaryAction: isRestActiveStage(state.stage) ? 'pause-rest' : 'resume-rest',
    primaryLabel: isRestActiveStage(state.stage) ? 'Pause' : 'Resume',
  }
}

export function buildTransitionItemViewModel(item: Extract<TimelineItem, { kind: 'transition' }>, timelineState: TimelineState, state: WorkoutLoggingViewState): TransitionItemViewModel {
  const nextExercise = EXERCISES[item.exerciseIndex + 1]
  const isActiveTransition = timelineState === 'active' && isTransitionActiveOrPausedStage(state.stage)
  return {
    timelineState,
    durationSeconds: item.durationSeconds,
    isActiveTransition,
    transitionDisplayTime: `${isActiveTransition ? state.nextExerciseRemainingSeconds : item.durationSeconds}`,
    transitionRemainingPercent: isActiveTransition
      ? `${Math.max(0, Math.min(100, (state.nextExerciseRemainingSeconds / item.durationSeconds) * 100))}%`
      : timelineState === 'complete'
        ? '0%'
        : '100%',
    transitionPrimaryAction: isTransitionActiveStage(state.stage) ? 'stay-here' : 'next',
    transitionPrimaryLabel: isTransitionActiveStage(state.stage) ? 'Stay Here' : 'Next',
    nextExerciseName: nextExercise ? nextExercise.name : 'Workout complete',
  }
}

export function renderTimelineItem(item: TimelineItem, index: number, state: WorkoutLoggingViewState): string {
  const timelineState = getTimelineState(state.stage, state.activeTimelineIndex, index)
  if (item.kind === 'set') {
    return renderActivityItem(buildSetItemViewModelForState(item, timelineState, state))
  }

  if (item.kind === 'rest') {
    return renderRestTimelineItem(buildRestItemViewModel(item, timelineState, state))
  }

  return renderTransitionTimelineItem(buildTransitionItemViewModel(item, timelineState, state))
}

export function renderWorkoutLoggingMarkup(state: WorkoutLoggingViewState, styles: string, timeline: TimelineItem[]): string {
  const startState = state.stage === 'locked' ? 'active' : 'complete'
  return `
    <style>${styles}</style>
    <section class="prototype">
      <div class="overall-progress" aria-hidden="true">
        <div class="overall-progress__track">
          <span class="overall-progress__fill" style="height: ${state.overallProgressVisualPercent}%;"></span>
        </div>
      </div>
      <div class="live-announcer" data-role="workout-announcement" aria-live="polite" aria-atomic="true">${state.liveAnnouncement}</div>
      <div class="stack is-dimmed">
        <section class="timeline-item timeline-item--start" data-state="${startState}">
          <h2 class="name">Ready?</h2>
          <div class="actions start-actions"${state.stage !== 'locked' ? ' hidden aria-hidden="true"' : ''}><rrr-button data-action="go" type="button" tone="accent">GO</rrr-button></div>
          <div class="hint start-hint"${state.stage === 'locked' ? ' hidden aria-hidden="true"' : ''}>Workout flow is running. Active section is centered when possible.</div>
        </section>

        ${timeline.map((item, index) => renderTimelineItem(item, index, state)).join('')}

        ${state.stage === 'workout-complete'
          ? `
            <section class="timeline-item timeline-item--complete" data-state="active">
              <h2 class="name">Workout complete</h2>
              <div class="hint">Logged sets: ${state.completedSetCount}</div>
              <div class="hint">Your logged values were saved during the flow.</div>
              <div class="actions">
                <rrr-button type="button" tone="accent" data-action="finish-workout">Review Workout</rrr-button>
              </div>
            </section>
          `
          : ''}
      </div>
    </section>
  `
}

function renderActivityItem(viewModel: SetItemViewModel): string {
  if (viewModel.exercise.loggingType === 'time') {
    return renderSetCard(viewModel, renderTimedSetDetail(viewModel))
  }

  return renderSetCard(viewModel, renderRepSetDetail(viewModel))
}

function renderSetCard(viewModel: SetItemViewModel, detailMarkup: string): string {
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

function renderTimedSetDetail(viewModel: SetItemViewModel): string {
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

function renderRepSetDetail(viewModel: SetItemViewModel): string {
  return `
    <div class="rep-row">
      <rrr-button type="button" variant="outline" data-action="rep-minus" aria-label="Decrease reps" ${viewModel.isActiveSet ? '' : 'disabled'}>-</rrr-button>
      <div class="rep-value" aria-live="polite" aria-atomic="true" aria-label="${viewModel.repDisplay}">${viewModel.repDisplay}</div>
      <rrr-button type="button" variant="outline" data-action="rep-plus" aria-label="Increase reps" ${viewModel.isActiveSet ? '' : 'disabled'}>+</rrr-button>
    </div>
    <div class="hint rep-debounce-hint"${viewModel.isActiveDebounce ? '' : ' hidden aria-hidden="true"'}>Auto-confirm in <span class="debounce-countdown-value">${viewModel.debounceCountdownText}</span>...</div>
    <div class="hint rep-grace-hint"${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>Rest starts in <span class="grace-countdown-value">${viewModel.graceCountdownText}</span>...</div>
    <div class="actions">
      <rrr-button type="button" data-action="done-set" class="rep-confirm-action" aria-label="${viewModel.confirmLabel}" ${viewModel.isActiveSet ? '' : 'disabled'}>${viewModel.confirmLabel}</rrr-button>
      <rrr-button type="button" data-action="start-rest-now" class="rep-start-rest-now-action" ${viewModel.isActiveGrace ? '' : 'disabled'}${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>Start Rest Now</rrr-button>
    </div>
  `
}

function renderRestTimelineItem(viewModel: RestItemViewModel): string {
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

function renderTransitionTimelineItem(viewModel: TransitionItemViewModel): string {
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
