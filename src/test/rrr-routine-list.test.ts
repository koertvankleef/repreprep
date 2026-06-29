import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { storageService } from '../app/storage-instance.ts'
import '../app/components/rrr-routine-list.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrListRow()
  registerRrrSection()
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  storageService.resetAllData()
})

describe('rrr-routine-list', () => {
  test('renders routines as navigation rows without inline actions', () => {
    const list = document.createElement('rrr-routine-list')
    document.body.append(list)

    const routine = storageService.getData().routines[0]!
    const row = list.querySelector('rrr-list-row')

    expect(row?.getAttribute('href')).toBe(`#/routines/${routine.id}`)
    expect(row?.getAttribute('accessory')).toBe('chevron')
    expect(row?.querySelector('[slot="body"]')).toBeTruthy()
    expect(list.querySelector('rrr-button')).toBeNull()
    expect(list.textContent).toContain('Featured')
  })
})
