export interface AppData {
  schemaVersion: number
  exercises: ExerciseDefinition[]
  workouts: Workout[]
}

export type ExerciseKind = 'reps-weight' | 'duration'

export interface ExerciseDefinition {
  id: string
  name: string
  kind: ExerciseKind
  defaultUnit: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface Workout {
  id: string
  date: string
  notes: string
  exercises: WorkoutExerciseEntry[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutExerciseEntry {
  id: string
  exerciseId: string
  sets: SetEntry[]
  notes: string
}

export type SetEntry = RepsWeightSetEntry | DurationSetEntry

export interface RepsWeightSetEntry {
  id: string
  kind: 'reps-weight'
  reps: number
  weightKg: number | null
  notes: string
}

export interface DurationSetEntry {
  id: string
  kind: 'duration'
  seconds: number
  notes: string
}
