export type AppResetControllerOptions = {
  resetData: () => void
  resetPreferences: () => void
  getHash: () => string
  setHash: (hash: string) => void
}

export type AppResetResult = {
  renderWorkoutsImmediately: boolean
}

export class AppResetController {
  constructor(private readonly options: AppResetControllerOptions) {}

  reset(): AppResetResult {
    this.options.resetData()
    this.options.resetPreferences()

    if (this.options.getHash() !== '#/workouts') {
      this.options.setHash('/workouts')
      return { renderWorkoutsImmediately: false }
    }

    return { renderWorkoutsImmediately: true }
  }
}
