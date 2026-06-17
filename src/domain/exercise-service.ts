import type { AppData, ExerciseDefinition, ExerciseKind } from './types.ts'
import { generateId } from '../utils/id.ts'

export function addExercise(data: AppData, exercise: ExerciseDefinition): AppData {
  return {
    ...data,
    exercises: [...data.exercises, exercise],
  }
}

export function updateExercise(data: AppData, exercise: ExerciseDefinition): AppData {
  const index = data.exercises.findIndex((existingExercise) => existingExercise.id === exercise.id)

  if (index === -1) {
    return data
  }

  const exercises = [...data.exercises]
  exercises[index] = exercise

  return {
    ...data,
    exercises,
  }
}

export function archiveExercise(data: AppData, id: string): AppData {
  const exercise = getExercise(data, id)

  if (!exercise) {
    return data
  }

  return updateExercise(data, {
    ...exercise,
    archived: true,
    updatedAt: new Date().toISOString(),
  })
}

export function getExercise(data: AppData, id: string): ExerciseDefinition | undefined {
  return data.exercises.find((exercise) => exercise.id === id)
}

export function getActiveExercises(data: AppData): ExerciseDefinition[] {
  return data.exercises.filter((exercise) => !exercise.archived)
}

export function isExerciseUsedInWorkouts(data: AppData, id: string): boolean {
  return data.workouts.some((workout) => workout.exercises.some((entry) => entry.exerciseId === id))
}

export function createNewExercise(name: string, kind: ExerciseKind): ExerciseDefinition {
  const timestamp = new Date().toISOString()

  return {
    id: generateId(),
    name,
    kind,
    defaultUnit: kind === 'time' ? 'seconds' : 'kg',
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
