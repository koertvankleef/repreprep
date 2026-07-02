import { t } from '../../../i18n/index.ts'

const setOrdinalKeys = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
] as const

export function formatSetPosition(setNumber: number): string {
  const ordinalKey = setOrdinalKeys[setNumber - 1]

  return ordinalKey
    ? t(`routineExercise.set.ordinal.${ordinalKey}`)
    : t('routineExercise.set.label', { index: setNumber })
}
