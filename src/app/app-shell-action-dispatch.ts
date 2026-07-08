export type AppShellActionHandlers = {
  navigate: (href: string) => void
  installApp: () => void
  renameRoutine: () => void
  toggleExerciseFilters: () => void
  toggleExerciseFilter: (target: HTMLElement) => void
  clearExerciseFilters: () => void
}

export function findActionTarget(event: Event): HTMLElement | null {
  return event
    .composedPath()
    .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)
    ?? null
}

export function dispatchAppShellAction(
  actionTarget: HTMLElement,
  handlers: AppShellActionHandlers,
): boolean {
  const action = actionTarget.dataset.action

  if (action === 'navigate') {
    const href = actionTarget.dataset.href
    if (href) {
      handlers.navigate(href)
    }
    return true
  }

  if (action === 'install-app') {
    handlers.installApp()
    return true
  }

  if (action === 'rename-routine') {
    handlers.renameRoutine()
    return true
  }

  if (action === 'toggle-exercise-filters') {
    handlers.toggleExerciseFilters()
    return true
  }

  if (action === 'toggle-exercise-filter') {
    handlers.toggleExerciseFilter(actionTarget)
    return true
  }

  if (action === 'clear-exercise-filters') {
    handlers.clearExerciseFilters()
    return true
  }

  return false
}
