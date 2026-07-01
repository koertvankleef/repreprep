import { describe, expect, test } from 'vitest'
import type { AppData, Workout } from '../domain/types.ts'
import { buildWorkoutLoggingData } from '../app/components/workouts/logging/rrr-workout-logging-adapter.ts'

function createBaseData(): AppData {
  return {
    schemaVersion: 4,
    exercises: [
      {
        id: 'ex-reps',
        name: 'Push-ups',
        aliases: [],
        description: '',
        categories: ['strength'],
        equipment: ['bodyweight'],
        primaryMuscles: ['chest'],
        secondaryMuscles: ['shoulders', 'triceps'],
        measurementProfiles: [['reps']],
        createdByUser: false,
        kind: 'reps',
        defaultUnit: 'kg',
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'ex-time',
        name: 'Plank',
        aliases: [],
        description: '',
        categories: ['strength'],
        equipment: ['bodyweight'],
        primaryMuscles: ['abs'],
        secondaryMuscles: [],
        measurementProfiles: [['time']],
        createdByUser: false,
        kind: 'time',
        defaultUnit: 'seconds',
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    workouts: [],
    routines: [],
    routineVersions: [],
  }
}

function createWorkout(): Workout {
  return {
    id: 'workout-1',
    date: '2026-06-18',
    notes: '',
    transitionSeconds: 12,
    createdAt: '2026-06-18T10:00:00.000Z',
    updatedAt: '2026-06-18T10:00:00.000Z',
    exercises: [
      {
        id: 'entry-1',
        exerciseId: 'ex-reps',
        restSeconds: 33,
        notes: '',
        sets: [
          { id: 'set-1', kind: 'reps', reps: 12, weightKg: null, notes: '' },
          { id: 'set-2', kind: 'reps', reps: 10, weightKg: 14, notes: '' },
        ],
      },
      {
        id: 'entry-2',
        exerciseId: 'ex-time',
        restSeconds: 5,
        notes: '',
        sets: [{ id: 'set-3', kind: 'time', seconds: 30, notes: '' }],
      },
    ],
  }
}

describe('rrr-workout-logging-adapter', () => {
  test('maps workout entries into prototype exercises and timeline', () => {
    const data = createBaseData()
    const workout = createWorkout()

    const result = buildWorkoutLoggingData(data, workout)

    expect(result.exercises).toEqual([
      {
        name: 'Push-ups',
        loggingType: 'reps',
        totalSets: 2,
        restSeconds: 33,
        previousPerformance: '10 reps @ 14kg',
        suggestedReps: 12,
      },
      {
        name: 'Plank',
        loggingType: 'time',
        totalSets: 1,
        restSeconds: 5,
        previousPerformance: '30 sec',
        targetDurationSeconds: 30,
      },
    ])

    expect(result.timeline).toEqual([
      { kind: 'set', exerciseIndex: 0, setNumber: 1 },
      { kind: 'rest', exerciseIndex: 0, setNumber: 1, durationSeconds: 33 },
      { kind: 'set', exerciseIndex: 0, setNumber: 2 },
      { kind: 'transition', exerciseIndex: 0, durationSeconds: 12 },
      { kind: 'set', exerciseIndex: 1, setNumber: 1 },
    ])
    expect(result.exerciseEntryIds).toEqual(['entry-1', 'entry-2'])
  })

  test('supports per-exercise overrides for rest and previous performance', () => {
    const data = createBaseData()
    const workout = createWorkout()

    const result = buildWorkoutLoggingData(data, workout, {
      defaultRestSeconds: 15,
      transitionSeconds: 8,
      restSecondsByExerciseId: { 'ex-time': 0 },
      previousPerformanceByExerciseId: { 'ex-reps': '11 reps last session' },
    })

    expect(result.exercises[0]?.restSeconds).toBe(33)
    expect(result.exercises[1]?.restSeconds).toBe(5)
    expect(result.exercises[0]?.previousPerformance).toBe('11 reps last session')
    expect(result.timeline[3]).toEqual({ kind: 'transition', exerciseIndex: 0, durationSeconds: 12 })
  })

  test('uses option-based timing defaults when workout timing metadata is missing', () => {
    const data = createBaseData()
    const workout = createWorkout()
    const withoutTiming: Workout = {
      ...workout,
      transitionSeconds: undefined,
      exercises: workout.exercises.map((entry) => ({ ...entry, restSeconds: undefined })),
    }

    const result = buildWorkoutLoggingData(data, withoutTiming, {
      defaultRestSeconds: 14,
      transitionSeconds: 7,
      restSecondsByExerciseId: { 'ex-time': 3 },
    })

    expect(result.exercises[0]?.restSeconds).toBe(14)
    expect(result.exercises[1]?.restSeconds).toBe(3)
    expect(result.timeline[3]).toEqual({ kind: 'transition', exerciseIndex: 0, durationSeconds: 7 })
  })

  test('filters out workout entries that have no sets', () => {
    const data = createBaseData()
    const workout = createWorkout()
    workout.exercises = [{ ...workout.exercises[0]!, sets: [] }, workout.exercises[1]!]

    const result = buildWorkoutLoggingData(data, workout)

    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0]?.name).toBe('Plank')
    expect(result.timeline).toEqual([{ kind: 'set', exerciseIndex: 0, setNumber: 1 }])
    expect(result.exerciseEntryIds).toEqual(['entry-2'])
  })

  test('throws when a workout references an unknown exercise id', () => {
    const data = createBaseData()
    const workout = createWorkout()
    workout.exercises[0] = { ...workout.exercises[0]!, exerciseId: 'missing-id' }

    expect(() => buildWorkoutLoggingData(data, workout)).toThrow(
      'Missing exercise definition for workout exercise id "missing-id".',
    )
  })
})
