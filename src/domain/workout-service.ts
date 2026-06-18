import type {
  AppData,
  TimeSetEntry,
  PlannedSet,
  RepsSetEntry,
  SetEntry,
  Workout,
  WorkoutExerciseEntry,
} from './types.ts'
import { generateId } from '../utils/id.ts'

const DEFAULT_REST_SECONDS = 20
const DEFAULT_TRANSITION_SECONDS = 10

export function addWorkout(data: AppData, workout: Workout): AppData {
  return {
    ...data,
    workouts: [...data.workouts, workout],
  }
}

export function updateWorkout(data: AppData, workout: Workout): AppData {
  const index = data.workouts.findIndex((existingWorkout) => existingWorkout.id === workout.id)

  if (index === -1) {
    return data
  }

  const workouts = [...data.workouts]
  workouts[index] = workout

  return {
    ...data,
    workouts,
  }
}

export function deleteWorkout(data: AppData, id: string): AppData {
  const workouts = data.workouts.filter((workout) => workout.id !== id)

  if (workouts.length === data.workouts.length) {
    return data
  }

  return {
    ...data,
    workouts,
  }
}

export function getWorkout(data: AppData, id: string): Workout | undefined {
  return data.workouts.find((workout) => workout.id === id)
}

export function createNewWorkout(date: string, notes = ''): Workout {
  const timestamp = new Date().toISOString()

  return {
    id: generateId(),
    date,
    notes,
    exercises: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function addExerciseToWorkout(workout: Workout, entry: WorkoutExerciseEntry): Workout {
  return {
    ...workout,
    exercises: [...workout.exercises, entry],
    updatedAt: new Date().toISOString(),
  }
}

export function removeExerciseFromWorkout(workout: Workout, entryId: string): Workout {
  return {
    ...workout,
    exercises: workout.exercises.filter((entry) => entry.id !== entryId),
    updatedAt: new Date().toISOString(),
  }
}

export function addSetToExerciseEntry(entry: WorkoutExerciseEntry, set: SetEntry): WorkoutExerciseEntry {
  return {
    ...entry,
    sets: [...entry.sets, set],
  }
}

export function removeSetFromExerciseEntry(entry: WorkoutExerciseEntry, setId: string): WorkoutExerciseEntry {
  return {
    ...entry,
    sets: entry.sets.filter((set) => set.id !== setId),
  }
}

export function createExerciseEntry(exerciseId: string): WorkoutExerciseEntry {
  return {
    id: generateId(),
    exerciseId,
    sets: [],
    notes: '',
  }
}

export function createRepsSet(reps: number, weightKg: number | null): RepsSetEntry {
  return {
    id: generateId(),
    kind: 'reps',
    reps,
    weightKg,
    notes: '',
  }
}

export function createTimeSet(seconds: number): TimeSetEntry {
  return {
    id: generateId(),
    kind: 'time',
    seconds,
    notes: '',
  }
}

function createSetFromPlannedSet(plannedSet: PlannedSet): SetEntry {
  if (plannedSet.kind === 'reps') {
    return createRepsSet(plannedSet.targetReps ?? 0, plannedSet.targetWeightKg)
  }

  return createTimeSet(plannedSet.targetSeconds ?? 0)
}

export function createWorkoutFromRoutine(data: AppData, routineId: string, date: string): Workout | null {
  const routine = data.routines.find((r) => r.id === routineId)

  if (!routine) {
    return null
  }

  const version = data.routineVersions.find((v) => v.id === routine.activeVersionId)

  if (!version) {
    return null
  }

  const timestamp = new Date().toISOString()

  const exercises: WorkoutExerciseEntry[] = version.exercises.map((re) => ({
    id: generateId(),
    exerciseId: re.exerciseId,
    sets: re.plannedSets.map((ps) => createSetFromPlannedSet(ps)),
    restSeconds: Math.max(0, re.restSeconds ?? DEFAULT_REST_SECONDS),
    notes: re.notes ?? '',
  }))

  return {
    id: generateId(),
    date,
    notes: '',
    exercises,
    transitionSeconds: Math.max(0, version.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS),
    createdAt: timestamp,
    updatedAt: timestamp,
    routineId,
    routineVersionId: version.id,
  }
}
