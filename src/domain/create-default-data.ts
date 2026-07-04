import type { AppData, Routine, RoutineExercise, RoutineVersion } from './types.ts'
import { exerciseCatalog } from '../exercise-library/exercises.ts'
import { getExerciseKind, toExerciseDefinition } from './exercise-metadata.ts'
import { generateId as generateUniqueId } from '../utils/id.ts'

const DEFAULT_REST_SECONDS = 20
const DEFAULT_TRANSITION_SECONDS = 10

const defaultRoutineExerciseIds = [
  'pushups',
  'standing-military-press',
  'one-arm-dumbbell-row',
  'dumbbell-lunges',
  'dumbbell-bicep-curl',
  'romanian-deadlift',
  'plank',
]

export function generateId(): string {
  return generateUniqueId()
}

export function createDefaultData(): AppData {
  const timestamp = new Date().toISOString()
  const exercises = exerciseCatalog.map((exercise) => toExerciseDefinition(exercise, timestamp))
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

  const routineId = generateId()
  const versionId = generateId()

  const routineExercises: RoutineExercise[] = defaultRoutineExerciseIds.flatMap((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)

    if (!exercise) {
      return []
    }

    return {
      id: generateId(),
      exerciseId: exercise.id,
      setCount: getExerciseKind(exercise) === 'time' ? 1 : 2,
      transitionBeforeOverrideSeconds: null,
      restSeconds: DEFAULT_REST_SECONDS,
    }
  })

  const routineVersion: RoutineVersion = {
    id: versionId,
    routineId,
    previousVersionId: null,
    createdAt: timestamp,
    transitionSeconds: DEFAULT_TRANSITION_SECONDS,
    exercises: routineExercises,
  }

  const routine: Routine = {
    id: routineId,
    name: 'Full Body',
    activeVersionId: versionId,
    prefillSourceWorkoutId: null,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    schemaVersion: 7,
    exercises,
    workouts: [],
    routines: [routine],
    routineVersions: [routineVersion],
  }
}
