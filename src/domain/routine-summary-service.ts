import type {
  AppData,
  Muscle,
  Routine,
  RoutineVersion,
} from './types.ts'

export type RoutineSummary = {
  routine: Routine
  version: RoutineVersion | undefined
  exerciseNames: Array<string | null>
  primaryMuscles: Muscle[]
  lastStartedAt: string | null
}

export type RoutineListSections = {
  featured: RoutineSummary | null
  others: RoutineSummary[]
}

export function getRoutineListSections(data: AppData): RoutineListSections {
  const activeRoutines = data.routines.filter((routine) => !routine.archived)
  const summaries = activeRoutines.map((routine) => createRoutineSummary(data, routine))
  const featured = selectFeaturedSummary(summaries)
  const others = summaries
    .filter((summary) => summary.routine.id !== featured?.routine.id)
    .sort(compareByUpdatedAtDescending)

  return { featured, others }
}

export function getRoutineSummary(data: AppData, routineId: string): RoutineSummary | null {
  const routine = data.routines.find((candidate) => candidate.id === routineId)
  return routine ? createRoutineSummary(data, routine) : null
}

function createRoutineSummary(data: AppData, routine: Routine): RoutineSummary {
  const version = data.routineVersions.find((candidate) => candidate.id === routine.activeVersionId)
  const muscleCounts = new Map<Muscle, { count: number; firstIndex: number }>()
  const exerciseNames = (version?.exercises ?? []).map((routineExercise, index) => {
    const exercise = data.exercises.find((candidate) => candidate.id === routineExercise.exerciseId)

    for (const muscle of exercise?.primaryMuscles ?? []) {
      const current = muscleCounts.get(muscle)
      muscleCounts.set(muscle, {
        count: (current?.count ?? 0) + 1,
        firstIndex: current?.firstIndex ?? index,
      })
    }

    return exercise?.name ?? null
  })
  const primaryMuscles = [...muscleCounts.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].firstIndex - right[1].firstIndex)
    .map(([muscle]) => muscle)
  const lastStartedAt = data.workouts
    .filter((workout) => workout.routineId === routine.id)
    .reduce<string | null>(
      (latest, workout) => latest === null || workout.createdAt > latest ? workout.createdAt : latest,
      null,
    )

  return {
    routine,
    version,
    exerciseNames,
    primaryMuscles,
    lastStartedAt,
  }
}

function selectFeaturedSummary(summaries: RoutineSummary[]): RoutineSummary | null {
  const lastStarted = summaries
    .filter((summary) => summary.lastStartedAt !== null)
    .sort((left, right) => (right.lastStartedAt ?? '').localeCompare(left.lastStartedAt ?? ''))[0]

  return lastStarted
    ?? [...summaries].sort(compareByUpdatedAtDescending)[0]
    ?? null
}

function compareByUpdatedAtDescending(left: RoutineSummary, right: RoutineSummary): number {
  return right.routine.updatedAt.localeCompare(left.routine.updatedAt)
}
