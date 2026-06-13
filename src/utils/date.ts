export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
