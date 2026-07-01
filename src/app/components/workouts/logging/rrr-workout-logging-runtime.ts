export class ManagedTimer {
  private id: number | null = null

  interval(callback: () => void, ms: number): void {
    this.clear()
    this.id = window.setInterval(callback, ms)
  }

  timeout(callback: () => void, ms: number): void {
    this.clear()
    this.id = window.setTimeout(callback, ms)
  }

  clear(): void {
    if (this.id !== null) {
      clearTimeout(this.id)
      clearInterval(this.id)
      this.id = null
    }
  }
}

type CountdownOptions = {
  timer: ManagedTimer
  getRemaining: () => number
  setRemaining: (value: number) => void
  onTick: () => void
  onDone: () => void
}

export function startManagedCountdown(options: CountdownOptions): void {
  const { timer, getRemaining, setRemaining, onTick, onDone } = options

  timer.interval(() => {
    const nextRemaining = getRemaining() - 1
    setRemaining(nextRemaining)

    if (nextRemaining <= 0) {
      timer.clear()
      onDone()
      return
    }

    onTick()
  }, 1000)
}
