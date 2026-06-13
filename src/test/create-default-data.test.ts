import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'

describe('createDefaultData', () => {
  test('creates seeded app data', () => {
    const data = createDefaultData()
    const byName = new Map(data.exercises.map((exercise) => [exercise.name, exercise.kind]))

    expect(data.schemaVersion).toBe(1)
    expect(data.exercises).toHaveLength(7)
    expect(byName.get('Push-ups')).toBe('reps-weight')
    expect(byName.get('Plank')).toBe('duration')
    expect(data.exercises.filter((exercise) => exercise.name !== 'Plank').every((exercise) => exercise.kind === 'reps-weight')).toBe(true)
    expect(data.workouts).toEqual([])
  })
})
