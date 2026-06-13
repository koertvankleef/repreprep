import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { getExerciseHistory, getPersonalRecord } from '../domain/history-service.ts'
import {
  addExerciseToWorkout,
  addSetToExerciseEntry,
  addWorkout,
  createDurationSet,
  createExerciseEntry,
  createNewWorkout,
  createRepsWeightSet,
} from '../domain/workout-service.ts'

describe('history-service', () => {
  test('getExerciseHistory returns empty array when no workouts', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''

    expect(getExerciseHistory(data, exerciseId)).toEqual([])
  })

  test('getExerciseHistory returns entries from matching workouts', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const entry = addSetToExerciseEntry(createExerciseEntry(exerciseId), createRepsWeightSet(8, 40))
    const workout = addExerciseToWorkout(createNewWorkout('2026-06-13'), entry)
    const updated = addWorkout(data, workout)
    const history = getExerciseHistory(updated, exerciseId)

    expect(history).toHaveLength(1)
    expect(history[0]?.workoutId).toBe(workout.id)
  })

  test('getPersonalRecord returns null for empty history', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''

    expect(getPersonalRecord(data, exerciseId)).toBeNull()
  })

  test('getPersonalRecord returns max weight for reps-weight exercise', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[1]?.id ?? ''
    const firstWorkout = addExerciseToWorkout(
      createNewWorkout('2026-06-13'),
      addSetToExerciseEntry(createExerciseEntry(exerciseId), createRepsWeightSet(5, 50)),
    )
    const secondWorkout = addExerciseToWorkout(
      createNewWorkout('2026-06-20'),
      addSetToExerciseEntry(createExerciseEntry(exerciseId), createRepsWeightSet(3, 60)),
    )
    const updated = addWorkout(addWorkout(data, firstWorkout), secondWorkout)

    expect(getPersonalRecord(updated, exerciseId)).toEqual({
      kind: 'reps-weight',
      reps: 3,
      weightKg: 60,
      date: '2026-06-20',
    })
  })

  test('getPersonalRecord returns max seconds for duration exercise', () => {
    const data = createDefaultData()
    const plank = data.exercises.find((exercise) => exercise.kind === 'duration')
    const firstWorkout = addExerciseToWorkout(
      createNewWorkout('2026-06-13'),
      addSetToExerciseEntry(createExerciseEntry(plank?.id ?? ''), createDurationSet(60)),
    )
    const secondWorkout = addExerciseToWorkout(
      createNewWorkout('2026-06-20'),
      addSetToExerciseEntry(createExerciseEntry(plank?.id ?? ''), createDurationSet(75)),
    )
    const updated = addWorkout(addWorkout(data, firstWorkout), secondWorkout)

    expect(getPersonalRecord(updated, plank?.id ?? '')).toEqual({
      kind: 'duration',
      seconds: 75,
      date: '2026-06-20',
    })
  })
})
