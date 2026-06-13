import type {
  AppData,
  DurationSetEntry,
  RepsWeightSetEntry,
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

export function createRepsWeightSet(reps: number, weightKg: number | null): RepsWeightSetEntry {
  return {
    id: generateId(),
    kind: 'reps-weight',
    reps,
    weightKg,
    notes: '',
  }
}

export function createDurationSet(seconds: number): DurationSetEntry {
  return {
    id: generateId(),
    kind: 'duration',
    seconds,
    notes: '',
  }
}
