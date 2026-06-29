import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { createRoutine } from '../domain/routine-service.ts'
import { getRoutineListSections, getRoutineSummary } from '../domain/routine-summary-service.ts'
import type { Workout } from '../domain/types.ts'

function createLinkedWorkout(routineId: string, createdAt: string): Workout {
  return {
    id: `workout-${routineId}`,
    date: createdAt.slice(0, 10),
    notes: '',
    exercises: [],
    createdAt,
    updatedAt: createdAt,
    routineId,
  }
}

describe('routine summary service', () => {
  test('features the most recently started active routine', () => {
    const base = createDefaultData()
    const fullBody = base.routines[0]!
    const withSecond = createRoutine(base, 'Upper Body', [])
    const upperBody = withSecond.routines.find((routine) => routine.name === 'Upper Body')!
    const data = {
      ...withSecond,
      routines: withSecond.routines.map((routine) => ({
        ...routine,
        updatedAt: routine.id === upperBody.id
          ? '2026-06-29T12:00:00.000Z'
          : '2026-06-20T12:00:00.000Z',
      })),
      workouts: [
        createLinkedWorkout(upperBody.id, '2026-06-25T12:00:00.000Z'),
        createLinkedWorkout(fullBody.id, '2026-06-28T12:00:00.000Z'),
      ],
    }

    const sections = getRoutineListSections(data)

    expect(sections.featured?.routine.id).toBe(fullBody.id)
    expect(sections.featured?.lastStartedAt).toBe('2026-06-28T12:00:00.000Z')
    expect(sections.others.map((summary) => summary.routine.id)).toEqual([upperBody.id])
  })

  test('falls back to the most recently updated routine when none has started', () => {
    const base = createDefaultData()
    const withSecond = createRoutine(base, 'Upper Body', [])
    const upperBody = withSecond.routines.find((routine) => routine.name === 'Upper Body')!
    const data = {
      ...withSecond,
      routines: withSecond.routines.map((routine) => ({
        ...routine,
        updatedAt: routine.id === upperBody.id
          ? '2026-06-29T12:00:00.000Z'
          : '2026-06-20T12:00:00.000Z',
      })),
    }

    expect(getRoutineListSections(data).featured?.routine.id).toBe(upperBody.id)
  })

  test('derives ordered exercise names and ranked primary muscles', () => {
    const data = createDefaultData()
    const routineId = data.routines[0]?.id ?? ''
    const summary = getRoutineSummary(data, routineId)

    expect(summary?.exerciseNames.length).toBe(summary?.version?.exercises.length)
    expect(summary?.exerciseNames[0]).toBeTruthy()
    expect(summary?.primaryMuscles.length).toBeGreaterThan(0)
  })
})
