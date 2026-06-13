import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { createRoutine } from '../domain/routine-service.ts'
import { createWorkoutFromRoutine } from '../domain/workout-service.ts'
import type { RoutineExercise } from '../domain/types.ts'

function makeRoutineExercise(exerciseId: string): RoutineExercise {
  return {
    id: `re-${exerciseId}`,
    exerciseId,
    plannedSets: [
      { kind: 'reps-weight', targetReps: 8, targetWeightKg: 40 },
      { kind: 'reps-weight', targetReps: 10, targetWeightKg: null },
    ],
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

  test('prefills sets from planned sets', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeRoutineExercise(exerciseId)])
    const routine = withRoutine.routines.find((r) => r.name === 'Upper Body')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')
    const entry = workout?.exercises[0]

    expect(entry?.sets).toHaveLength(2)
    expect(entry?.sets[0]?.kind).toBe('reps-weight')

    const firstSet = entry?.sets[0]
    if (firstSet?.kind === 'reps-weight') {
      expect(firstSet.reps).toBe(8)
      expect(firstSet.weightKg).toBe(40)
    }
  })

  test('prefills duration sets from planned duration sets', () => {
    const data = createDefaultData()
    const plankExercise = data.exercises.find((e) => e.kind === 'duration')
    const plankId = plankExercise?.id ?? ''
    const exercises: RoutineExercise[] = [
      { id: 're-1', exerciseId: plankId, plannedSets: [{ kind: 'duration', targetSeconds: 45 }] },
    ]
    const withRoutine = createRoutine(data, 'Core', exercises)
    const routine = withRoutine.routines.find((r) => r.name === 'Core')

    const workout = createWorkoutFromRoutine(withRoutine, routine?.id ?? '', '2026-06-14')
    const entry = workout?.exercises[0]
    const firstSet = entry?.sets[0]

    expect(firstSet?.kind).toBe('duration')
    if (firstSet?.kind === 'duration') {
      expect(firstSet.seconds).toBe(45)
    }
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
