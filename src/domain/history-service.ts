import type { AppData, SetEntry } from './types.ts'

export interface ExerciseHistory {
  workoutId: string
  date: string
  sets: SetEntry[]
}

export interface RepsPersonalRecord {
  kind: 'reps'
  reps: number
  weightKg: number
  date: string
}

export interface TimePersonalRecord {
  kind: 'time'
  seconds: number
  date: string
}

export type PersonalRecord = RepsPersonalRecord | TimePersonalRecord

export function getExerciseHistory(data: AppData, exerciseId: string): ExerciseHistory[] {
  return data.workouts
    .flatMap((workout) =>
      workout.exercises
        .filter((entry) => entry.exerciseId === exerciseId)
        .map((entry) => ({
          workoutId: workout.id,
          date: workout.date,
          sets: entry.sets,
        })),
    )
    .sort((left, right) => left.date.localeCompare(right.date))
}

export function getPersonalRecord(data: AppData, exerciseId: string): PersonalRecord | null {
  const history = getExerciseHistory(data, exerciseId)
  const sets = history.flatMap((entry) => entry.sets.map((set) => ({ set, date: entry.date })))

  if (sets.length === 0) {
    return null
  }

  const firstSet = sets[0]?.set

  if (!firstSet) {
    return null
  }

  if (firstSet.kind === 'time') {
    const durationSets = sets.filter(
      (entry): entry is { set: Extract<SetEntry, { kind: 'time' }>; date: string } => entry.set.kind === 'time',
    )
    const record = durationSets.reduce((best, current) => {
      if (!best || current.set.seconds > best.set.seconds) {
        return current
      }

      return best
    }, null as { set: Extract<SetEntry, { kind: 'time' }>; date: string } | null)

    if (!record) {
      return null
    }

    return {
      kind: 'time',
      seconds: record.set.seconds,
      date: record.date,
    }
  }

  const repsSets = sets.filter(
    (entry): entry is { set: Extract<SetEntry, { kind: 'reps' }>; date: string } => entry.set.kind === 'reps',
  )
  const record = repsSets.reduce((best, current) => {
    const currentWeight = current.set.weightKg ?? 0
    const bestWeight = best?.set.weightKg ?? 0

    if (!best || currentWeight > bestWeight) {
      return current
    }

    if (currentWeight === bestWeight && current.set.reps > best.set.reps) {
      return current
    }

    return best
  }, null as { set: Extract<SetEntry, { kind: 'reps' }>; date: string } | null)

  if (!record) {
    return null
  }

  return {
    kind: 'reps',
    reps: record.set.reps,
    weightKg: record.set.weightKg ?? 0,
    date: record.date,
  }
}
