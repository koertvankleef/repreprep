import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { exerciseCatalog } from '../exercise-library/exercises.ts'

describe('createDefaultData', () => {
  test('creates seeded app data', () => {
    const data = createDefaultData()
    const byName = new Map(data.exercises.map((exercise) => [exercise.name, exercise.kind]))

    expect(data.schemaVersion).toBe(7)
    expect(data.exercises).toHaveLength(exerciseCatalog.length)
    expect(byName.get('Pushups')).toBe('reps')
    expect(byName.get('Plank')).toBe('time')
    expect(data.exercises.every((exercise) => exercise.measurementProfiles.length > 0)).toBe(true)
    expect(data.exercises.every((exercise) => exercise.createdByUser === false)).toBe(true)
    expect(data.workouts).toEqual([])
  })

  test('creates a default Full Body routine', () => {
    const data = createDefaultData()

    expect(data.routines).toHaveLength(1)
    expect(data.routines[0]?.name).toBe('Full Body')
    expect(data.routineVersions).toHaveLength(1)
  })

  test('default routine version has 7 starter exercises', () => {
    const data = createDefaultData()
    const version = data.routineVersions[0]

    expect(version?.exercises).toHaveLength(7)
    expect(version?.transitionSeconds).toBe(10)
    expect(version?.exercises.every((exercise) => exercise.restSeconds === 20)).toBe(true)
    expect(version?.exercises.every((exercise) => exercise.setCount > 0)).toBe(true)
    expect(data.routines[0]?.prefillSourceWorkoutId).toBeNull()
  })

  test('default routine version exercises reference valid exercise ids', () => {
    const data = createDefaultData()
    const version = data.routineVersions[0]
    const exerciseIds = new Set(data.exercises.map((e) => e.id))

    version?.exercises.forEach((re) => {
      expect(exerciseIds.has(re.exerciseId)).toBe(true)
    })
  })
})
