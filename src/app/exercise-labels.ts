import type { Equipment, ExerciseCategory, MeasurementType, Muscle } from '../domain/types.ts'
import { t } from '../i18n/index.ts'

export function getExerciseCategoryLabel(category: ExerciseCategory): string {
  return t(`exercise.category.${category}`)
}

export function getEquipmentLabel(equipment: Equipment): string {
  return t(`exercise.equipment.${equipment}`)
}

export function getMuscleLabel(muscle: Muscle): string {
  return t(`exercise.muscle.${muscle}`)
}

export function getMeasurementTypeLabel(type: MeasurementType): string {
  return t(`exercise.measurement.${type}`)
}
