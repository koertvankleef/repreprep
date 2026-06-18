import type { Workout } from '../../domain/types.ts'
import type { WorkoutEvent } from './rrr-workout-logging-model.ts'

export function applyWorkoutLoggingEventToWorkout(
  workout: Workout,
  exerciseEntryIds: string[],
  event: WorkoutEvent,
): Workout | null {
  if (event.type === 'timedSetStarted') {
    return null
  }

  const entryId = exerciseEntryIds[event.exerciseIndex]
  if (!entryId) {
    return null
  }

  const exerciseEntryIndex = workout.exercises.findIndex((entry) => entry.id === entryId)
  if (exerciseEntryIndex < 0) {
    return null
  }

  const exerciseEntry = workout.exercises[exerciseEntryIndex]
  if (!exerciseEntry) {
    return null
  }

  const targetSetIndex = event.setNumber - 1
  if (targetSetIndex < 0 || targetSetIndex >= exerciseEntry.sets.length) {
    return null
  }

  const currentSet = exerciseEntry.sets[targetSetIndex]
  if (!currentSet) {
    return null
  }

  if (event.type === 'repResultConfirmed') {
    if (currentSet.kind !== 'reps') {
      return null
    }

    const updatedSet = {
      ...currentSet,
      reps: Math.max(0, event.reps),
    }

    return updateWorkoutSet(workout, exerciseEntryIndex, targetSetIndex, updatedSet)
  }

  if (currentSet.kind !== 'time') {
    return null
  }

  const updatedSet = {
    ...currentSet,
    seconds: Math.max(0, event.durationSeconds),
  }

  return updateWorkoutSet(workout, exerciseEntryIndex, targetSetIndex, updatedSet)
}

function updateWorkoutSet(
  workout: Workout,
  exerciseEntryIndex: number,
  setIndex: number,
  updatedSet: Workout['exercises'][number]['sets'][number],
): Workout {
  const updatedEntry = {
    ...workout.exercises[exerciseEntryIndex]!,
    sets: workout.exercises[exerciseEntryIndex]!.sets.map((set, index) => (index === setIndex ? updatedSet : set)),
  }

  return {
    ...workout,
    exercises: workout.exercises.map((entry, index) => (index === exerciseEntryIndex ? updatedEntry : entry)),
    updatedAt: new Date().toISOString(),
  }
}
