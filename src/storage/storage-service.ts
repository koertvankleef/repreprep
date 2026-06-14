import { createDefaultData } from '../domain/create-default-data.ts'
import { addExercise, archiveExercise as archiveExerciseRecord, getExercise, updateExercise } from '../domain/exercise-service.ts'
import { addWorkout, deleteWorkout as removeWorkout, getWorkout, updateWorkout } from '../domain/workout-service.ts'
import { archiveRoutine as archiveRoutineRecord, editRoutine as editRoutineRecord, getRoutine, createRoutine as createRoutineRecord } from '../domain/routine-service.ts'
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
    this.current = adapter.load() ?? createDefaultData()
    this.adapter.save(this.current)
  }

  getData(): AppData {
    return this.current
  }

  setData(data: AppData): void {
    this.current = data
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

  saveRoutine(routineId: string | null, name: string, exercises: RoutineExercise[]): Routine {
    if (routineId && getRoutine(this.current, routineId)) {
      this.current = editRoutineRecord(this.current, routineId, name, exercises)
      this.adapter.save(this.current)
      const updated = getRoutine(this.current, routineId)

      if (!updated) {
        throw new DomainError('ROUTINE_UPDATE_FAILED', 'Failed to update routine')
      }

      return updated
    }

    this.current = createRoutineRecord(this.current, name, exercises)
    this.adapter.save(this.current)

    const created = this.current.routines.at(-1)

    if (!created) {
      throw new DomainError('ROUTINE_CREATE_FAILED', 'Failed to create routine')
    }

    return created
  }

  archiveRoutine(id: string): void {
    this.current = archiveRoutineRecord(this.current, id)
    this.adapter.save(this.current)
  }
}
