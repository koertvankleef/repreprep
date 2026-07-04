import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { storageService } from '../app/storage-instance.ts'
import '../app/components/routines/rrr-routine-list.ts'

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
  test('renders routines as button navigation rows without inline actions', async () => {
    const list = document.createElement('rrr-routine-list')
    document.body.append(list)
    await Promise.resolve()

    const routine = storageService.getData().routines[0]!
    const row = list.querySelector<HTMLElement>('rrr-list-row')

    expect(row?.getAttribute('activation')).toBe('button')
    expect(row?.dataset.action).toBe('navigate')
    expect(row?.dataset.href).toBe(`#/routines/${routine.id}`)
    expect(row?.querySelector(':scope > button')).toBeTruthy()
    expect(row?.querySelector(':scope > a')).toBeNull()
    expect(row?.getAttribute('accessory')).toBe('chevron')
    expect(row?.querySelector('[slot="body"]')).toBeTruthy()
    expect(list.querySelector('rrr-button')).toBeNull()
    expect(list.textContent).toContain('Featured')
  })
})
