import type { AppData, ExerciseDefinition, ExerciseKind, PlannedSet, Routine, RoutineExercise, RoutineVersion } from './types.ts'
import { generateId as generateUniqueId } from '../utils/id.ts'

interface SeedExercise {
  name: string
  kind: ExerciseKind
  defaultUnit: string | null
}

const seedExercises: SeedExercise[] = [
  { name: 'Push-ups', kind: 'reps-weight', defaultUnit: 'kg' },
  { name: 'Overhead Press', kind: 'reps-weight', defaultUnit: 'kg' },
  { name: 'Dumbbell Row', kind: 'reps-weight', defaultUnit: 'kg' },
  { name: 'Bulgarian Split Squat', kind: 'reps-weight', defaultUnit: 'kg' },
  { name: 'Bicep Curl', kind: 'reps-weight', defaultUnit: 'kg' },
  { name: 'Romanian Deadlift', kind: 'reps-weight', defaultUnit: 'kg' },
  { name: 'Plank', kind: 'duration', defaultUnit: 'seconds' },
]

export function generateId(): string {
  return generateUniqueId()
}

function createSeedExercise(seed: SeedExercise): ExerciseDefinition {
  const timestamp = new Date().toISOString()

  return {
    id: generateId(),
    name: seed.name,
    kind: seed.kind,
    defaultUnit: seed.defaultUnit,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createDefaultData(): AppData {
  const timestamp = new Date().toISOString()
  const exercises = seedExercises.map(createSeedExercise)

  const routineId = generateId()
  const versionId = generateId()

  const routineExercises: RoutineExercise[] = exercises.map((exercise) => {
    const isPlank = exercise.name === 'Plank'
    const plannedSets: PlannedSet[] = isPlank
      ? [{ kind: 'duration', targetSeconds: 30 }]
      : [
          { kind: 'reps-weight', targetReps: 10, targetWeightKg: null },
          { kind: 'reps-weight', targetReps: 10, targetWeightKg: null },
        ]

    return {
      id: generateId(),
      exerciseId: exercise.id,
      plannedSets,
    }
  })

  const routineVersion: RoutineVersion = {
    id: versionId,
    routineId,
    previousVersionId: null,
    createdAt: timestamp,
    exercises: routineExercises,
  }

  const routine: Routine = {
    id: routineId,
    name: 'Full Body',
    activeVersionId: versionId,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    schemaVersion: 2,
    exercises,
    workouts: [],
    routines: [routine],
    routineVersions: [routineVersion],
  }
}
