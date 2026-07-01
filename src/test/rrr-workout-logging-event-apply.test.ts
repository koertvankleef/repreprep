import { describe, expect, test, vi } from 'vitest'
import type { Workout, WorkoutExerciseEntry } from '../domain/types.ts'
import { applyWorkoutLoggingEventToWorkout } from '../app/components/workouts/logging/rrr-workout-logging-event-apply.ts'

function createWorkout(): Workout {
  const repEntry: WorkoutExerciseEntry = {
    id: 'entry-reps',
    exerciseId: 'exercise-reps',
    notes: '',
    sets: [
      { id: 'set-reps-1', kind: 'reps', reps: 10, weightKg: null, notes: '' },
      { id: 'set-reps-2', kind: 'reps', reps: 8, weightKg: 14, notes: '' },
    ],
  }

  const timeEntry: WorkoutExerciseEntry = {
    id: 'entry-time',
    exerciseId: 'exercise-time',
    notes: '',
    sets: [{ id: 'set-time-1', kind: 'time', seconds: 30, notes: '' }],
  }

  return {
    id: 'workout-1',
    date: '2026-06-18',
    notes: '',
    createdAt: '2026-06-18T10:00:00.000Z',
    updatedAt: '2026-06-18T10:00:00.000Z',
    exercises: [repEntry, timeEntry],
  }
}

describe('rrr-workout-logging-event-apply', () => {
  test('updates reps set when rep result is confirmed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T12:00:00.000Z'))

    const workout = createWorkout()
    const updated = applyWorkoutLoggingEventToWorkout(workout, ['entry-reps', 'entry-time'], {
      type: 'repResultConfirmed',
      exerciseIndex: 0,
      setNumber: 2,
      reps: 12,
    })

    expect(updated).toBeTruthy()
    expect(updated?.exercises[0]?.sets[1]).toEqual({
      id: 'set-reps-2',
      kind: 'reps',
      reps: 12,
      weightKg: 14,
      notes: '',
    })
    expect(updated?.updatedAt).toBe('2026-06-18T12:00:00.000Z')

    vi.useRealTimers()
  })

  test('updates time set when timed set is completed', () => {
    const workout = createWorkout()
    const updated = applyWorkoutLoggingEventToWorkout(workout, ['entry-reps', 'entry-time'], {
      type: 'timedSetCompleted',
      exerciseIndex: 1,
      setNumber: 1,
      durationSeconds: 42,
      completionType: 'target-reached',
    })

    expect(updated?.exercises[1]?.sets[0]).toEqual({
      id: 'set-time-1',
      kind: 'time',
      seconds: 42,
      notes: '',
    })
  })

  test('returns null for timed-set-started because it does not commit results', () => {
    const workout = createWorkout()
    const updated = applyWorkoutLoggingEventToWorkout(workout, ['entry-reps', 'entry-time'], {
      type: 'timedSetStarted',
      exerciseIndex: 1,
      setNumber: 1,
      targetDurationSeconds: 30,
    })

    expect(updated).toBeNull()
  })

  test('returns null when mapping points to a missing workout entry', () => {
    const workout = createWorkout()
    const updated = applyWorkoutLoggingEventToWorkout(workout, ['missing-entry'], {
      type: 'repResultConfirmed',
      exerciseIndex: 0,
      setNumber: 1,
      reps: 15,
    })

    expect(updated).toBeNull()
  })
})
