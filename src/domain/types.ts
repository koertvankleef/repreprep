export interface AppData {
  schemaVersion: number
  exercises: ExerciseDefinition[]
  workouts: Workout[]
  routines: Routine[]
  routineVersions: RoutineVersion[]
}

export type ExerciseKind = 'reps' | 'time'

export type MeasurementType =
  | 'reps'
  | 'weight'
  | 'time'
  | 'distance'
  | 'calories'
  | 'rounds'

export type MeasurementProfile = MeasurementType[]

export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'stretch'
  | 'balance'

export type Equipment =
  | 'bodyweight'
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'bench'
  | 'machine'
  | 'cable'
  | 'resistance-band'
  | 'pull-up-bar'
  | 'dip-bars'
  | 'medicine-ball'
  | 'stability-ball'
  | 'foam-roller'
  | 'jump-rope'
  | 'treadmill'
  | 'exercise-bike'
  | 'rowing-machine'
  | 'elliptical'
  | 'stair-machine'
  | 'other'

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves'
  | 'hips'
  | 'full-body'

export interface Exercise {
  id: string
  name: string
  aliases: string[]
  description: string
  categories: ExerciseCategory[]
  equipment: Equipment[]
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  measurementProfiles: MeasurementProfile[]
}

export interface ExerciseDefinition extends Exercise {
  createdByUser: boolean
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
