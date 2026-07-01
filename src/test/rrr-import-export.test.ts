import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListRow, type RrrListRow } from '../design-system/components/rrr-list-row.ts'

const mocks = vi.hoisted(() => ({
  confirmSheet: vi.fn(),
  importFromJson: vi.fn(),
  exportToJson: vi.fn(),
  getData: vi.fn(),
  setData: vi.fn(),
  success: vi.fn(),
  danger: vi.fn(),
}))

vi.mock('../utils/sheet-service.ts', () => ({
  confirmSheet: mocks.confirmSheet,
}))

vi.mock('../import-export/json-import-service.ts', () => ({
  importFromJson: mocks.importFromJson,
}))

vi.mock('../import-export/json-export-service.ts', () => ({
  exportToJson: mocks.exportToJson,
}))

vi.mock('../app/storage-instance.ts', () => ({
  storageService: {
    getData: mocks.getData,
    setData: mocks.setData,
  },
}))

vi.mock('../foundation/toast.ts', () => ({
  toastService: {
    success: mocks.success,
    danger: mocks.danger,
  },
}))

beforeAll(async () => {
  initLocale('en-US')
  registerRrrListRow()
  await import('../app/components/rrr-import-export.ts')
})

beforeEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('Import and export file row', () => {
  test('selecting a file starts the existing confirmed import flow', async () => {
    const importedData = { version: 1 }
    mocks.confirmSheet.mockResolvedValue(true)
    mocks.importFromJson.mockResolvedValue(importedData)

    const view = document.createElement('rrr-import-export')
    document.body.appendChild(view)
    await Promise.resolve()

    const row = view.querySelector<RrrListRow>('rrr-list-row[activation="file"]')
    const input = row?.querySelector<HTMLInputElement>('input[type="file"]')
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    const files = {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null,
    } as unknown as FileList
    Object.defineProperty(input, 'files', { configurable: true, value: files })

    input?.dispatchEvent(new Event('change', { bubbles: true }))

    await vi.waitFor(() => {
      expect(mocks.importFromJson).toHaveBeenCalledWith(file)
    })
    expect(mocks.confirmSheet).toHaveBeenCalledOnce()
    expect(mocks.setData).toHaveBeenCalledWith(importedData)
    expect(mocks.success).toHaveBeenCalledWith('Import completed')
    expect(input?.value).toBe('')
  })
})
