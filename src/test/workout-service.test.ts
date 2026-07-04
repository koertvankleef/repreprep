import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import {
  addExerciseToWorkout,
  addSetToExerciseEntry,
  addWorkout,
  createTimeSet,
  createExerciseEntry,
  createNewWorkout,
  createWorkoutFromRoutine,
  completeWorkout,
  deleteWorkout,
  removeExerciseFromWorkout,
  removeSetFromExerciseEntry,
  updateWorkout,
} from '../domain/workout-service.ts'
import { setRoutinePrefillSource } from '../domain/routine-service.ts'

describe('workout-service', () => {
  test('addWorkout adds workout to data', () => {
    const workout = createNewWorkout('2026-06-13')
    const updated = addWorkout(createDefaultData(), workout)

    expect(updated.workouts).toHaveLength(1)
    expect(updated.workouts[0]).toEqual(workout)
  })

  test('updateWorkout replaces existing workout', () => {
    const workout = createNewWorkout('2026-06-13')
    const data = addWorkout(createDefaultData(), workout)
    const nextWorkout = { ...workout, notes: 'Updated' }
    const updated = updateWorkout(data, nextWorkout)

    expect(updated.workouts[0]?.notes).toBe('Updated')
  })

  test('updateWorkout returns unchanged data when workout not found', () => {
    const data = createDefaultData()
    const updated = updateWorkout(data, createNewWorkout('2026-06-13'))

    expect(updated).toBe(data)
  })

  test('deleteWorkout removes workout by id', () => {
    const workout = createNewWorkout('2026-06-13')
    const data = addWorkout(createDefaultData(), workout)
    const updated = deleteWorkout(data, workout.id)

    expect(updated.workouts).toHaveLength(0)
  })

  test('deleteWorkout returns unchanged data if not found', () => {
    const data = createDefaultData()
    const updated = deleteWorkout(data, 'missing')

    expect(updated).toBe(data)
  })

  test('deleteWorkout clears routines that selected it as their prefill source', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const workout = {
      ...createWorkoutFromRoutine(data, routine.id, '2026-06-13')!,
      completedAt: '2026-06-13T12:00:00.000Z',
    }
    const withWorkout = addWorkout(data, workout)
    const selected = setRoutinePrefillSource(withWorkout, routine.id, workout.id)

    const updated = deleteWorkout(selected, workout.id)

    expect(updated.workouts).toHaveLength(0)
    expect(updated.routines[0]?.prefillSourceWorkoutId).toBeNull()
  })

  test('createNewWorkout creates workout with given date', () => {
    const workout = createNewWorkout('2026-06-13', 'Leg day')

    expect(workout.date).toBe('2026-06-13')
    expect(workout.notes).toBe('Leg day')
    expect(workout.exercises).toEqual([])
    expect(workout.completedAt).toBeNull()
  })

  test('completes a workout and selects it as its routine prefill source', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const workout = createWorkoutFromRoutine(data, routine.id, '2026-06-13')!
    const withWorkout = addWorkout(data, workout)

    const completed = completeWorkout(withWorkout, workout.id, true)

    expect(completed.workouts[0]?.completedAt).toEqual(expect.any(String))
    expect(completed.routines[0]?.prefillSourceWorkoutId).toBe(workout.id)
  })

  test('completes a workout without replacing the existing prefill source', () => {
    const data = createDefaultData()
    const routine = data.routines[0]!
    const previous = {
      ...createWorkoutFromRoutine(data, routine.id, '2026-06-12')!,
      completedAt: '2026-06-12T12:00:00.000Z',
    }
    const current = createWorkoutFromRoutine(data, routine.id, '2026-06-13')!
    const withWorkouts = {
      ...data,
      workouts: [previous, current],
      routines: data.routines.map((candidate) =>
        candidate.id === routine.id
          ? { ...candidate, prefillSourceWorkoutId: previous.id }
          : candidate,
      ),
    }

    const completed = completeWorkout(withWorkouts, current.id, false)

    expect(completed.workouts[1]?.completedAt).toEqual(expect.any(String))
    expect(completed.routines[0]?.prefillSourceWorkoutId).toBe(previous.id)
  })

  test('completeWorkout returns unchanged data when workout not found', () => {
    const data = createDefaultData()

    expect(completeWorkout(data, 'missing', true)).toBe(data)
  })

  test('addExerciseToWorkout adds entry', () => {
    const workout = createNewWorkout('2026-06-13')
    const entry = createExerciseEntry('exercise-1')
    const updated = addExerciseToWorkout(workout, entry)

    expect(updated.exercises).toHaveLength(1)
    expect(updated.exercises[0]).toEqual(entry)
  })

  test('removeExerciseFromWorkout removes entry by id', () => {
    const workout = addExerciseToWorkout(createNewWorkout('2026-06-13'), createExerciseEntry('exercise-1'))
    const entryId = workout.exercises[0]?.id ?? ''
    const updated = removeExerciseFromWorkout(workout, entryId)

    expect(updated.exercises).toHaveLength(0)
  })

  test('addSetToExerciseEntry adds set', () => {
    const entry = createExerciseEntry('exercise-1')
    const set = createTimeSet(60)
    const updated = addSetToExerciseEntry(entry, set)

    expect(updated.sets).toEqual([set])
  })

  test('removeSetFromExerciseEntry removes set', () => {
    const set = createTimeSet(60)
    const entry = addSetToExerciseEntry(createExerciseEntry('exercise-1'), set)
    const updated = removeSetFromExerciseEntry(entry, set.id)

    expect(updated.sets).toHaveLength(0)
  })
})
