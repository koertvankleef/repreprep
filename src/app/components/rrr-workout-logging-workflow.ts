import {
  EXERCISES,
  getExercise,
  type ActivationPlan,
  type ActiveStage,
  type TimelineItem,
} from './rrr-workout-logging-model.ts'

export function isSetInteractionStage(stage: ActiveStage): boolean {
  return stage === 'set' || stage === 'set-debounce' || stage === 'set-grace'
}

export function isSetGraceStage(stage: ActiveStage): boolean {
  return stage === 'set-grace'
}

export function isSetDebounceStage(stage: ActiveStage): boolean {
  return stage === 'set-debounce'
}

export function isTimedReadyStage(stage: ActiveStage): boolean {
  return stage === 'timed-ready'
}

export function isTimedActiveStage(stage: ActiveStage): boolean {
  return stage === 'timed-active'
}

export function isTimedReadyOrActiveStage(stage: ActiveStage): boolean {
  return isTimedReadyStage(stage) || isTimedActiveStage(stage)
}

export function isRestActiveOrPausedStage(stage: ActiveStage): boolean {
  return stage === 'rest' || stage === 'rest-paused'
}

export function isRestActiveStage(stage: ActiveStage): boolean {
  return stage === 'rest'
}

export function isTransitionActiveOrPausedStage(stage: ActiveStage): boolean {
  return stage === 'transition' || stage === 'transition-paused'
}

export function isTransitionActiveStage(stage: ActiveStage): boolean {
  return stage === 'transition'
}

export function getActivationPlan(item: TimelineItem | null): ActivationPlan {
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

export function getTotalSetCount(): number {
  return EXERCISES.reduce((sum, exercise) => sum + exercise.totalSets, 0)
}
