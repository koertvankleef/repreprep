import type {
  AppData,
  TimeSetEntry,
  ExerciseDefinition,
  ExerciseKind,
  MeasurementProfile,
  PlannedSet,
  RepsSetEntry,
  Routine,
  RoutineExercise,
  RoutineVersion,
  SetEntry,
  Workout,
  WorkoutExerciseEntry,
} from '../domain/types.ts'
import {
  equipmentValues,
  exerciseCategories,
  getExerciseDefaultUnit,
  measurementProfileKey,
  measurementTypes,
  muscleValues,
} from '../domain/exercise-metadata.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidRepsSet(obj: unknown): obj is RepsSetEntry {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    obj.kind === 'reps' &&
    typeof obj.reps === 'number' &&
    (typeof obj.weightKg === 'number' || obj.weightKg === null) &&
    typeof obj.notes === 'string'
  )
}

function isValidTimeSet(obj: unknown): obj is TimeSetEntry {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    obj.kind === 'time' &&
    typeof obj.seconds === 'number' &&
    typeof obj.notes === 'string'
  )
}

function isValidSetEntry(obj: unknown): obj is SetEntry {
  return isValidRepsSet(obj) || isValidTimeSet(obj)
}

function isValidWorkoutExerciseEntry(obj: unknown): obj is WorkoutExerciseEntry {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.exerciseId === 'string' &&
    Array.isArray(obj.sets) &&
    obj.sets.every((set) => isValidSetEntry(set)) &&
    (obj.restSeconds === undefined || typeof obj.restSeconds === 'number') &&
    typeof obj.notes === 'string'
  )
}

export function isValidExercise(obj: unknown): obj is ExerciseDefinition {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    isStringArray(obj.aliases) &&
    typeof obj.description === 'string' &&
    isKnownStringArray(obj.categories, exerciseCategories) &&
    isKnownStringArray(obj.equipment, equipmentValues) &&
    isKnownStringArray(obj.primaryMuscles, muscleValues) &&
    isKnownStringArray(obj.secondaryMuscles, muscleValues) &&
    isValidMeasurementProfiles(obj.measurementProfiles) &&
    (obj.kind === 'reps' || obj.kind === 'time') &&
    (typeof obj.defaultUnit === 'string' || obj.defaultUnit === null) &&
    typeof obj.archived === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isKnownStringArray<T extends string>(value: unknown, allowedValues: readonly T[]): value is T[] {
  const allowed = new Set<string>(allowedValues)

  return isStringArray(value) && value.every((item) => allowed.has(item))
}

function isValidMeasurementProfiles(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    return false
  }

  const profileKeys = new Set<string>()
  const allowed = new Set<string>(measurementTypes)

  return value.every((profile) => {
    if (!Array.isArray(profile) || profile.length === 0) {
      return false
    }

    const types = profile.filter((item): item is typeof measurementTypes[number] => typeof item === 'string' && allowed.has(item))

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

function isLegacyExercise(obj: unknown): obj is {
  id: string
  name: string
  kind: ExerciseKind
  defaultUnit: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
} {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    (obj.kind === 'reps' || obj.kind === 'time') &&
    (typeof obj.defaultUnit === 'string' || obj.defaultUnit === null) &&
    typeof obj.archived === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  )
}

function migrateExerciseRecord(exercise: unknown): unknown {
  if (isValidExercise(exercise)) {
    return exercise
  }

  if (!isLegacyExercise(exercise)) {
    return exercise
  }

  const measurementProfiles: MeasurementProfile[] = exercise.kind === 'time' ? [['time']] : [['reps', 'weight']]

  return {
    id: exercise.id,
    name: exercise.name,
    aliases: [],
    description: '',
    categories: ['strength'],
    equipment: ['other'],
    primaryMuscles: [],
    secondaryMuscles: [],
    measurementProfiles,
    kind: exercise.kind,
    defaultUnit: exercise.defaultUnit ?? getExerciseDefaultUnit({ measurementProfiles }),
    archived: exercise.archived,
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt,
  }
}

export function migrateRawAppData(parsed: Record<string, unknown>): Record<string, unknown> {
  let candidate: Record<string, unknown> = parsed

  if (parsed.schemaVersion === 1) {
    candidate = {
      ...parsed,
      schemaVersion: 2,
      routines: Array.isArray(parsed.routines) ? parsed.routines : [],
      routineVersions: Array.isArray(parsed.routineVersions) ? parsed.routineVersions : [],
    }
  }

  if (candidate.schemaVersion === 2) {
    candidate = {
      ...candidate,
      schemaVersion: 3,
      exercises: Array.isArray(candidate.exercises)
        ? candidate.exercises.map((exercise) => migrateExerciseRecord(exercise))
        : candidate.exercises,
    }
  }

  return candidate
}

export function isValidWorkout(obj: unknown): obj is Workout {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.notes === 'string' &&
    Array.isArray(obj.exercises) &&
    obj.exercises.every((entry) => isValidWorkoutExerciseEntry(entry)) &&
    (obj.transitionSeconds === undefined || typeof obj.transitionSeconds === 'number') &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string' &&
    (obj.routineId === undefined || typeof obj.routineId === 'string') &&
    (obj.routineVersionId === undefined || typeof obj.routineVersionId === 'string')
  )
}

function isValidPlannedSet(obj: unknown): obj is PlannedSet {
  if (!isRecord(obj)) {
    return false
  }

  if (obj.kind === 'reps') {
    return (
      (typeof obj.targetReps === 'number' || obj.targetReps === null) &&
      (typeof obj.targetWeightKg === 'number' || obj.targetWeightKg === null)
    )
  }

  if (obj.kind === 'time') {
    return typeof obj.targetSeconds === 'number' || obj.targetSeconds === null
  }

  return false
}

function isValidRoutineExercise(obj: unknown): obj is RoutineExercise {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.exerciseId === 'string' &&
    Array.isArray(obj.plannedSets) &&
    obj.plannedSets.every((ps) => isValidPlannedSet(ps)) &&
    (obj.restSeconds === undefined || typeof obj.restSeconds === 'number') &&
    (obj.notes === undefined || typeof obj.notes === 'string')
  )
}

function isValidRoutineVersion(obj: unknown): obj is RoutineVersion {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.routineId === 'string' &&
    (typeof obj.previousVersionId === 'string' || obj.previousVersionId === null) &&
    typeof obj.createdAt === 'string' &&
    (obj.transitionSeconds === undefined || typeof obj.transitionSeconds === 'number') &&
    Array.isArray(obj.exercises) &&
    obj.exercises.every((re) => isValidRoutineExercise(re))
  )
}

function isValidRoutine(obj: unknown): obj is Routine {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.activeVersionId === 'string' &&
    typeof obj.archived === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string' &&
    (obj.description === undefined || typeof obj.description === 'string')
  )
}

export function isValidAppData(data: unknown): data is AppData {
  if (!isRecord(data)) {
    return false
  }

  return (
    data.schemaVersion === 3 &&
    Array.isArray(data.exercises) &&
    data.exercises.every((exercise) => isValidExercise(exercise)) &&
    Array.isArray(data.workouts) &&
    data.workouts.every((workout) => isValidWorkout(workout)) &&
    Array.isArray(data.routines) &&
    data.routines.every((routine) => isValidRoutine(routine)) &&
    Array.isArray(data.routineVersions) &&
    data.routineVersions.every((version) => isValidRoutineVersion(version))
  )
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

  if (!parsed.workouts.every((workout) => isValidWorkout(workout))) {
    throw new Error('Imported data contains an invalid workout record')
  }

  const candidate = migrateRawAppData(parsed)

  if (!isValidAppData(candidate)) {
    throw new Error('Imported data is not in the expected AppData format')
  }

  return candidate
}
