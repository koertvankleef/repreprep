import type {
  AppData,
  TimeSetEntry,
  ExerciseDefinition,
  PlannedSet,
  RepsSetEntry,
  Routine,
  RoutineExercise,
  RoutineVersion,
  SetEntry,
  Workout,
  WorkoutExerciseEntry,
} from '../domain/types.ts'

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
    (obj.kind === 'reps' || obj.kind === 'time') &&
    (typeof obj.defaultUnit === 'string' || obj.defaultUnit === null) &&
    typeof obj.archived === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  )
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
    typeof data.schemaVersion === 'number' &&
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

  if (!parsed.exercises.every((exercise) => isValidExercise(exercise))) {
    throw new Error('Imported data contains an invalid exercise record')
  }

  if (!parsed.workouts.every((workout) => isValidWorkout(workout))) {
    throw new Error('Imported data contains an invalid workout record')
  }

  // Migrate v1 exports by injecting empty routine collections
  const candidate: Record<string, unknown> =
    parsed.schemaVersion === 1
      ? {
          ...parsed,
          schemaVersion: 2,
          routines: Array.isArray(parsed.routines) ? parsed.routines : [],
          routineVersions: Array.isArray(parsed.routineVersions) ? parsed.routineVersions : [],
        }
      : parsed

  if (!isValidAppData(candidate)) {
    throw new Error('Imported data is not in the expected AppData format')
  }

  return candidate
}
