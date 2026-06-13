import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'

describe('createDefaultData', () => {
  test('creates seeded app data', () => {
    const data = createDefaultData()
    const byName = new Map(data.exercises.map((exercise) => [exercise.name, exercise.kind]))

    expect(data.schemaVersion).toBe(2)
    expect(data.exercises).toHaveLength(7)
    expect(byName.get('Push-ups')).toBe('reps-weight')
    expect(byName.get('Plank')).toBe('duration')
    expect(data.exercises.filter((exercise) => exercise.name !== 'Plank').every((exercise) => exercise.kind === 'reps-weight')).toBe(true)
    expect(data.workouts).toEqual([])
  })

  test('creates a default Full Body routine', () => {
    const data = createDefaultData()

    expect(data.routines).toHaveLength(1)
    expect(data.routines[0]?.name).toBe('Full Body')
    expect(data.routineVersions).toHaveLength(1)
  })

  test('default routine version has all 7 exercises', () => {
    const data = createDefaultData()
    const version = data.routineVersions[0]

    expect(version?.exercises).toHaveLength(7)
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
