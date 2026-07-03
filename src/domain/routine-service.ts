import type {
  AppData,
  Routine,
  RoutineExercise,
  RoutineVersion,
} from './types.ts'
import { generateId } from '../utils/id.ts'

const DEFAULT_REST_SECONDS = 20
const DEFAULT_TRANSITION_SECONDS = 10

export type RoutineFlowItem =
  | { kind: 'exercise'; exercise: RoutineExercise }
  | {
      kind: 'transition'
      seconds: number
      beforeExerciseId: string
      inherited: boolean
    }

function normalizeRoutineExercises(exercises: RoutineExercise[]): RoutineExercise[] {
  return exercises.map((exercise, index) => ({
    ...exercise,
    transitionBeforeOverrideSeconds: index === 0
      ? null
      : exercise.transitionBeforeOverrideSeconds === null
        ? null
        : Math.max(0, exercise.transitionBeforeOverrideSeconds),
    restSeconds: Math.max(0, exercise.restSeconds),
    setCount: Math.max(1, Math.floor(exercise.setCount)),
  }))
}

export function buildRoutineFlow(version: RoutineVersion): RoutineFlowItem[] {
  const defaultTransitionSeconds = Math.max(0, version.transitionSeconds)
  const flow: RoutineFlowItem[] = []

  version.exercises.forEach((exercise, index) => {
    if (index > 0) {
      const overrideSeconds = exercise.transitionBeforeOverrideSeconds
      flow.push({
        kind: 'transition',
        seconds: overrideSeconds === null
          ? defaultTransitionSeconds
          : Math.max(0, overrideSeconds),
        beforeExerciseId: exercise.id,
        inherited: overrideSeconds === null,
      })
    }

    flow.push({ kind: 'exercise', exercise })
  })

  return flow
}

export function getRoutine(data: AppData, id: string): Routine | undefined {
  return data.routines.find((r) => r.id === id)
}

export function getActiveRoutines(data: AppData): Routine[] {
  return data.routines.filter((r) => !r.archived)
}

export function getRoutineVersion(data: AppData, id: string): RoutineVersion | undefined {
  return data.routineVersions.find((v) => v.id === id)
}

export function getActiveRoutineVersion(data: AppData, routineId: string): RoutineVersion | undefined {
  const routine = getRoutine(data, routineId)

  if (!routine) {
    return undefined
  }

  return getRoutineVersion(data, routine.activeVersionId)
}

export function createRoutine(data: AppData, name: string, exercises: RoutineExercise[], transitionSeconds = DEFAULT_TRANSITION_SECONDS): AppData {
  const timestamp = new Date().toISOString()
  const routineId = generateId()
  const versionId = generateId()

  const version: RoutineVersion = {
    id: versionId,
    routineId,
    previousVersionId: null,
    createdAt: timestamp,
    transitionSeconds: Math.max(0, transitionSeconds),
    exercises: normalizeRoutineExercises(exercises),
  }

  const routine: Routine = {
    id: routineId,
    name,
    activeVersionId: versionId,
    prefillSourceWorkoutId: null,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    ...data,
    routines: [...data.routines, routine],
    routineVersions: [...data.routineVersions, version],
  }
}

export function editRoutine(data: AppData, routineId: string, name: string, exercises: RoutineExercise[], transitionSeconds = DEFAULT_TRANSITION_SECONDS): AppData {
  const routine = getRoutine(data, routineId)

  if (!routine) {
    return data
  }

  const timestamp = new Date().toISOString()
  const versionId = generateId()

  const version: RoutineVersion = {
    id: versionId,
    routineId,
    previousVersionId: routine.activeVersionId,
    createdAt: timestamp,
    transitionSeconds: Math.max(0, transitionSeconds),
    exercises: normalizeRoutineExercises(exercises),
  }

  const updatedRoutine: Routine = {
    ...routine,
    name,
    activeVersionId: versionId,
    updatedAt: timestamp,
  }

  return {
    ...data,
    routines: data.routines.map((r) => (r.id === routineId ? updatedRoutine : r)),
    routineVersions: [...data.routineVersions, version],
  }
}

export function renameRoutine(data: AppData, routineId: string, name: string): AppData {
  const routine = getRoutine(data, routineId)

  if (!routine) {
    return data
  }

  return {
    ...data,
    routines: data.routines.map((candidate) =>
      candidate.id === routineId
        ? { ...candidate, name, updatedAt: new Date().toISOString() }
        : candidate,
    ),
  }
}

export function archiveRoutine(data: AppData, id: string): AppData {
  const routine = getRoutine(data, id)

  if (!routine) {
    return data
  }

  return {
    ...data,
    routines: data.routines.map((r) =>
      r.id === id ? { ...r, archived: true, updatedAt: new Date().toISOString() } : r,
    ),
  }
}

export function createRoutineExercise(exerciseId: string): RoutineExercise {
  return {
    id: generateId(),
    exerciseId,
    transitionBeforeOverrideSeconds: null,
    restSeconds: DEFAULT_REST_SECONDS,
    setCount: 1,
  }
}
