import type { AppData } from '../domain/types.ts'
import type { StorageAdapter } from './storage-service.ts'

export class InMemoryStorageAdapter implements StorageAdapter {
  private data: AppData | null = null

  load(): AppData | null {
    return this.data
  }

  save(data: AppData): void {
    this.data = data
  }

  clear(): void {
    this.data = null
  }
}
