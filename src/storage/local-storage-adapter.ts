import type { AppData } from '../domain/types.ts'
import type { StorageAdapter } from './storage-service.ts'
import { isValidAppData, migrateRawAppData } from '../import-export/json-import-service.ts'

const storageKey = 'repreprep:data'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function migrateRawToAppData(parsed: unknown): AppData | null {
  if (!isRecord(parsed) || typeof parsed.schemaVersion !== 'number') {
    return null
  }

  const candidate = migrateRawAppData(parsed)

  if (!isValidAppData(candidate)) {
    return null
  }

  return candidate
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

      return migrateRawToAppData(parsed)
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
