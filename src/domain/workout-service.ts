import type {
  AppData,
  TimeSetEntry,
  RepsSetEntry,
  SetEntry,
  Workout,
  WorkoutExerciseEntry,
} from './types.ts'
import { generateId } from '../utils/id.ts'

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

  const defaultTransitionSeconds = Math.max(0, version.transitionSeconds)
  const exercises: WorkoutExerciseEntry[] = version.exercises.map((re, index) => {
    const exercise = data.exercises.find((candidate) => candidate.id === re.exerciseId)
    const sets = Array.from(
      { length: Math.max(0, Math.floor(re.setCount)) },
      () => exercise?.kind === 'time'
        ? createTimeSet(0)
        : createRepsSet(0, null),
    )

    return {
      id: generateId(),
      exerciseId: re.exerciseId,
      routineExerciseId: re.id,
      sets,
      transitionBeforeSeconds: index === 0
        ? 0
        : Math.max(0, re.transitionBeforeOverrideSeconds ?? defaultTransitionSeconds),
      restSeconds: Math.max(0, re.restSeconds),
      notes: re.notes ?? '',
    }
  })

  return {
    id: generateId(),
    date,
    notes: '',
    exercises,
    transitionSeconds: defaultTransitionSeconds,
    createdAt: timestamp,
    updatedAt: timestamp,
    routineId,
    routineVersionId: version.id,
  }
}
