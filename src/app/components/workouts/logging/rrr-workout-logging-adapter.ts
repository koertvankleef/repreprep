import type { AppData, ExerciseDefinition, SetEntry, Workout } from '../../../../domain/types.ts'
import {
  buildTimeline,
  type Exercise,
  type TimelineItem,
} from './rrr-workout-logging-model.ts'

export interface WorkoutLoggingAdapterOptions {
  defaultRestSeconds?: number
  transitionSeconds?: number
  restSecondsByExerciseId?: Record<string, number>
  previousPerformanceByExerciseId?: Record<string, string>
}

export interface WorkoutLoggingAdapterResult {
  exercises: Exercise[]
  timeline: TimelineItem[]
  exerciseEntryIds: string[]
}

const DEFAULT_REST_SECONDS = 20
const DEFAULT_TRANSITION_SECONDS = 10
const DEFAULT_PREVIOUS_PERFORMANCE = 'No previous data'

export function buildWorkoutLoggingData(
  data: Pick<AppData, 'exercises'>,
  workout: Workout,
  options: WorkoutLoggingAdapterOptions = {},
): WorkoutLoggingAdapterResult {
  const transitionsSeconds = Math.max(0, workout.transitionSeconds ?? options.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS)
  const eligibleEntries = workout.exercises
    .filter((entry) => entry.sets.length > 0)
  const exercises = eligibleEntries
    .map((entry) => {
      const resolvedRestSeconds = Math.max(
        0,
        entry.restSeconds
          ?? options.restSecondsByExerciseId?.[entry.exerciseId]
          ?? options.defaultRestSeconds
          ?? DEFAULT_REST_SECONDS,
      )

      return mapExerciseEntry(data.exercises, entry.exerciseId, entry.sets, resolvedRestSeconds, options)
    })

  return {
    exercises,
    timeline: buildTimeline(exercises, transitionsSeconds),
    exerciseEntryIds: eligibleEntries.map((entry) => entry.id),
  }
}

function mapExerciseEntry(
  definitions: ExerciseDefinition[],
  exerciseId: string,
  sets: SetEntry[],
  restSeconds: number,
  options: WorkoutLoggingAdapterOptions,
): Exercise {
  const definition = definitions.find((entry) => entry.id === exerciseId)
  if (!definition) {
    throw new Error(`Missing exercise definition for workout exercise id "${exerciseId}".`)
  }

  const previousPerformance = options.previousPerformanceByExerciseId?.[exerciseId]
    ?? inferPreviousPerformance(sets)
    ?? DEFAULT_PREVIOUS_PERFORMANCE

  if (definition.kind === 'time') {
    return {
      name: definition.name,
      loggingType: 'time',
      totalSets: sets.length,
      restSeconds,
      previousPerformance,
      targetDurationSeconds: inferFirstTargetDuration(sets),
    }
  }

  return {
    name: definition.name,
    loggingType: 'reps',
    totalSets: sets.length,
    restSeconds,
    previousPerformance,
    suggestedReps: inferFirstSuggestedReps(sets),
  }
}

function inferFirstSuggestedReps(sets: SetEntry[]): number | undefined {
  const firstRepSet = sets.find((set): set is Extract<SetEntry, { kind: 'reps' }> => set.kind === 'reps')
  if (!firstRepSet) {
    return undefined
  }

  return Math.max(0, firstRepSet.reps)
}

function inferFirstTargetDuration(sets: SetEntry[]): number | undefined {
  const firstTimeSet = sets.find((set): set is Extract<SetEntry, { kind: 'time' }> => set.kind === 'time')
  if (!firstTimeSet) {
    return undefined
  }

  return Math.max(0, firstTimeSet.seconds)
}

function inferPreviousPerformance(sets: SetEntry[]): string | null {
  const lastSet = sets.at(-1)
  if (!lastSet) {
    return null
  }

  if (lastSet.kind === 'time') {
    return `${Math.max(0, lastSet.seconds)} sec`
  }

  const safeReps = Math.max(0, lastSet.reps)
  if (lastSet.weightKg === null) {
    return `${safeReps} reps`
  }

  return `${safeReps} reps @ ${lastSet.weightKg}kg`
}
