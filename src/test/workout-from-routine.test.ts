import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import {
  createRoutine,
  editRoutine,
  setRoutinePrefillSource,
} from '../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'
import type { RoutineExercise } from '../domain/types.ts'

function makeRoutineExercise(exerciseId: string): RoutineExercise {
  return {
    id: `re-${exerciseId}`,
    exerciseId,
    transitionBeforeOverrideSeconds: null,
    restSeconds: 35,
    setCount: 2,
  }
}

describe('createWorkoutFromRoutine', () => {
  test('returns null when routine does not exist', () => {
    const data = createDefaultData()
    const result = createWorkoutFromRoutine(data, 'nonexistent', '2026-06-14')

    expect(result).toBeNull()
  })

  test('creates a workout with exercises from the routine version', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeRoutineExercise(exerciseId)])
    const routine = withRoutine.routines.find((r) => r.name === 'Upper Body')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')

    expect(workout).not.toBeNull()
    expect(workout?.date).toBe('2026-06-14')
    expect(workout?.exercises).toHaveLength(1)
    expect(workout?.exercises[0]?.exerciseId).toBe(exerciseId)
    expect(workout?.exercises[0]?.routineExerciseId).toBe(`re-${exerciseId}`)
    expect(workout?.transitionSeconds).toBe(10)
    expect(workout?.exercises[0]?.restSeconds).toBe(35)
  })

  test('workout stores routineId', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeRoutineExercise(exerciseId)])
    const routine = withRoutine.routines.find((r) => r.name === 'Upper Body')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')

    expect(workout?.routineId).toBe(routine?.id)
  })

  test('workout stores routineVersionId', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeRoutineExercise(exerciseId)])
    const routine = withRoutine.routines.find((r) => r.name === 'Upper Body')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')

    expect(workout?.routineVersionId).toBe(routine?.activeVersionId)
  })

  test('freezes destination exercise transition overrides into the workout', () => {
    const data = createDefaultData()
    const firstExerciseId = data.exercises[0]?.id ?? ''
    const secondExerciseId = data.exercises[1]?.id ?? ''
    const first = { ...makeRoutineExercise(firstExerciseId), id: 're-first' }
    const second = {
      ...makeRoutineExercise(secondExerciseId),
      id: 're-second',
      transitionBeforeOverrideSeconds: 42,
    }
    const withRoutine = createRoutine(data, 'Timing', [first, second], 10)
    const routine = withRoutine.routines.find((candidate) => candidate.name === 'Timing')
    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-07-02')

    expect(workout?.exercises[0]?.transitionBeforeSeconds).toBe(0)
    expect(workout?.exercises[1]?.transitionBeforeSeconds).toBe(42)
    expect(workout?.transitionSeconds).toBe(10)
  })

  test('creates zero-value rep sets from the routine set count', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeRoutineExercise(exerciseId)])
    const routine = withRoutine.routines.find((r) => r.name === 'Upper Body')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')
    const entry = workout?.exercises[0]

    expect(entry?.sets).toHaveLength(2)
    expect(entry?.sets[0]?.kind).toBe('reps')

    const firstSet = entry?.sets[0]
    if (firstSet?.kind === 'reps') {
      expect(firstSet.reps).toBe(0)
      expect(firstSet.weightKg).toBeNull()
    }
  })

  test('creates zero-value duration sets from the routine set count', () => {
    const data = createDefaultData()
    const plankExercise = data.exercises.find((e) => e.kind === 'time')
    const plankId = plankExercise?.id ?? ''
    const exercises: RoutineExercise[] = [
      {
        id: 're-1',
        exerciseId: plankId,
        transitionBeforeOverrideSeconds: null,
        restSeconds: 20,
        setCount: 1,
      },
    ]
    const withRoutine = createRoutine(data, 'Core', exercises)
    const routine = withRoutine.routines.find((r) => r.name === 'Core')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')
    const entry = workout?.exercises[0]
    const firstSet = entry?.sets[0]

    expect(firstSet?.kind).toBe('time')
    if (firstSet?.kind === 'time') {
      expect(firstSet.seconds).toBe(0)
    }
  })

  test('copies rep, weight, and duration values from the selected source with fresh identities', () => {
    const data = createDefaultData()
    const repExercise = data.exercises.find((exercise) => exercise.kind === 'reps')!
    const timeExercise = data.exercises.find((exercise) => exercise.kind === 'time')!
    const routineExercises: RoutineExercise[] = [
      {
        ...makeRoutineExercise(repExercise.id),
        id: 're-reps',
      },
      {
        ...makeRoutineExercise(timeExercise.id),
        id: 're-time',
        setCount: 1,
      },
    ]
    const withRoutine = createRoutine(data, 'Prefill', routineExercises)
    const routine = withRoutine.routines.find(({ name }) => name === 'Prefill')!
    const source = {
      ...createWorkoutFromRoutine(withRoutine, routine.id, '2026-06-01')!,
      completedAt: '2026-06-01T12:00:00.000Z',
    }
    const sourceRepSet = source.exercises[0]?.sets[0]
    const sourceTimeSet = source.exercises[1]?.sets[0]
    if (sourceRepSet?.kind !== 'reps' || sourceTimeSet?.kind !== 'time') {
      throw new Error('Expected rep and time source sets')
    }
    sourceRepSet.reps = 9
    sourceRepSet.weightKg = 22.5
    sourceRepSet.notes = 'Source-only note'
    sourceTimeSet.seconds = 75
    sourceTimeSet.notes = 'Source-only note'

    const withSource = {
      ...withRoutine,
      workouts: [source],
    }
    const selected = setRoutinePrefillSource(withSource, routine.id, source.id)
    const next = createWorkoutFromRoutine(selected, routine.id, '2026-06-02')!
    const nextRepSet = next.exercises[0]?.sets[0]
    const nextTimeSet = next.exercises[1]?.sets[0]

    expect(nextRepSet).toMatchObject({
      kind: 'reps',
      reps: 9,
      weightKg: 22.5,
      notes: '',
    })
    expect(nextTimeSet).toMatchObject({
      kind: 'time',
      seconds: 75,
      notes: '',
    })
    expect(nextRepSet?.id).not.toBe(sourceRepSet.id)
    expect(nextTimeSet?.id).not.toBe(sourceTimeSet.id)
    expect(sourceRepSet).toMatchObject({ reps: 9, weightKg: 22.5, notes: 'Source-only note' })
    expect(sourceTimeSet).toMatchObject({ seconds: 75, notes: 'Source-only note' })
  })

  test('matches duplicate and reordered exercises by routine-exercise identity', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises.find((exercise) => exercise.kind === 'reps')!.id
    const first = {
      ...makeRoutineExercise(exerciseId),
      id: 're-first',
      setCount: 1,
    }
    const second = {
      ...makeRoutineExercise(exerciseId),
      id: 're-second',
      setCount: 1,
    }
    const withRoutine = createRoutine(data, 'Duplicates', [first, second])
    const routine = withRoutine.routines.find(({ name }) => name === 'Duplicates')!
    const source = {
      ...createWorkoutFromRoutine(withRoutine, routine.id, '2026-06-01')!,
      completedAt: '2026-06-01T12:00:00.000Z',
    }
    const firstSourceSet = source.exercises[0]?.sets[0]
    const secondSourceSet = source.exercises[1]?.sets[0]
    if (firstSourceSet?.kind !== 'reps' || secondSourceSet?.kind !== 'reps') {
      throw new Error('Expected rep source sets')
    }
    firstSourceSet.reps = 5
    secondSourceSet.reps = 11

    const selected = setRoutinePrefillSource({
      ...withRoutine,
      workouts: [source],
    }, routine.id, source.id)
    const reordered = editRoutine(selected, routine.id, routine.name, [second, first])
    const next = createWorkoutFromRoutine(reordered, routine.id, '2026-06-02')!

    expect(next.exercises.map(({ routineExerciseId }) => routineExerciseId)).toEqual([
      're-second',
      're-first',
    ])
    expect(next.exercises.map((entry) => {
      const set = entry.sets[0]
      return set?.kind === 'reps' ? set.reps : null
    })).toEqual([11, 5])
  })

  test('uses zero fallbacks for missing or incompatible source sets', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises.find((exercise) => exercise.kind === 'reps')!.id
    const routineExercise = {
      ...makeRoutineExercise(exerciseId),
      id: 're-fallbacks',
      setCount: 3,
    }
    const withRoutine = createRoutine(data, 'Fallbacks', [routineExercise])
    const routine = withRoutine.routines.find(({ name }) => name === 'Fallbacks')!
    const source = {
      ...createWorkoutFromRoutine(withRoutine, routine.id, '2026-06-01')!,
      completedAt: '2026-06-01T12:00:00.000Z',
    }
    const sourceEntry = source.exercises[0]!
    const copiedSet = sourceEntry.sets[0]
    if (copiedSet?.kind !== 'reps') {
      throw new Error('Expected a rep source set')
    }
    copiedSet.reps = 8
    copiedSet.weightKg = 15
    sourceEntry.sets = [
      copiedSet,
      { id: 'incompatible', kind: 'time', seconds: 45, notes: '' },
    ]

    const selected = setRoutinePrefillSource({
      ...withRoutine,
      workouts: [source],
    }, routine.id, source.id)
    const next = createWorkoutFromRoutine(selected, routine.id, '2026-06-02')!

    expect(next.exercises[0]?.sets).toMatchObject([
      { kind: 'reps', reps: 8, weightKg: 15 },
      { kind: 'reps', reps: 0, weightKg: null },
      { kind: 'reps', reps: 0, weightKg: null },
    ])
  })

  test('ignores a stale source pointer to a workout from another routine', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const withOtherRoutine = createRoutine(data, 'Other', [])
    const otherRoutine = withOtherRoutine.routines.find(({ name }) => name === 'Other')!
    const otherWorkout = createWorkoutFromRoutine(withOtherRoutine, otherRoutine.id, '2026-06-01')!
    const stale = {
      ...withOtherRoutine,
      routines: withOtherRoutine.routines.map((candidate) =>
        candidate.id === routine.id
          ? { ...candidate, prefillSourceWorkoutId: otherWorkout.id }
          : candidate,
      ),
      workouts: [otherWorkout],
    }

    const workout = createWorkoutFromRoutine(stale, routine.id, '2026-06-02')!
    const firstSet = workout.exercises[0]?.sets[0]

    expect(firstSet).toMatchObject({ kind: 'reps', reps: 0, weightKg: null })
  })

  test('ignores a stale source pointer to an unfinished workout', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const unfinished = createWorkoutFromRoutine(data, routine.id, '2026-06-01')!
    const stale = {
      ...data,
      routines: data.routines.map((candidate) =>
        candidate.id === routine.id
          ? { ...candidate, prefillSourceWorkoutId: unfinished.id }
          : candidate,
      ),
      workouts: [unfinished],
    }

    const workout = createWorkoutFromRoutine(stale, routine.id, '2026-06-02')!
    const firstSet = workout.exercises[0]?.sets[0]

    expect(firstSet).toMatchObject({ kind: 'reps', reps: 0, weightKg: null })
  })

  test('workout is independent from routine (later routine changes do not mutate workout)', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeRoutineExercise(exerciseId)])
    const routine = withRoutine.routines.find((r) => r.name === 'Upper Body')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')
    expect(workout?.exercises).toHaveLength(1)

    // Workout is a plain object snapshot — it does not hold a reference to the routine
    expect(workout).not.toHaveProperty('exercises', withRoutine.routineVersions[0]?.exercises)
  })
})
