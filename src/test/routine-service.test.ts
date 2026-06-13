import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import {
  archiveRoutine,
  createRoutine,
  createRoutineExercise,
  editRoutine,
  getActiveRoutineVersion,
  getActiveRoutines,
  getRoutine,
  getRoutineVersion,
} from '../domain/routine-service.ts'
import type { RoutineExercise } from '../domain/types.ts'

function makeExercise(exerciseId: string): RoutineExercise {
  return {
    id: 're-1',
    exerciseId,
    plannedSets: [{ kind: 'reps-weight', targetReps: 10, targetWeightKg: null }],
  }
}

describe('routine-service', () => {
  test('createRoutine adds routine and version to data', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const exercises = [makeExercise(exerciseId)]
    const updated = createRoutine(data, 'Upper Body', exercises)

    const activeRoutines = getActiveRoutines(updated).filter((r) => r.name === 'Upper Body')
    expect(activeRoutines).toHaveLength(1)

    const routine = activeRoutines[0]
    expect(routine).toBeDefined()
    expect(routine?.name).toBe('Upper Body')
    expect(routine?.archived).toBe(false)
  })

  test('createRoutine creates a version with exercises', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const exercises = [makeExercise(exerciseId)]
    const updated = createRoutine(data, 'Upper Body', exercises)

    const routine = getActiveRoutines(updated).find((r) => r.name === 'Upper Body')
    expect(routine).toBeDefined()

    const version = getActiveRoutineVersion(updated, routine?.id ?? '')
    expect(version).toBeDefined()
    expect(version?.exercises).toHaveLength(1)
    expect(version?.exercises[0]?.exerciseId).toBe(exerciseId)
    expect(version?.previousVersionId).toBeNull()
  })

  test('editRoutine creates a new version and updates the routine', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const exercises1 = [makeExercise(exerciseId)]
    const withRoutine = createRoutine(data, 'Upper Body', exercises1)

    const routine = getActiveRoutines(withRoutine).find((r) => r.name === 'Upper Body')
    const originalVersionId = routine?.activeVersionId ?? ''

    const exerciseId2 = data.exercises[1]?.id ?? ''
    const exercises2 = [makeExercise(exerciseId), makeExercise(exerciseId2)]
    const edited = editRoutine(withRoutine, routine?.id ?? '', 'Upper Body V2', exercises2)

    const updatedRoutine = getRoutine(edited, routine?.id ?? '')
    expect(updatedRoutine?.name).toBe('Upper Body V2')
    expect(updatedRoutine?.activeVersionId).not.toBe(originalVersionId)

    const newVersion = getActiveRoutineVersion(edited, routine?.id ?? '')
    expect(newVersion?.exercises).toHaveLength(2)
    expect(newVersion?.previousVersionId).toBe(originalVersionId)
  })

  test('old routine versions remain unchanged after edit', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const withRoutine = createRoutine(data, 'Upper Body', [makeExercise(exerciseId)])

    const routine = getActiveRoutines(withRoutine).find((r) => r.name === 'Upper Body')
    const originalVersionId = routine?.activeVersionId ?? ''

    const exerciseId2 = data.exercises[1]?.id ?? ''
    const edited = editRoutine(withRoutine, routine?.id ?? '', 'Upper Body', [makeExercise(exerciseId), makeExercise(exerciseId2)])

    const oldVersion = getRoutineVersion(edited, originalVersionId)
    expect(oldVersion).toBeDefined()
    expect(oldVersion?.exercises).toHaveLength(1)
  })

  test('editRoutine returns unchanged data when routine not found', () => {
    const data = createDefaultData()
    const result = editRoutine(data, 'nonexistent', 'Name', [])

    expect(result).toBe(data)
  })

  test('archiveRoutine marks routine as archived', () => {
    const data = createDefaultData()
    const withRoutine = createRoutine(data, 'Upper Body', [])
    const routine = getActiveRoutines(withRoutine).find((r) => r.name === 'Upper Body')
    const archived = archiveRoutine(withRoutine, routine?.id ?? '')

    expect(getActiveRoutines(archived).find((r) => r.name === 'Upper Body')).toBeUndefined()
    expect(getRoutine(archived, routine?.id ?? '')?.archived).toBe(true)
  })

  test('archiveRoutine returns unchanged data when routine not found', () => {
    const data = createDefaultData()
    const result = archiveRoutine(data, 'nonexistent')

    expect(result).toBe(data)
  })

  test('createRoutineExercise creates exercise with empty planned sets', () => {
    const exercise = createRoutineExercise('exercise-123')

    expect(exercise.exerciseId).toBe('exercise-123')
    expect(exercise.plannedSets).toEqual([])
    expect(typeof exercise.id).toBe('string')
  })

  test('default data includes a Full Body routine', () => {
    const data = createDefaultData()

    expect(data.routines).toHaveLength(1)
    expect(data.routines[0]?.name).toBe('Full Body')
    expect(data.routineVersions).toHaveLength(1)

    const version = getActiveRoutineVersion(data, data.routines[0]?.id ?? '')
    expect(version?.exercises).toHaveLength(7)
  })
})
