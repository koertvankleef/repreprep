import type { AppData, ExerciseDefinition, ExerciseKind } from './types.ts'
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
  return {
    schemaVersion: 1,
    exercises: seedExercises.map(createSeedExercise),
    workouts: [],
  }
}
