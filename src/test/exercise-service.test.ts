import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import {
  addExercise,
  archiveExercise,
  createNewExercise,
  getActiveExercises,
  isExerciseUsedInWorkouts,
  mergeExerciseCatalog,
  searchExercises,
  updateExercise,
} from '../domain/exercise-service.ts'
import { addExerciseToWorkout, addWorkout, createExerciseEntry, createNewWorkout } from '../domain/workout-service.ts'

describe('exercise-service', () => {
  test('addExercise adds to exercises array', () => {
    const data = createDefaultData()
    const exercise = createNewExercise('Farmer Carry', 'time')
    const updated = addExercise(data, exercise)

    expect(updated.exercises).toContainEqual(exercise)
  })

  test('updateExercise replaces existing exercise', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]

    expect(exercise).toBeDefined()

    const updated = updateExercise(data, {
      ...exercise!,
      name: 'Push-ups Plus',
    })

    expect(updated.exercises[0]?.name).toBe('Push-ups Plus')
  })

  test('archiveExercise sets archived true', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]
    const updated = archiveExercise(data, exercise?.id ?? '')

    expect(updated.exercises[0]?.archived).toBe(true)
  })

  test('getActiveExercises returns only non-archived exercises', () => {
    const data = createDefaultData()
    const firstExercise = data.exercises[0]
    const archived = archiveExercise(data, firstExercise?.id ?? '')

    expect(getActiveExercises(archived).some((exercise) => exercise.id === firstExercise?.id)).toBe(false)
  })

  test('searchExercises matches metadata facets', () => {
    const data = createDefaultData()
    const matches = searchExercises(getActiveExercises(data), 'dumbbell biceps weight')

    expect(matches.some((exercise) => exercise.id === 'dumbbell-bicep-curl')).toBe(true)
  })

  test('mergeExerciseCatalog appends missing catalog records', () => {
    const custom = createNewExercise('Custom Carry', 'time')
    const data = {
      ...createDefaultData(),
      exercises: [custom],
    }
    const merged = mergeExerciseCatalog(data)

    expect(merged.exercises.some((exercise) => exercise.id === custom.id)).toBe(true)
    expect(merged.exercises.some((exercise) => exercise.id === 'pushups')).toBe(true)
  })

  test('isExerciseUsedInWorkouts returns true when exercise referenced in a workout', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]
    const workout = addExerciseToWorkout(createNewWorkout('2026-06-13'), createExerciseEntry(exercise?.id ?? ''))
    const updated = addWorkout(data, workout)

    expect(isExerciseUsedInWorkouts(updated, exercise?.id ?? '')).toBe(true)
  })

  test('isExerciseUsedInWorkouts returns false when not used', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]

    expect(isExerciseUsedInWorkouts(data, exercise?.id ?? '')).toBe(false)
  })
})
