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

  const timestamp = new Date().toISOString()

  return {
    ...data,
    workouts,
    routines: data.routines.map((routine) =>
      routine.prefillSourceWorkoutId === id
        ? { ...routine, prefillSourceWorkoutId: null, updatedAt: timestamp }
        : routine,
    ),
  }
}

export function getWorkout(data: AppData, id: string): Workout | undefined {
  return data.workouts.find((workout) => workout.id === id)
}

export function completeWorkout(
  data: AppData,
  id: string,
  useAsPrefill: boolean,
): AppData {
  const workout = getWorkout(data, id)

  if (!workout) {
    return data
  }

  const timestamp = new Date().toISOString()
  const completedWorkout = {
    ...workout,
    completedAt: workout.completedAt ?? timestamp,
    updatedAt: timestamp,
  }

  return {
    ...data,
    workouts: data.workouts.map((candidate) =>
      candidate.id === id ? completedWorkout : candidate,
    ),
    routines: useAsPrefill && workout.routineId
      ? data.routines.map((routine) =>
          routine.id === workout.routineId
            ? { ...routine, prefillSourceWorkoutId: id, updatedAt: timestamp }
            : routine,
        )
      : data.routines,
  }
}

export function createNewWorkout(date: string, notes = ''): Workout {
  const timestamp = new Date().toISOString()

  return {
    id: generateId(),
    date,
    notes,
    exercises: [],
    completedAt: null,
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
  const prefillSource = resolvePrefillSource(data, routine.id, routine.prefillSourceWorkoutId)
  const exercises: WorkoutExerciseEntry[] = version.exercises.map((re, index) => {
    const exercise = data.exercises.find((candidate) => candidate.id === re.exerciseId)
    const sourceExercise = prefillSource?.exercises.find(
      (candidate) => candidate.routineExerciseId === re.id,
    )
    const sets = Array.from(
      { length: Math.max(0, Math.floor(re.setCount)) },
      (_, setIndex) => createPrefilledSet(exercise?.kind, sourceExercise?.sets[setIndex]),
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
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    routineId,
    routineVersionId: version.id,
  }
}

function resolvePrefillSource(
  data: AppData,
  routineId: string,
  sourceWorkoutId: string | null,
): Workout | undefined {
  if (!sourceWorkoutId) {
    return undefined
  }

  const source = data.workouts.find((workout) => workout.id === sourceWorkoutId)
  return source?.routineId === routineId && source.completedAt !== null ? source : undefined
}

function createPrefilledSet(
  exerciseKind: 'reps' | 'time' | undefined,
  sourceSet: SetEntry | undefined,
): SetEntry {
  if (exerciseKind === 'time') {
    return sourceSet?.kind === 'time'
      ? createTimeSet(Math.max(0, sourceSet.seconds))
      : createTimeSet(0)
  }

  return sourceSet?.kind === 'reps'
    ? createRepsSet(Math.max(0, sourceSet.reps), sourceSet.weightKg)
    : createRepsSet(0, null)
}
