export interface AppData {
  schemaVersion: number
  exercises: ExerciseDefinition[]
  workouts: Workout[]
  routines: Routine[]
  routineVersions: RoutineVersion[]
}

export type ExerciseKind = 'reps' | 'time'

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
  transitionSeconds?: number
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
  transitionSeconds?: number
  exercises: RoutineExercise[]
}

export interface RoutineExercise {
  id: string
  exerciseId: string
  plannedSets: PlannedSet[]
  restSeconds?: number
  notes?: string
}

export type PlannedSet = RepsPlannedSet | TimePlannedSet

export interface RepsPlannedSet {
  kind: 'reps'
  targetReps: number | null
  targetWeightKg: number | null
}

export interface TimePlannedSet {
  kind: 'time'
  targetSeconds: number | null
}

export interface WorkoutExerciseEntry {
  id: string
  exerciseId: string
  sets: SetEntry[]
  restSeconds?: number
  notes: string
}

export type SetEntry = RepsSetEntry | TimeSetEntry

export interface RepsSetEntry {
  id: string
  kind: 'reps'
  reps: number
  weightKg: number | null
  notes: string
}

export interface TimeSetEntry {
  id: string
  kind: 'time'
  seconds: number
  notes: string
}
