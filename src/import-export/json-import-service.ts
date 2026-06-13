import type {
  AppData,
  DurationSetEntry,
  ExerciseDefinition,
  RepsWeightSetEntry,
  SetEntry,
  Workout,
  WorkoutExerciseEntry,
} from '../domain/types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidRepsWeightSet(obj: unknown): obj is RepsWeightSetEntry {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    obj.kind === 'reps-weight' &&
    typeof obj.reps === 'number' &&
    (typeof obj.weightKg === 'number' || obj.weightKg === null) &&
    typeof obj.notes === 'string'
  )
}

function isValidDurationSet(obj: unknown): obj is DurationSetEntry {
  if (!isRecord(obj)) {
    return false
  }

  return (
    typeof obj.id === 'string' &&
    obj.kind === 'duration' &&
    typeof obj.seconds === 'number' &&
    typeof obj.notes === 'string'
  )
}

function isValidSetEntry(obj: unknown): obj is SetEntry {
  return isValidRepsWeightSet(obj) || isValidDurationSet(obj)
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
    (obj.kind === 'reps-weight' || obj.kind === 'duration') &&
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
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
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
    data.workouts.every((workout) => isValidWorkout(workout))
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

  if (!isValidAppData(parsed)) {
    throw new Error('Imported data is not in the expected AppData format')
  }

  return parsed
}
