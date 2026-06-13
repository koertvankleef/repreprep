import { WorkoutStorageService } from '../storage/storage-service.ts'
import { LocalStorageAdapter } from '../storage/local-storage-adapter.ts'

export const storageService = new WorkoutStorageService(new LocalStorageAdapter())
