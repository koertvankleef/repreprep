import { WorkoutStorageService } from '../storage/storage-service.ts'
import { LocalStorageAdapter } from '../storage/local-storage-adapter.ts'
import { InMemoryStorageAdapter } from '../storage/in-memory-storage-adapter.ts'

const storageDriver = (import.meta.env.VITE_STORAGE_DRIVER ?? 'local').toLowerCase()

const adapter = storageDriver === 'memory' ? new InMemoryStorageAdapter() : new LocalStorageAdapter()

export const storageService = new WorkoutStorageService(adapter)
