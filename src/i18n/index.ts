import { enUsMessages } from './en-US.ts'
import { nlNlMessages } from './nl-NL.ts'

type LocaleCode = 'en-US' | 'nl-NL'
type MessageEntry = string | { value: string; context?: string }
type MessageDictionary = Record<string, MessageEntry>
type MessageParams = Record<string, string | number>
type PluralCategory = Intl.LDMLPluralRule

const catalogs: Record<LocaleCode, MessageDictionary> = {
  'en-US': enUsMessages,
  'nl-NL': nlNlMessages,
}

const fallbackLocale: LocaleCode = 'en-US'
let activeLocale: LocaleCode = fallbackLocale

function normalizeLocale(locale: string): string {
  return locale.trim().replace('_', '-')
}

function getPlaceholderNames(template: string): string[] {
  const matches = template.match(/\{[a-zA-Z0-9_.-]+\}/g) ?? []

  return matches.map((match) => match.slice(1, -1))
}

function getValue(entry: MessageEntry): string {
  return typeof entry === 'string' ? entry : entry.value
}

function getTemplate(locale: LocaleCode, key: string): MessageEntry {
  const template = catalogs[locale][key] ?? catalogs[fallbackLocale][key]

  if (!template) {
    throw new Error(`Missing i18n message key: ${key}`)
  }

  return template
}

export function resolveLocale(preferred: string | null | undefined): LocaleCode {
  if (!preferred) {
    return fallbackLocale
  }

  const normalized = normalizeLocale(preferred)

  if (normalized.toLowerCase() === 'en' || normalized.toLowerCase().startsWith('en-')) {
    return 'en-US'
  }

  if (normalized.toLowerCase() === 'nl' || normalized.toLowerCase().startsWith('nl-')) {
    return 'nl-NL'
  }

  return fallbackLocale
}

export function initLocale(preferred: string | null | undefined): LocaleCode {
  activeLocale = resolveLocale(preferred)
  return activeLocale
}

export function getLocale(): LocaleCode {
  return activeLocale
}

export function getMessageContext(key: string): string | undefined {
  const entry = getTemplate(activeLocale, key)

  return typeof entry === 'string' ? undefined : entry.context
}

export function t(key: string, params?: MessageParams): string {
  const template = getValue(getTemplate(activeLocale, key))
  const placeholders = getPlaceholderNames(template)

  if (placeholders.length === 0) {
    return template
  }

  const values = params ?? {}

  for (const placeholder of placeholders) {
    if (!(placeholder in values)) {
      throw new Error(`Missing i18n placeholder "${placeholder}" for key: ${key}`)
    }
  }

  return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_, name: string) => String(values[name]))
}

export function tPlural(key: string, count: number, params?: MessageParams): string {
  const category: PluralCategory = new Intl.PluralRules(activeLocale).select(count)
  const variantKey = `${key}.${category}`
  const fallbackKey = `${key}.other`
  const templateKey = catalogs[activeLocale][variantKey] || catalogs[fallbackLocale][variantKey] ? variantKey : fallbackKey

  return t(templateKey, { ...(params ?? {}), count })
}

export function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(activeLocale, options).format(date)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(activeLocale, options).format(value)
}
