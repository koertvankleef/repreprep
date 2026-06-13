export interface AppData {
  schemaVersion: number
  exercises: ExerciseDefinition[]
  workouts: Workout[]
  routines: Routine[]
  routineVersions: RoutineVersion[]
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
  routineId?: string
  routineVersionId?: string
}

export interface Routine {
  id: string
  name: string
  description?: string
  activeVersionId: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface RoutineVersion {
  id: string
  routineId: string
  previousVersionId: string | null
  createdAt: string
  exercises: RoutineExercise[]
}

export interface RoutineExercise {
  id: string
  exerciseId: string
  plannedSets: PlannedSet[]
  notes?: string
}

export type PlannedSet = RepsWeightPlannedSet | DurationPlannedSet

export interface RepsWeightPlannedSet {
  kind: 'reps-weight'
  targetReps: number | null
  targetWeightKg: number | null
}

export interface DurationPlannedSet {
  kind: 'duration'
  targetSeconds: number | null
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
