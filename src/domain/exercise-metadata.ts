import type {
  Equipment,
  Exercise,
  ExerciseCategory,
  ExerciseDefinition,
  ExerciseKind,
  MeasurementProfile,
  MeasurementType,
  Muscle,
} from './types.ts'

export const measurementTypes = ['reps', 'weight', 'time', 'distance', 'calories', 'rounds'] as const satisfies readonly MeasurementType[]
export const exerciseCategories = ['strength', 'cardio', 'mobility', 'stretch', 'balance'] as const satisfies readonly ExerciseCategory[]
export const equipmentValues = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'bench',
  'machine',
  'cable',
  'resistance-band',
  'pull-up-bar',
  'dip-bars',
  'medicine-ball',
  'stability-ball',
  'foam-roller',
  'jump-rope',
  'treadmill',
  'exercise-bike',
  'rowing-machine',
  'elliptical',
  'stair-machine',
  'other',
] as const satisfies readonly Equipment[]
export const muscleValues = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'glutes',
  'quadriceps',
  'hamstrings',
  'calves',
  'hips',
  'full-body',
] as const satisfies readonly Muscle[]

const measurementTypeOrder = new Map<MeasurementType, number>(measurementTypes.map((type, index) => [type, index]))

export function normalizeMeasurementProfile(profile: MeasurementProfile): MeasurementProfile {
  return [...new Set(profile)].sort((left, right) => {
    return (measurementTypeOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (measurementTypeOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
  })
}

export function measurementProfileKey(profile: MeasurementProfile): string {
  return normalizeMeasurementProfile(profile).join('+')
}

export function normalizeMeasurementProfiles(profiles: MeasurementProfile[]): MeasurementProfile[] {
  const seen = new Set<string>()
  const normalized: MeasurementProfile[] = []

  profiles.forEach((profile) => {
    const nextProfile = normalizeMeasurementProfile(profile)
    const key = measurementProfileKey(nextProfile)

    if (!seen.has(key)) {
      seen.add(key)
      normalized.push(nextProfile)
    }
  })

  return normalized
}

export function getExerciseKind(exercise: Pick<Exercise, 'measurementProfiles'>): ExerciseKind {
  const preferredProfile = exercise.measurementProfiles[0] ?? ['reps']

  return preferredProfile.includes('time') && !preferredProfile.includes('reps') ? 'time' : 'reps'
}

export function getExerciseDefaultUnit(exercise: Pick<Exercise, 'measurementProfiles'>): string | null {
  const kind = getExerciseKind(exercise)

  return kind === 'time' ? 'seconds' : 'kg'
}

export function toExerciseDefinition(exercise: Exercise, timestamp: string): ExerciseDefinition {
  return {
    ...exercise,
    kind: getExerciseKind(exercise),
    defaultUnit: getExerciseDefaultUnit(exercise),
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

