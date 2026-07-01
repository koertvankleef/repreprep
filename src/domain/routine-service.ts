import type { AppData, Routine, RoutineExercise, RoutineVersion } from './types.ts'
import { generateId } from '../utils/id.ts'

const DEFAULT_REST_SECONDS = 20
const DEFAULT_TRANSITION_SECONDS = 10

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
    exercises,
  }

  const routine: Routine = {
    id: routineId,
    name,
    activeVersionId: versionId,
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
    exercises,
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
    restSeconds: DEFAULT_REST_SECONDS,
    plannedSets: [],
  }
}
