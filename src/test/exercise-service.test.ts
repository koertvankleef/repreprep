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
    expect(exercise.createdByUser).toBe(true)
  })

  test('updateExercise ignores predefined exercises', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]

    expect(exercise).toBeDefined()

    const updated = updateExercise(data, {
      ...exercise!,
      name: 'Push-ups Plus',
    })

    expect(updated.exercises[0]?.name).toBe(exercise?.name)
  })

  test('updateExercise replaces user-created exercises', () => {
    const data = createDefaultData()
    const exercise = createNewExercise('Farmer Carry', 'time')
    const withExercise = addExercise(data, exercise)
    const updated = updateExercise(withExercise, {
      ...exercise,
      name: 'Loaded Carry',
    })

    expect(updated.exercises.find((item) => item.id === exercise.id)?.name).toBe('Loaded Carry')
  })

  test('archiveExercise ignores predefined exercises', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]
    const updated = archiveExercise(data, exercise?.id ?? '')

    expect(updated.exercises[0]?.archived).toBe(false)
  })

  test('archiveExercise sets user-created exercises archived true', () => {
    const data = createDefaultData()
    const exercise = createNewExercise('Farmer Carry', 'time')
    const withExercise = addExercise(data, exercise)
    const updated = archiveExercise(withExercise, exercise.id)

    expect(updated.exercises.find((item) => item.id === exercise.id)?.archived).toBe(true)
  })

  test('getActiveExercises returns only non-archived exercises', () => {
    const data = createDefaultData()
    const exercise = createNewExercise('Farmer Carry', 'time')
    const withExercise = addExercise(data, exercise)
    const archived = archiveExercise(withExercise, exercise.id)

    expect(getActiveExercises(archived).some((item) => item.id === exercise.id)).toBe(false)
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
