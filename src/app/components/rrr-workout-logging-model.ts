export type Exercise = {
  name: string
  loggingType: 'reps' | 'time'
  totalSets: number
  restSeconds: number
  previousPerformance: string
  suggestedReps?: number
  targetDurationSeconds?: number
}

export type TimelineItem =
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

export type ActiveStage =
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

export type WorkoutEvent =
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

export type TimelineState = 'future' | 'active' | 'complete'

export type SetItemViewModel = {
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
  confirmLabel: string
}

export type RestItemViewModel = {
  timelineState: TimelineState
  durationSeconds: number
  isActiveRest: boolean
  showCountdown: boolean
  restDisplayTime: string
  restRemainingPercent: string
  showPrimaryAction: boolean
  primaryAction: 'pause-rest'
  primaryLabel: 'Wait'
}

export type TransitionItemViewModel = {
  timelineState: TimelineState
  durationSeconds: number
  isActiveTransition: boolean
  showCountdown: boolean
  transitionDisplayTime: string
  transitionRemainingPercent: string
  showPrimaryAction: boolean
  transitionPrimaryAction: 'stay-here'
  transitionPrimaryLabel: 'Wait'
  nextExerciseName: string
}

export type ActivationPlan =
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

const DEFAULT_EXERCISES: Exercise[] = [
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

const DEFAULT_EXERCISE_TRANSITION_SECONDS = 10
export const REP_CONFIRM_GRACE_SECONDS = 5
export const REP_ADJUST_AUTO_PROCEED_SECONDS = 3

export let EXERCISES: Exercise[] = DEFAULT_EXERCISES
export let EXERCISE_TRANSITION_SECONDS = DEFAULT_EXERCISE_TRANSITION_SECONDS

export function buildTimeline(exercises: Exercise[], exerciseTransitionSeconds: number): TimelineItem[] {
  const timeline: TimelineItem[] = []

  exercises.forEach((exercise, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= exercise.totalSets; setNumber += 1) {
      timeline.push({ kind: 'set', exerciseIndex, setNumber })

      if (setNumber < exercise.totalSets) {
        timeline.push({ kind: 'rest', exerciseIndex, setNumber, durationSeconds: exercise.restSeconds })
      }
    }

    if (exerciseIndex < exercises.length - 1) {
      timeline.push({ kind: 'transition', exerciseIndex, durationSeconds: exerciseTransitionSeconds })
    }
  })

  return timeline
}

export let TIMELINE = buildTimeline(EXERCISES, EXERCISE_TRANSITION_SECONDS)

export function configureWorkoutLoggingModel(input: {
  exercises: Exercise[]
  timeline?: TimelineItem[]
  exerciseTransitionSeconds?: number
}): void {
  EXERCISE_TRANSITION_SECONDS = Math.max(0, input.exerciseTransitionSeconds ?? DEFAULT_EXERCISE_TRANSITION_SECONDS)
  EXERCISES = [...input.exercises]
  TIMELINE = input.timeline ? [...input.timeline] : buildTimeline(EXERCISES, EXERCISE_TRANSITION_SECONDS)
}

export function resetWorkoutLoggingModel(): void {
  EXERCISES = DEFAULT_EXERCISES
  EXERCISE_TRANSITION_SECONDS = DEFAULT_EXERCISE_TRANSITION_SECONDS
  TIMELINE = buildTimeline(EXERCISES, EXERCISE_TRANSITION_SECONDS)
}

export function getExercise(index: number): Exercise {
  const exercise = EXERCISES[index]
  if (!exercise) {
    throw new Error(`Missing exercise at index ${index}`)
  }
  return exercise
}
