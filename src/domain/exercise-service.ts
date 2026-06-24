import type { AppData, Equipment, ExerciseCategory, ExerciseDefinition, ExerciseKind, MeasurementProfile } from './types.ts'
import { exerciseCatalog } from '../exercise-library/exercises.ts'
import { getExerciseDefaultUnit, toExerciseDefinition } from './exercise-metadata.ts'
import { generateId } from '../utils/id.ts'

export type ExerciseFilters = {
  categories: ExerciseCategory[]
  equipment: Equipment[]
}

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

  const existingExercise = data.exercises[index]

  if (!existingExercise?.createdByUser) {
    return data
  }

  const exercises = [...data.exercises]
  exercises[index] = {
    ...exercise,
    createdByUser: true,
  }

  return {
    ...data,
    exercises,
  }
}

export function archiveExercise(data: AppData, id: string): AppData {
  const exercise = getExercise(data, id)

  if (!exercise || !exercise.createdByUser) {
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
  return data.exercises
    .filter((exercise) => !exercise.archived)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function mergeExerciseCatalog(data: AppData): AppData {
  const existingIds = new Set(data.exercises.map((exercise) => exercise.id))
  const timestamp = new Date().toISOString()
  const missingExercises = exerciseCatalog
    .filter((exercise) => !existingIds.has(exercise.id))
    .map((exercise) => toExerciseDefinition(exercise, timestamp))

  if (missingExercises.length === 0) {
    return data
  }

  return {
    ...data,
    exercises: [...data.exercises, ...missingExercises],
  }
}

export function isExerciseUsedInWorkouts(data: AppData, id: string): boolean {
  return data.workouts.some((workout) => workout.exercises.some((entry) => entry.exerciseId === id))
}

export function searchExercises(exercises: ExerciseDefinition[], query: string): ExerciseDefinition[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) {
    return exercises
  }

  return exercises.filter((exercise) => {
    const searchableText = [
      exercise.name,
      ...exercise.aliases,
      ...exercise.categories,
      ...exercise.equipment,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
      ...exercise.measurementProfiles.flat(),
    ]
      .join(' ')
      .toLowerCase()

    return tokens.every((token) => searchableText.includes(token))
  })
}

export function filterExercises(exercises: ExerciseDefinition[], filters: ExerciseFilters): ExerciseDefinition[] {
  const selectedCategories = new Set(filters.categories)
  const selectedEquipment = new Set(filters.equipment)

  return exercises.filter((exercise) => {
    const matchesCategory = selectedCategories.size === 0
      || exercise.categories.some((category) => selectedCategories.has(category))
    const matchesEquipment = selectedEquipment.size === 0
      || exercise.equipment.some((equipment) => selectedEquipment.has(equipment))

    return matchesCategory && matchesEquipment
  })
}

export function createNewExercise(name: string, kind: ExerciseKind): ExerciseDefinition {
  const timestamp = new Date().toISOString()
  const measurementProfiles: MeasurementProfile[] = kind === 'time' ? [['time']] : [['reps', 'weight']]
  const exercise = {
    measurementProfiles,
  }

  return {
    id: generateId(),
    name,
    aliases: [],
    description: '',
    categories: ['strength'],
    equipment: ['other'],
    primaryMuscles: [],
    secondaryMuscles: [],
    measurementProfiles,
    createdByUser: true,
    kind,
    defaultUnit: getExerciseDefaultUnit(exercise),
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
