import { describe, expect, test, vi } from 'vitest'
import { AppResetController } from '../app/app-reset-controller.ts'

describe('app reset controller', () => {
  test('clears data and preferences, then renders immediately when already on Today', () => {
    const resetData = vi.fn()
    const resetPreferences = vi.fn()
    const setHash = vi.fn()
    const controller = new AppResetController({
      resetData,
      resetPreferences,
      getHash: () => '#/workouts',
      setHash,
    })

    expect(controller.reset()).toEqual({ renderWorkoutsImmediately: true })
    expect(resetData).toHaveBeenCalledOnce()
    expect(resetPreferences).toHaveBeenCalledOnce()
    expect(setHash).not.toHaveBeenCalled()
  })

  test('clears data and preferences, then redirects to Today from other routes', () => {
    const resetData = vi.fn()
    const resetPreferences = vi.fn()
    const setHash = vi.fn()
    const controller = new AppResetController({
      resetData,
      resetPreferences,
      getHash: () => '#/settings',
      setHash,
    })

    expect(controller.reset()).toEqual({ renderWorkoutsImmediately: false })
    expect(resetData).toHaveBeenCalledOnce()
    expect(resetPreferences).toHaveBeenCalledOnce()
    expect(setHash).toHaveBeenCalledWith('/workouts')
  })
})
