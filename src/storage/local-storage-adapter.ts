import type { AppData } from '../domain/types.ts'
import type { StorageAdapter } from './storage-service.ts'
import { isValidAppData } from '../import-export/json-import-service.ts'

const storageKey = 'repreprep:data'

function migrateData(data: AppData): AppData | null {
  switch (data.schemaVersion) {
    case 1:
      return data
    default:
      return null
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  load(): AppData | null {
    if (typeof localStorage === 'undefined') {
      return null
    }

    const raw = localStorage.getItem(storageKey)

    if (!raw) {
      return null
    }

    try {
      const parsed: unknown = JSON.parse(raw)

      if (!isValidAppData(parsed)) {
        return null
      }

      return migrateData(parsed)
    } catch {
      return null
    }
  }

  save(data: AppData): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(storageKey, JSON.stringify(data))
  }

  clear(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.removeItem(storageKey)
  }
}
