import { createDefaultData } from '../domain/create-default-data.ts'
import { addExercise, archiveExercise as archiveExerciseRecord, getExercise, updateExercise } from '../domain/exercise-service.ts'
import { addWorkout, deleteWorkout as removeWorkout, getWorkout, updateWorkout } from '../domain/workout-service.ts'
import type { AppData, ExerciseDefinition, Workout } from '../domain/types.ts'

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
}
