export type ThemeMode = 'light' | 'dark' | 'auto'
export type ContrastMode = 'normal' | 'high'

export type DisplayPreferences = {
  theme: ThemeMode
  contrast: ContrastMode
}

const storageKey = 'rrr-display-preferences-v1'

const defaultPreferences: DisplayPreferences = {
  theme: 'auto',
  contrast: 'normal',
}

function isThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto'
}

function isContrastMode(value: string): value is ContrastMode {
  return value === 'normal' || value === 'high'
}

export function loadDisplayPreferences(): DisplayPreferences {
  if (typeof localStorage === 'undefined') {
    return { ...defaultPreferences }
  }

  const raw = localStorage.getItem(storageKey)

  if (!raw) {
    return { ...defaultPreferences }
  }

  try {
    const parsed = JSON.parse(raw) as { theme?: string; contrast?: string }

    return {
      theme: parsed.theme && isThemeMode(parsed.theme) ? parsed.theme : defaultPreferences.theme,
      contrast: parsed.contrast && isContrastMode(parsed.contrast) ? parsed.contrast : defaultPreferences.contrast,
    }
  } catch {
    return { ...defaultPreferences }
  }
}

export function saveDisplayPreferences(preferences: DisplayPreferences): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(storageKey, JSON.stringify(preferences))
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') {
    return mode
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyDisplayPreferences(preferences: DisplayPreferences): void {
  const root = document.documentElement
  const resolvedTheme = resolveTheme(preferences.theme)

  root.dataset.themeMode = preferences.theme
  root.dataset.theme = resolvedTheme
  root.dataset.contrast = preferences.contrast
  root.style.colorScheme = resolvedTheme
}

export function watchSystemThemePreference(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onChange()

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }

  query.addListener(handler)
  return () => query.removeListener(handler)
}
