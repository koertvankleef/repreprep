import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { storageService } from '../app/storage-instance.ts'
import { RrrRoutineExerciseEditor } from '../app/components/routines/rrr-routine-exercise-editor.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { registerRrrSequence } from '../design-system/components/rrr-sequence.ts'
import { registerRrrSequenceGutter } from '../design-system/components/rrr-sequence-gutter.ts'
import { initLocale } from '../i18n/index.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrListRow()
  registerRrrSection()
  registerRrrSequence()
  registerRrrSequenceGutter()
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  storageService.resetAllData()
})

describe('routine exercise editor', () => {
  test('renders planned sets with derived shared rest gutters', async () => {
    const data = storageService.getData()
    const routine = data.routines[0]!
    const version = data.routineVersions.find(({ id }) => id === routine.activeVersionId)!
    const routineExercise = version.exercises.find(({ plannedSets }) => plannedSets.length > 1)!
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = routine.id
    editor.routineExerciseId = routineExercise.id
    document.body.append(editor)
    await Promise.resolve()

    const sequence = editor.querySelector('rrr-sequence')
    const rows = sequence?.querySelectorAll('rrr-list-row')
    const gutters = sequence?.querySelectorAll('rrr-sequence-gutter')

    expect(rows).toHaveLength(routineExercise.plannedSets.length)
    expect(gutters).toHaveLength(routineExercise.plannedSets.length - 1)
    expect(gutters?.[0]?.getAttribute('value')).toBe(String(routineExercise.restSeconds))
    expect(gutters?.[0]?.getAttribute('unit')).toBe('s')
    expect(gutters?.[0]?.getAttribute('aria-label')).toContain('between set 1 and set 2')
  })

  test('renders a not-found state when the sequence entry is unavailable', () => {
    const editor = new RrrRoutineExerciseEditor()

    editor.routineId = 'missing-routine'
    editor.routineExerciseId = 'missing-entry'
    document.body.append(editor)

    expect(editor.textContent).toContain('This routine exercise is unavailable')
    expect(editor.querySelector('rrr-sequence')).toBeNull()
  })
})
