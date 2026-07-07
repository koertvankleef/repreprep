export type InstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => unknown
  userChoice: unknown
}

export type AppInstallPromptControllerOptions = {
  devMode: boolean
  onChange: () => void
  onDevPromptUnavailable: () => void
}

export class AppInstallPromptController {
  private promptEvent: BeforeInstallPromptEvent | null = null
  private installAvailable = false
  private standalone = window.matchMedia('(display-mode: standalone)').matches

  constructor(private readonly options: AppInstallPromptControllerOptions) {}

  get shouldShowInstallButton(): boolean {
    if (this.standalone) {
      return false
    }

    return this.options.devMode || this.installAvailable
  }

  handlePromptAvailable(event: Event): void {
    event.preventDefault()
    this.promptEvent = event as BeforeInstallPromptEvent
    this.installAvailable = true
    this.options.onChange()
  }

  handleAppInstalled(): void {
    this.promptEvent = null
    this.installAvailable = false
    this.standalone = true
    this.options.onChange()
  }

  syncStandaloneDisplayMode(): void {
    this.standalone = window.matchMedia('(display-mode: standalone)').matches
    if (this.standalone) {
      this.installAvailable = false
    }
  }

  async prompt(): Promise<void> {
    const promptEvent = this.promptEvent
    if (!promptEvent) {
      if (this.options.devMode) {
        this.options.onDevPromptUnavailable()
      }
      return
    }

    this.installAvailable = false
    this.options.onChange()

    await promptEvent.prompt()
    const choice = (await promptEvent.userChoice) as InstallPromptChoice
    this.promptEvent = null

    if (choice.outcome !== 'accepted') {
      this.installAvailable = false
    }

    this.options.onChange()
  }
}
