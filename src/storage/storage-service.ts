import { createDefaultData } from '../domain/create-default-data.ts'
import {
  addExercise,
  archiveExercise as archiveExerciseRecord,
  getExercise,
  mergeExerciseCatalog,
  updateExercise,
} from '../domain/exercise-service.ts'
import {
  addWorkout,
  completeWorkout as completeWorkoutRecord,
  deleteWorkout as removeWorkout,
  getWorkout,
  updateWorkout,
} from '../domain/workout-service.ts'
import {
  archiveRoutine as archiveRoutineRecord,
  createRoutine as createRoutineRecord,
  editRoutine as editRoutineRecord,
  getRoutine,
  renameRoutine as renameRoutineRecord,
  setRoutinePrefillSource as setRoutinePrefillSourceRecord,
} from '../domain/routine-service.ts'
import { DomainError } from '../domain/errors.ts'
import type { AppData, ExerciseDefinition, Routine, RoutineExercise, Workout } from '../domain/types.ts'

export interface StorageAdapter {
  load(): AppData | null
  save(data: AppData): void
  clear(): void
}

export class WorkoutStorageService {
  private adapter: StorageAdapter
  private current: AppData

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
    this.current = mergeExerciseCatalog(adapter.load() ?? createDefaultData())
    this.adapter.save(this.current)
  }

  getData(): AppData {
    return this.current
  }

  setData(data: AppData): void {
    this.current = mergeExerciseCatalog(data)
    this.adapter.save(this.current)
  }

  resetAllData(): void {
    this.adapter.clear()
    this.current = createDefaultData()
    this.adapter.save(this.current)
  }

  saveWorkout(workout: Workout): void {
    this.current = getWorkout(this.current, workout.id)
      ? updateWorkout(this.current, workout)
      : addWorkout(this.current, workout)

    this.adapter.save(this.current)
  }

  deleteWorkout(id: string): void {
    this.current = removeWorkout(this.current, id)
    this.adapter.save(this.current)
  }

  completeWorkout(id: string, useAsPrefill: boolean): void {
    this.current = completeWorkoutRecord(this.current, id, useAsPrefill)
    this.adapter.save(this.current)
  }

  saveExercise(exercise: ExerciseDefinition): void {
    this.current = getExercise(this.current, exercise.id)
      ? updateExercise(this.current, exercise)
      : addExercise(this.current, exercise)

    this.adapter.save(this.current)
  }

  archiveExercise(id: string): void {
    this.current = archiveExerciseRecord(this.current, id)
    this.adapter.save(this.current)
  }

  saveRoutine(routineId: string | null, name: string, exercises: RoutineExercise[], transitionSeconds: number): Routine {
    if (routineId && getRoutine(this.current, routineId)) {
      this.current = editRoutineRecord(this.current, routineId, name, exercises, transitionSeconds)
      this.adapter.save(this.current)
      const updated = getRoutine(this.current, routineId)

      if (!updated) {
        throw new DomainError('ROUTINE_UPDATE_FAILED', 'Failed to update routine')
      }

      return updated
    }

    this.current = createRoutineRecord(this.current, name, exercises, transitionSeconds)
    this.adapter.save(this.current)

    const created = this.current.routines.at(-1)

    if (!created) {
      throw new DomainError('ROUTINE_CREATE_FAILED', 'Failed to create routine')
    }

    return created
  }

  renameRoutine(id: string, name: string): void {
    this.current = renameRoutineRecord(this.current, id, name)
    this.adapter.save(this.current)
  }

  setRoutinePrefillSource(routineId: string, workoutId: string | null): void {
    this.current = setRoutinePrefillSourceRecord(this.current, routineId, workoutId)
    this.adapter.save(this.current)
  }

  archiveRoutine(id: string): void {
    this.current = archiveRoutineRecord(this.current, id)
    this.adapter.save(this.current)
  }
}
