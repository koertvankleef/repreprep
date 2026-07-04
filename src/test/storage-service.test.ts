import { describe, expect, test } from 'vitest'
import { createDefaultData } from '../domain/create-default-data.ts'
import { createNewWorkout } from '../domain/workout-service.ts'
import type { AppData } from '../domain/types.ts'
import { WorkoutStorageService, type StorageAdapter } from '../storage/storage-service.ts'

class MockAdapter implements StorageAdapter {
  saved: AppData | null = null
  initial: AppData | null

  constructor(initial: AppData | null) {
    this.initial = initial
  }

  load(): AppData | null {
    return this.initial
  }

  save(data: AppData): void {
    this.saved = data
  }

  clear(): void {
    this.saved = null
  }
}

describe('WorkoutStorageService', () => {
  test('getData returns loaded data', () => {
    const initial = createDefaultData()
    const service = new WorkoutStorageService(new MockAdapter(initial))

    expect(service.getData()).toEqual(initial)
  })

  test('setData calls adapter.save', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const next = createDefaultData()

    service.setData(next)

    expect(adapter.saved).toEqual(next)
  })

  test('saveWorkout adds or updates workout', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const workout = createNewWorkout('2026-06-13')

    service.saveWorkout(workout)
    expect(service.getData().workouts).toHaveLength(1)

    service.saveWorkout({ ...workout, notes: 'Updated' })
    expect(service.getData().workouts[0]?.notes).toBe('Updated')
  })

  test('deleteWorkout removes workout', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const workout = createNewWorkout('2026-06-13')

    service.saveWorkout(workout)
    service.deleteWorkout(workout.id)

    expect(service.getData().workouts).toHaveLength(0)
  })

  test('completeWorkout persists completion and the prefill choice', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const routine = service.getData().routines[0]!
    const workout = {
      ...createNewWorkout('2026-06-13'),
      routineId: routine.id,
    }
    service.saveWorkout(workout)

    service.completeWorkout(workout.id, true)

    expect(service.getData().workouts[0]?.completedAt).toEqual(expect.any(String))
    expect(service.getData().routines[0]?.prefillSourceWorkoutId).toBe(workout.id)
    expect(adapter.saved?.workouts[0]?.completedAt).toEqual(expect.any(String))
  })

  test('getData returns updated data after saveWorkout', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const workout = createNewWorkout('2026-06-13')

    service.saveWorkout(workout)

    expect(service.getData().workouts[0]).toEqual(workout)
  })

  test('renameRoutine saves the new name without creating a routine version', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const routine = service.getData().routines[0]

    expect(routine).toBeDefined()
    if (!routine) {
      return
    }

    const versionCount = service.getData().routineVersions.length
    service.renameRoutine(routine.id, 'Renamed routine')

    expect(service.getData().routines[0]?.name).toBe('Renamed routine')
    expect(service.getData().routines[0]?.activeVersionId).toBe(routine.activeVersionId)
    expect(service.getData().routineVersions).toHaveLength(versionCount)
    expect(adapter.saved?.routines[0]?.name).toBe('Renamed routine')
  })

  test('sets and clears a routine prefill source', () => {
    const adapter = new MockAdapter(createDefaultData())
    const service = new WorkoutStorageService(adapter)
    const routine = service.getData().routines[0]!
    const workout = {
      ...createNewWorkout('2026-06-13'),
      routineId: routine.id,
      completedAt: '2026-06-13T12:00:00.000Z',
    }
    service.saveWorkout(workout)

    service.setRoutinePrefillSource(routine.id, workout.id)
    expect(service.getData().routines[0]?.prefillSourceWorkoutId).toBe(workout.id)

    service.setRoutinePrefillSource(routine.id, null)
    expect(service.getData().routines[0]?.prefillSourceWorkoutId).toBeNull()
    expect(adapter.saved?.routines[0]?.prefillSourceWorkoutId).toBeNull()
  })
})
