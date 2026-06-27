import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import {
  addExercise,
  archiveExercise,
  createNewExercise,
  filterExercises,
  getActiveExercises,
  isExerciseUsedInRoutines,
  mergeExerciseCatalog,
  searchExercises,
  updateExercise,
} from '../domain/exercise-service.ts'

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

  test('filterExercises matches category and equipment facets', () => {
    const data = createDefaultData()
    const matches = filterExercises(getActiveExercises(data), {
      categories: ['strength'],
      equipment: ['dumbbell'],
    })

    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((exercise) => exercise.categories.includes('strength'))).toBe(true)
    expect(matches.every((exercise) => exercise.equipment.includes('dumbbell'))).toBe(true)
  })

  test('filterExercises treats selected values within the same facet as OR', () => {
    const data = createDefaultData()
    const matches = filterExercises(getActiveExercises(data), {
      categories: ['strength', 'cardio'],
      equipment: [],
    })

    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((exercise) => exercise.categories.includes('strength') || exercise.categories.includes('cardio'))).toBe(true)
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

  test('isExerciseUsedInRoutines returns true when exercise referenced in an active routine', () => {
    const data = createDefaultData()
    const exercise = data.exercises.find((item) => item.id === 'pushups')

    expect(isExerciseUsedInRoutines(data, exercise?.id ?? '')).toBe(true)
  })

  test('isExerciseUsedInRoutines returns false when not used in an active routine', () => {
    const data = createDefaultData()
    const exercise = data.exercises[0]

    expect(isExerciseUsedInRoutines(data, exercise?.id ?? '')).toBe(false)
  })
})
