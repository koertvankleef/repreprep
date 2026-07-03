import type {
  AppData,
  ExerciseDefinition,
  MeasurementProfile,
  RepsSetEntry,
  Routine,
  RoutineExercise,
  RoutineVersion,
  SetEntry,
  TimeSetEntry,
  Workout,
  WorkoutExerciseEntry,
} from '../domain/types.ts'
import {
  equipmentValues,
  exerciseCategories,
  measurementProfileKey,
  measurementTypes,
  muscleValues,
} from '../domain/exercise-metadata.ts'

export const APP_DATA_SCHEMA_VERSION = 6

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isKnownStringArray<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): value is T[] {
  const allowed = new Set<string>(allowedValues)

  return isStringArray(value) && value.every((item) => allowed.has(item))
}

function isValidMeasurementProfiles(value: unknown): value is MeasurementProfile[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false
  }

  const profileKeys = new Set<string>()
  const allowed = new Set<string>(measurementTypes)

  return value.every((profile) => {
    if (!Array.isArray(profile) || profile.length === 0) {
      return false
    }

    const types = profile.filter(
      (item): item is typeof measurementTypes[number] =>
        typeof item === 'string' && allowed.has(item),
    )

    if (types.length !== profile.length || new Set(types).size !== types.length) {
      return false
    }

    const key = measurementProfileKey(types)
    if (profileKeys.has(key)) {
      return false
    }

    profileKeys.add(key)
    return true
  })
}

export function isValidExercise(obj: unknown): obj is ExerciseDefinition {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string'
    && typeof obj.name === 'string'
    && isStringArray(obj.aliases)
    && typeof obj.description === 'string'
    && isKnownStringArray(obj.categories, exerciseCategories)
    && isKnownStringArray(obj.equipment, equipmentValues)
    && isKnownStringArray(obj.primaryMuscles, muscleValues)
    && isKnownStringArray(obj.secondaryMuscles, muscleValues)
    && isValidMeasurementProfiles(obj.measurementProfiles)
    && typeof obj.createdByUser === 'boolean'
    && (obj.kind === 'reps' || obj.kind === 'time')
    && (typeof obj.defaultUnit === 'string' || obj.defaultUnit === null)
    && typeof obj.archived === 'boolean'
    && typeof obj.createdAt === 'string'
    && typeof obj.updatedAt === 'string'
  )
}

function isValidRepsSet(obj: unknown): obj is RepsSetEntry {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && obj.kind === 'reps'
    && typeof obj.reps === 'number'
    && (typeof obj.weightKg === 'number' || obj.weightKg === null)
    && typeof obj.notes === 'string'
}

function isValidTimeSet(obj: unknown): obj is TimeSetEntry {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && obj.kind === 'time'
    && typeof obj.seconds === 'number'
    && typeof obj.notes === 'string'
}

function isValidSetEntry(obj: unknown): obj is SetEntry {
  return isValidRepsSet(obj) || isValidTimeSet(obj)
}

function isValidWorkoutExerciseEntry(obj: unknown): obj is WorkoutExerciseEntry {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && typeof obj.exerciseId === 'string'
    && (obj.routineExerciseId === undefined || typeof obj.routineExerciseId === 'string')
    && Array.isArray(obj.sets)
    && obj.sets.every((set) => isValidSetEntry(set))
    && (obj.transitionBeforeSeconds === undefined || typeof obj.transitionBeforeSeconds === 'number')
    && (obj.restSeconds === undefined || typeof obj.restSeconds === 'number')
    && typeof obj.notes === 'string'
}

export function isValidWorkout(obj: unknown): obj is Workout {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && typeof obj.date === 'string'
    && typeof obj.notes === 'string'
    && Array.isArray(obj.exercises)
    && obj.exercises.every((entry) => isValidWorkoutExerciseEntry(entry))
    && (obj.transitionSeconds === undefined || typeof obj.transitionSeconds === 'number')
    && typeof obj.createdAt === 'string'
    && typeof obj.updatedAt === 'string'
    && (obj.routineId === undefined || typeof obj.routineId === 'string')
    && (obj.routineVersionId === undefined || typeof obj.routineVersionId === 'string')
}

function isValidRoutineExercise(obj: unknown): obj is RoutineExercise {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && typeof obj.exerciseId === 'string'
    && Number.isInteger(obj.setCount)
    && (obj.setCount as number) >= 1
    && (
      typeof obj.transitionBeforeOverrideSeconds === 'number'
      || obj.transitionBeforeOverrideSeconds === null
    )
    && typeof obj.restSeconds === 'number'
    && (obj.notes === undefined || typeof obj.notes === 'string')
}

function isValidRoutineVersion(obj: unknown): obj is RoutineVersion {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && typeof obj.routineId === 'string'
    && (typeof obj.previousVersionId === 'string' || obj.previousVersionId === null)
    && typeof obj.createdAt === 'string'
    && typeof obj.transitionSeconds === 'number'
    && Array.isArray(obj.exercises)
    && obj.exercises.every((exercise) => isValidRoutineExercise(exercise))
}

function isValidRoutine(obj: unknown): obj is Routine {
  return isRecord(obj)
    && typeof obj.id === 'string'
    && typeof obj.name === 'string'
    && typeof obj.activeVersionId === 'string'
    && (
      typeof obj.prefillSourceWorkoutId === 'string'
      || obj.prefillSourceWorkoutId === null
    )
    && typeof obj.archived === 'boolean'
    && typeof obj.createdAt === 'string'
    && typeof obj.updatedAt === 'string'
    && (obj.description === undefined || typeof obj.description === 'string')
}

export function isValidAppData(data: unknown): data is AppData {
  return isRecord(data)
    && data.schemaVersion === APP_DATA_SCHEMA_VERSION
    && Array.isArray(data.exercises)
    && data.exercises.every((exercise) => isValidExercise(exercise))
    && Array.isArray(data.workouts)
    && data.workouts.every((workout) => isValidWorkout(workout))
    && Array.isArray(data.routines)
    && data.routines.every((routine) => isValidRoutine(routine))
    && Array.isArray(data.routineVersions)
    && data.routineVersions.every((version) => isValidRoutineVersion(version))
}

export async function importFromJson(file: File): Promise<AppData> {
  const text = await file.text()
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The selected file does not contain valid JSON')
  }

  if (!isRecord(parsed) || typeof parsed.schemaVersion !== 'number') {
    throw new Error('Imported data must include a numeric schemaVersion')
  }

  if (!Array.isArray(parsed.exercises)) {
    throw new Error('Imported data must include an exercises array')
  }

  if (!Array.isArray(parsed.workouts)) {
    throw new Error('Imported data must include a workouts array')
  }

  if (!isValidAppData(parsed)) {
    throw new Error('Imported data is not in the expected AppData format')
  }

  return parsed
}
