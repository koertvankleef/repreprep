import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import {
  archiveRoutine,
  buildRoutineFlow,
  createRoutine,
  createRoutineExercise,
  editRoutine,
  getActiveRoutineVersion,
  getActiveRoutines,
  getRoutine,
  getRoutineVersion,
  renameRoutine,
} from '../domain/routine-service.ts'
import type { RoutineExercise } from '../domain/types.ts'

function makeExercise(exerciseId: string): RoutineExercise {
  return {
    id: 're-1',
    exerciseId,
    transitionBeforeOverrideSeconds: null,
    restSeconds: 25,
    setCount: 3,
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
    expect(routine?.prefillSourceWorkoutId).toBeNull()
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
    expect(version?.transitionSeconds).toBe(10)
    expect(version?.exercises[0]?.restSeconds).toBe(25)
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
    expect(newVersion?.transitionSeconds).toBe(10)
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

  test('renameRoutine changes only the routine metadata', () => {
    const data = createDefaultData()
    const routine = data.routines[0]

    expect(routine).toBeDefined()
    if (!routine) {
      return
    }

    const renamed = renameRoutine(data, routine.id, 'Renamed routine')
    const updatedRoutine = getRoutine(renamed, routine.id)

    expect(updatedRoutine?.name).toBe('Renamed routine')
    expect(updatedRoutine?.activeVersionId).toBe(routine.activeVersionId)
    expect(renamed.routineVersions).toEqual(data.routineVersions)
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

  test('createRoutineExercise creates an exercise with one set', () => {
    const exercise = createRoutineExercise('exercise-123')

    expect(exercise.exerciseId).toBe('exercise-123')
    expect(exercise.transitionBeforeOverrideSeconds).toBeNull()
    expect(exercise.restSeconds).toBe(20)
    expect(exercise.setCount).toBe(1)
    expect(typeof exercise.id).toBe('string')
  })

  test('routine versions normalize transition overrides around the first exercise', () => {
    const data = createDefaultData()
    const firstExerciseId = data.exercises[0]?.id ?? ''
    const secondExerciseId = data.exercises[1]?.id ?? ''
    const first = {
      ...makeExercise(firstExerciseId),
      id: 're-first',
      transitionBeforeOverrideSeconds: 45,
    }
    const second = {
      ...makeExercise(secondExerciseId),
      id: 're-second',
      transitionBeforeOverrideSeconds: -10,
    }
    const updated = createRoutine(data, 'Timing', [first, second])
    const routine = updated.routines.find((candidate) => candidate.name === 'Timing')
    const version = routine ? getActiveRoutineVersion(updated, routine.id) : undefined

    expect(version?.exercises[0]?.transitionBeforeOverrideSeconds).toBeNull()
    expect(version?.exercises[1]?.transitionBeforeOverrideSeconds).toBe(0)
  })

  test('routine versions normalize set count to at least one', () => {
    const data = createDefaultData()
    const exerciseId = data.exercises[0]?.id ?? ''
    const updated = createRoutine(data, 'Minimum sets', [{
      ...makeExercise(exerciseId),
      setCount: 0,
    }])
    const routine = updated.routines.find(({ name }) => name === 'Minimum sets')
    const version = routine ? getActiveRoutineVersion(updated, routine.id) : undefined

    expect(version?.exercises[0]?.setCount).toBe(1)
  })

  test('buildRoutineFlow derives inherited and overridden transition gutters', () => {
    const data = createDefaultData()
    const exerciseIds = data.exercises.slice(0, 3).map((exercise) => exercise.id)
    const exercises = exerciseIds.map((exerciseId, index) => ({
      ...makeExercise(exerciseId),
      id: `re-${index + 1}`,
      transitionBeforeOverrideSeconds: index === 2 ? 35 : null,
    }))
    const updated = createRoutine(data, 'Flow', exercises, 12)
    const routine = updated.routines.find((candidate) => candidate.name === 'Flow')
    const version = routine ? getActiveRoutineVersion(updated, routine.id) : undefined

    expect(version ? buildRoutineFlow(version) : []).toEqual([
      { kind: 'exercise', exercise: version?.exercises[0] },
      {
        kind: 'transition',
        seconds: 12,
        beforeExerciseId: 're-2',
        inherited: true,
      },
      { kind: 'exercise', exercise: version?.exercises[1] },
      {
        kind: 'transition',
        seconds: 35,
        beforeExerciseId: 're-3',
        inherited: false,
      },
      { kind: 'exercise', exercise: version?.exercises[2] },
    ])
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
