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
import { t } from '../../../../i18n/index.ts'

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
    repDisplay: t('workoutLogging.repsValue', { count: state.repValue }),
    timedDisplay: formatClock(state.timedSetElapsedSeconds),
    timedTargetDisplay: formatClock(exercise.targetDurationSeconds ?? 0),
    graceCountdownText: `${state.repConfirmGraceRemainingSeconds}`,
    debounceCountdownText: `${state.repAdjustmentDebounceRemainingSeconds}`,
    graceSummary: state.lastConfirmedSummary ?? '',
    confirmLabel: t('workoutLogging.action.logReps', { count: state.repValue }),
  }
}

export function buildRestItemViewModel(item: Extract<TimelineItem, { kind: 'rest' }>, timelineState: TimelineState, state: WorkoutLoggingViewState): RestItemViewModel {
  const isActiveRest = timelineState === 'active' && isRestActiveOrPausedStage(state.stage)
  const isRunningRest = timelineState === 'active' && isRestActiveStage(state.stage)
  const isPausedRest = isActiveRest && !isRunningRest
  return {
    timelineState,
    durationSeconds: item.durationSeconds,
    isActiveRest,
    showCountdown: isRunningRest,
    restDisplayTime: isActiveRest ? formatClock(state.restRemainingSeconds) : formatClock(item.durationSeconds),
    restRemainingPercent: isRunningRest
      ? `${Math.max(0, Math.min(100, (state.restRemainingSeconds / item.durationSeconds) * 100))}%`
      : timelineState === 'complete' || isPausedRest
        ? '0%'
        : '100%',
    showPrimaryAction: isRunningRest,
    primaryAction: 'pause-rest',
    primaryLabel: t('workoutLogging.action.wait'),
  }
}

export function buildTransitionItemViewModel(item: Extract<TimelineItem, { kind: 'transition' }>, timelineState: TimelineState, state: WorkoutLoggingViewState): TransitionItemViewModel {
  const nextExercise = EXERCISES[item.exerciseIndex + 1]
  const isActiveTransition = timelineState === 'active' && isTransitionActiveOrPausedStage(state.stage)
  const isRunningTransition = timelineState === 'active' && isTransitionActiveStage(state.stage)
  const isPausedTransition = isActiveTransition && !isRunningTransition
  return {
    timelineState,
    durationSeconds: item.durationSeconds,
    isActiveTransition,
    showCountdown: isRunningTransition,
    transitionDisplayTime: `${isActiveTransition ? state.nextExerciseRemainingSeconds : item.durationSeconds}`,
    transitionRemainingPercent: isRunningTransition
      ? `${Math.max(0, Math.min(100, (state.nextExerciseRemainingSeconds / item.durationSeconds) * 100))}%`
      : timelineState === 'complete' || isPausedTransition
        ? '0%'
        : '100%',
    showPrimaryAction: isRunningTransition,
    transitionPrimaryAction: 'stay-here',
    transitionPrimaryLabel: t('workoutLogging.action.wait'),
    nextExerciseName: nextExercise ? nextExercise.name : t('workoutLogging.complete.title'),
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
          <h2 class="name">${t('workoutLogging.ready.title')}</h2>
          <div class="actions start-actions"${state.stage !== 'locked' ? ' hidden aria-hidden="true"' : ''}><rrr-button data-action="go" type="button" tone="accent" rounded>${t('workoutLogging.action.go')}</rrr-button></div>
          <div class="hint start-hint"${state.stage === 'locked' ? ' hidden aria-hidden="true"' : ''}>${t('workoutLogging.ready.runningHint')}</div>
        </section>

        ${timeline.map((item, index) => renderTimelineItem(item, index, state)).join('')}

        ${state.stage === 'workout-complete'
          ? `
            <section class="timeline-item timeline-item--complete" data-state="active">
              <h2 class="name">${t('workoutLogging.complete.title')}</h2>
              <div class="hint">${t('workoutLogging.complete.loggedSets', { count: state.completedSetCount })}</div>
              <div class="hint">${t('workoutLogging.complete.savedHint')}</div>
              <div class="actions">
                <rrr-button type="button" tone="accent" data-action="finish-and-use">${t('workoutLogging.action.finishAndUse')}</rrr-button>
                <rrr-button type="button" variant="outline" data-action="finish-without-use">${t('workoutLogging.action.finishWithoutUse')}</rrr-button>
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
        <h2 class="name"><span class="name-prefix">${t('workoutLogging.set.doingPrefix')}&nbsp;</span><span class="name-text">${viewModel.exercise.name}</span></h2>
        <span class="set-count">${viewModel.setNumber} / ${viewModel.exercise.totalSets}</span>
      </div>
      <div class="set-detail">
        <div class="set-detail__inner">
          <div class="last-time">${t('workoutLogging.set.previous', { value: viewModel.exercise.previousPerformance })}</div>
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
      <div class="hint">${t('workoutLogging.timed.target', { duration: viewModel.timedTargetDisplay })}</div>
      <div class="actions">
        <rrr-button type="button" data-action="start-timed-set" class="timed-start-action" ${viewModel.isActiveTimedReady ? '' : 'disabled'}>${t('workoutLogging.action.start')}</rrr-button>
        <rrr-button type="button" variant="outline" data-action="stop-timed-set" class="timed-stop-action" ${viewModel.isActiveTimed ? '' : 'disabled'}>${t('workoutLogging.action.stop')}</rrr-button>
      </div>
    </div>
    <div class="timed-grace-group"${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>
      <div class="rep-row">
        <div class="rep-value grace-summary">${viewModel.graceSummary}</div>
      </div>
      <div class="hint">${t('workoutLogging.rest.startsInPrefix')} <span class="grace-countdown-value">${viewModel.graceCountdownText}</span>${t('workoutLogging.countdownSuffix')}</div>
      <div class="actions">
        <rrr-button type="button" variant="outline" data-action="edit-grace" class="timed-edit-grace-action" ${viewModel.isActiveGrace ? '' : 'disabled'}>${t('action.edit')}</rrr-button>
        <rrr-button type="button" data-action="start-rest-now" class="timed-start-rest-now-action" ${viewModel.isActiveGrace ? '' : 'disabled'}>${t('workoutLogging.action.startRestNow')}</rrr-button>
      </div>
    </div>
  `
}

function renderRepSetDetail(viewModel: SetItemViewModel): string {
  return `
    <div class="rep-row">
      <rrr-button type="button" variant="outline" rounded data-action="rep-minus" aria-label="${t('workoutLogging.action.decreaseReps')}" ${viewModel.isActiveSet ? '' : 'disabled'}><rrr-icon name="subtract"></rrr-icon></rrr-button>
      <div class="rep-value" aria-live="polite" aria-atomic="true" aria-label="${viewModel.repDisplay}">${viewModel.repDisplay}</div>
      <rrr-button type="button" variant="outline" rounded data-action="rep-plus" aria-label="${t('workoutLogging.action.increaseReps')}" ${viewModel.isActiveSet ? '' : 'disabled'}><rrr-icon name="add"></rrr-icon></rrr-button>
    </div>
    <div class="hint rep-debounce-hint"${viewModel.isActiveDebounce ? '' : ' hidden aria-hidden="true"'}>${t('workoutLogging.reps.autoConfirmInPrefix')} <span class="debounce-countdown-value">${viewModel.debounceCountdownText}</span>${t('workoutLogging.countdownSuffix')}</div>
    <div class="hint rep-grace-hint"${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>${t('workoutLogging.rest.startsInPrefix')} <span class="grace-countdown-value">${viewModel.graceCountdownText}</span>${t('workoutLogging.countdownSuffix')}</div>
    <div class="actions">
      <rrr-button type="button" data-action="done-set" rounded class="rep-confirm-action" aria-label="${viewModel.confirmLabel}" ${viewModel.isActiveSet ? '' : 'disabled'}>${viewModel.confirmLabel}</rrr-button>
      <rrr-button type="button" data-action="start-rest-now" rounded class="rep-start-rest-now-action" ${viewModel.isActiveGrace ? '' : 'disabled'}${viewModel.isActiveGrace ? '' : ' hidden aria-hidden="true"'}>${t('workoutLogging.action.startRestNow')}</rrr-button>
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
        <div class="rest-title"><rrr-icon name="water-bottle"></rrr-icon>${t('workoutLogging.rest.title')}</div>
        <span class="stage-count stage-count--rest${viewModel.showCountdown ? '' : ' is-countdown-hidden'}"${viewModel.showCountdown ? '' : ' aria-hidden="true"'}>${viewModel.restDisplayTime}</span>
      </div>
      <div class="rest-detail">
        <div class="rest-detail__inner">
          <div class="actions actions--wait-flow${viewModel.showPrimaryAction ? '' : ' is-wait-hidden'}">
            <rrr-button type="button" variant="outline" rounded tone="accent" data-action="${viewModel.primaryAction}" class="rest-primary-action" aria-label="${viewModel.primaryLabel}" title="${viewModel.primaryLabel}"${viewModel.showPrimaryAction ? '' : ' aria-hidden="true" disabled'}><rrr-icon name="stop"></rrr-icon></rrr-button>
            <rrr-button type="button" variant="outline" rounded tone="accent" data-action="skip-rest" class="rest-next-action"><rrr-icon name="next"></rrr-icon></rrr-button>
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
        <div class="rest-title">${t('workoutLogging.transition.title', { exercise: viewModel.nextExerciseName })}</div>
        <span class="stage-count stage-count--transition${viewModel.showCountdown ? '' : ' is-countdown-hidden'}"${viewModel.showCountdown ? '' : ' aria-hidden="true"'}>${viewModel.transitionDisplayTime}</span>
      </div>
      <div class="transition-detail transition-detail--actions">
        <div class="transition-detail__inner">
          <div class="actions actions--wait-flow${viewModel.showPrimaryAction ? '' : ' is-wait-hidden'}">
            <rrr-button type="button" variant="outline" rounded tone="accent" data-action="${viewModel.transitionPrimaryAction}" class="transition-primary-action" aria-label="${viewModel.transitionPrimaryLabel}" title="${viewModel.transitionPrimaryLabel}"${viewModel.showPrimaryAction ? '' : ' aria-hidden="true" disabled'}><rrr-icon name="stop"></rrr-icon></rrr-button>
            <rrr-button type="button" variant="outline" rounded tone="accent" data-action="next-now" class="transition-next-action"><rrr-icon name="next"></rrr-icon></rrr-button>
          </div>
        </div>
      </div>
    </section>
  `
}
