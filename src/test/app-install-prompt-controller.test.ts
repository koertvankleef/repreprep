import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AppInstallPromptController, type BeforeInstallPromptEvent } from '../app/app-install-prompt-controller.ts'

function installMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

function createPromptEvent(outcome: 'accepted' | 'dismissed'): BeforeInstallPromptEvent {
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn(),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  } as unknown as BeforeInstallPromptEvent
}

describe('app install prompt controller', () => {
  beforeEach(() => {
    installMatchMedia(false)
  })

  test('shows the install button in dev mode even without a prompt event', async () => {
    const devHint = vi.fn()
    const controller = new AppInstallPromptController({
      devMode: true,
      onChange: vi.fn(),
      onDevPromptUnavailable: devHint,
    })

    expect(controller.shouldShowInstallButton).toBe(true)

    await controller.prompt()

    expect(devHint).toHaveBeenCalledTimes(1)
  })

  test('tracks prompt availability and prompts the captured event', async () => {
    const onChange = vi.fn()
    const event = createPromptEvent('accepted')
    const controller = new AppInstallPromptController({
      devMode: false,
      onChange,
      onDevPromptUnavailable: vi.fn(),
    })

    controller.handlePromptAvailable(event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(controller.shouldShowInstallButton).toBe(true)

    await controller.prompt()

    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  test('hides install affordance after appinstalled or standalone mode', () => {
    const controller = new AppInstallPromptController({
      devMode: false,
      onChange: vi.fn(),
      onDevPromptUnavailable: vi.fn(),
    })

    controller.handlePromptAvailable(createPromptEvent('dismissed'))
    expect(controller.shouldShowInstallButton).toBe(true)

    controller.handleAppInstalled()
    expect(controller.shouldShowInstallButton).toBe(false)
  })
})
