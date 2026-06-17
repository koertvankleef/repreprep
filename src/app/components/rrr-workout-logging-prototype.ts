import styles from './rrr-workout-logging-prototype.css?inline'

type Exercise = {
  name: string
  totalSets: number
  restSeconds: number
  previousPerformance: string
  suggestedReps: number
}

type TimelineItem =
  | {
      kind: 'set'
      exerciseIndex: number
      setNumber: number
    }
  | {
      kind: 'rest'
      exerciseIndex: number
      setNumber: number
      durationSeconds: number
    }
  | {
      kind: 'transition'
      exerciseIndex: number
      durationSeconds: number
    }

type ActiveStage = 'locked' | 'set' | 'rest' | 'rest-paused' | 'transition' | 'transition-paused' | 'workout-complete'

const EXERCISES: Exercise[] = [
  { name: 'Push-ups', totalSets: 3, restSeconds: 20, previousPerformance: '10 reps', suggestedReps: 12 },
  { name: 'Dumbbell Row', totalSets: 3, restSeconds: 20, previousPerformance: '12 reps @ 14kg', suggestedReps: 12 },
  { name: 'Plank', totalSets: 1, restSeconds: 0, previousPerformance: '45 sec', suggestedReps: 1 },
]

const EXERCISE_TRANSITION_SECONDS = 10

function getExercise(index: number): Exercise {
  const exercise = EXERCISES[index]
  if (!exercise) {
    throw new Error(`Missing exercise at index ${index}`)
  }
  return exercise
}

function buildTimeline(): TimelineItem[] {
  const timeline: TimelineItem[] = []

  EXERCISES.forEach((exercise, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= exercise.totalSets; setNumber += 1) {
      timeline.push({ kind: 'set', exerciseIndex, setNumber })

      if (setNumber < exercise.totalSets) {
        timeline.push({ kind: 'rest', exerciseIndex, setNumber, durationSeconds: exercise.restSeconds })
      }
    }

    if (exerciseIndex < EXERCISES.length - 1) {
      timeline.push({ kind: 'transition', exerciseIndex, durationSeconds: EXERCISE_TRANSITION_SECONDS })
    }
  })

  return timeline
}

const TIMELINE = buildTimeline()

export class RrrWorkoutLoggingPrototype extends HTMLElement {
  private static readonly DEFAULT_STATE_TRANSITION_MS = 180
  private static readonly STATE_TRANSITION_BUFFER_MS = 60

  private activeTimelineIndex = 0
  private repValue = getExercise(0).suggestedReps
  private stage: ActiveStage = 'locked'
  private restRemainingSeconds = 0
  private nextExerciseRemainingSeconds = EXERCISE_TRANSITION_SECONDS
  private restIntervalId: number | null = null
  private exerciseCountdownIntervalId: number | null = null
  private motionCleanupId: number | null = null
  private readonly completedSetsByExercise = EXERCISES.map(() => 0)
  private overallProgressVisualPercent = 0

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
    this.shadowRoot?.addEventListener('click', this.handleClick)
  }

  disconnectedCallback(): void {
    this.shadowRoot?.removeEventListener('click', this.handleClick)
    this.clearMotionCleanup()
    this.clearTimers()
  }

  private readonly handleClick = (event: Event): void => {
    const target = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)

    if (!target) {
      return
    }

    const action = target.dataset.action

    if (action === 'go') {
      this.startWorkout()
      return
    }

    if (action === 'rep-minus') {
      this.repValue = Math.max(0, this.repValue - 1)
      this.syncActiveSetRepValue()
      return
    }

    if (action === 'rep-plus') {
      this.repValue += 1
      this.syncActiveSetRepValue()
      return
    }

    if (action === 'done-set') {
      this.completeSet()
      return
    }

    if (action === 'pause-rest') {
      this.pauseRest()
      return
    }

    if (action === 'resume-rest') {
      this.resumeRest()
      return
    }

    if (action === 'skip-rest') {
      this.skipRest()
      return
    }

    if (action === 'stay-here') {
      this.pauseExerciseTransition()
      return
    }

    if (action === 'next-now' || action === 'next') {
      this.moveToNextTimelineItem()
    }
  }

  private startWorkout(): void {
    this.activateCurrentTimelineItem()
  }

  private completeSet(): void {
    const currentItem = TIMELINE[this.activeTimelineIndex]
    if (!currentItem || currentItem.kind !== 'set') {
      return
    }

    this.completedSetsByExercise[currentItem.exerciseIndex] = currentItem.setNumber
    this.syncOverallProgress()
    this.moveToNextTimelineItem()
  }

  private moveToNextTimelineItem(): void {
    if (this.activeTimelineIndex >= TIMELINE.length - 1) {
      this.stage = 'workout-complete'
      this.render()
      return
    }

    this.activeTimelineIndex += 1
    this.activateCurrentTimelineItem()
  }

  private activateCurrentTimelineItem(): void {
    const item = TIMELINE[this.activeTimelineIndex]
    if (!item) {
      this.stage = 'workout-complete'
      this.render()
      return
    }

    if (item.kind === 'set') {
      this.stage = 'set'
      this.repValue = getExercise(item.exerciseIndex).suggestedReps
      this.transitionToCurrentActiveItem()
      return
    }

    if (item.kind === 'rest') {
      this.beginRest(item.durationSeconds)
      return
    }

    this.beginExerciseTransition(item.durationSeconds)
  }

  private beginRest(seconds: number): void {
    this.clearRestTimer()
    this.restRemainingSeconds = seconds
    this.stage = 'rest'

    this.restIntervalId = window.setInterval(() => {
      this.restRemainingSeconds -= 1
      if (this.restRemainingSeconds <= 0) {
        this.clearRestTimer()
        this.moveToNextTimelineItem()
        return
      }
      this.updateLiveStageVisuals()
    }, 1000)

    this.transitionToCurrentActiveItem()
  }

  private pauseRest(): void {
    if (this.stage !== 'rest' || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.clearRestTimer()
    this.stage = 'rest-paused'
    this.patchTimelineStateInPlace()
  }

  private resumeRest(): void {
    if (this.stage !== 'rest-paused' || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.stage = 'rest'
    this.restIntervalId = window.setInterval(() => {
      this.restRemainingSeconds -= 1
      if (this.restRemainingSeconds <= 0) {
        this.clearRestTimer()
        this.moveToNextTimelineItem()
        return
      }
      this.updateLiveStageVisuals()
    }, 1000)
    this.patchTimelineStateInPlace()
  }

  private skipRest(): void {
    if ((this.stage !== 'rest' && this.stage !== 'rest-paused') || this.currentItem()?.kind !== 'rest') {
      return
    }

    this.clearRestTimer()
    this.moveToNextTimelineItem()
  }

  private beginExerciseTransition(seconds: number): void {
    this.clearExerciseCountdownTimer()
    this.nextExerciseRemainingSeconds = seconds
    this.stage = 'transition'

    this.exerciseCountdownIntervalId = window.setInterval(() => {
      this.nextExerciseRemainingSeconds -= 1
      if (this.nextExerciseRemainingSeconds <= 0) {
        this.clearExerciseCountdownTimer()
        this.moveToNextTimelineItem()
        return
      }
      this.updateLiveStageVisuals()
    }, 1000)

    this.transitionToCurrentActiveItem()
  }

  private pauseExerciseTransition(): void {
    if (this.stage !== 'transition' || this.currentItem()?.kind !== 'transition') {
      return
    }

    this.clearExerciseCountdownTimer()
    this.stage = 'transition-paused'
    this.patchTimelineStateInPlace()
  }

  private clearRestTimer(): void {
    if (this.restIntervalId !== null) {
      clearInterval(this.restIntervalId)
      this.restIntervalId = null
    }
  }

  private clearExerciseCountdownTimer(): void {
    if (this.exerciseCountdownIntervalId !== null) {
      clearInterval(this.exerciseCountdownIntervalId)
      this.exerciseCountdownIntervalId = null
    }
  }

  private clearTimers(): void {
    this.clearRestTimer()
    this.clearExerciseCountdownTimer()
  }

  private clearMotionCleanup(): void {
    if (this.motionCleanupId !== null) {
      clearTimeout(this.motionCleanupId)
      this.motionCleanupId = null
    }
  }

  private getTransitionDurationMs(variableName: '--proto-transition-duration' | '--proto-transition-duration-exit'): number {
    const rawDuration = getComputedStyle(this).getPropertyValue(variableName).trim()
    const durationMatch = rawDuration.match(/^(\d*\.?\d+)(ms|s)$/)

    if (!durationMatch) {
      return RrrWorkoutLoggingPrototype.DEFAULT_STATE_TRANSITION_MS
    }

    const numericPart = durationMatch[1] ?? ''
    const unit = durationMatch[2] ?? 'ms'
    const parsed = Number.parseFloat(numericPart)

    if (Number.isNaN(parsed)) {
      return RrrWorkoutLoggingPrototype.DEFAULT_STATE_TRANSITION_MS
    }

    return unit === 's' ? parsed * 1000 : parsed
  }

  private scheduleMotionCleanup(): void {
    const cleanupDelay = Math.max(
      this.getTransitionDurationMs('--proto-transition-duration'),
      this.getTransitionDurationMs('--proto-transition-duration-exit')
    ) + RrrWorkoutLoggingPrototype.STATE_TRANSITION_BUFFER_MS

    this.clearMotionCleanup()
    this.motionCleanupId = window.setTimeout(() => {
      this.motionCleanupId = null
      this.shadowRoot?.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
        element.removeAttribute('data-motion')
      })
    }, cleanupDelay)
  }

  private patchTimelineStateInPlace(): boolean {
    if (!this.shadowRoot) {
      return false
    }

    const startItem = this.shadowRoot.querySelector<HTMLElement>('.timeline-item--start')
    const timelineItems = Array.from(this.shadowRoot.querySelectorAll<HTMLElement>('.timeline-item:not(.timeline-item--start)'))
    const previousActive = this.shadowRoot.querySelector<HTMLElement>('.timeline-item[data-state="active"]')

    if (!startItem || timelineItems.length !== TIMELINE.length) {
      return false
    }

    startItem.dataset.state = this.stage === 'locked' ? 'active' : 'complete'
    this.syncStartSectionState(startItem)

    timelineItems.forEach((element, index) => {
      const timelineState = this.getTimelineState(index)
      element.dataset.state = timelineState

      const item = TIMELINE[index]
      if (item?.kind === 'set') {
        const isActiveSet = timelineState === 'active' && this.stage === 'set'

        const repValueEl = element.querySelector<HTMLElement>('.rep-value')
        if (repValueEl && isActiveSet) {
          const exercise = getExercise(item.exerciseIndex)
          repValueEl.textContent = exercise.name === 'Plank' ? `${this.repValue * 5} sec` : `${this.repValue} reps`
        }
      }

      if (item?.kind === 'rest') {
        const isActiveRest = timelineState === 'active' && (this.stage === 'rest' || this.stage === 'rest-paused')

        const countEl = element.querySelector<HTMLElement>('.stage-count--rest')
        if (countEl) {
          countEl.classList.toggle('is-visible', isActiveRest)
          countEl.textContent = isActiveRest ? this.formatClock(this.restRemainingSeconds) : this.formatClock(item.durationSeconds)
        }

        const primaryActionEl = element.querySelector<HTMLElement>('.rest-primary-action')
        if (primaryActionEl) {
          if (this.stage === 'rest') {
            primaryActionEl.dataset.action = 'pause-rest'
            primaryActionEl.textContent = 'Pause'
          } else {
            primaryActionEl.dataset.action = 'resume-rest'
            primaryActionEl.textContent = 'Resume'
          }
        }

        const progressEl = element.querySelector<HTMLElement>('.bar--vertical > span')
        if (progressEl) {
          const restRemainingPercent = isActiveRest
            ? `${(this.restRemainingSeconds / item.durationSeconds) * 100}%`
            : timelineState === 'complete'
              ? '0%'
              : '100%'
          progressEl.style.height = restRemainingPercent
        }
      }

      if (item?.kind === 'transition') {
        const isActiveTransition = timelineState === 'active' && (this.stage === 'transition' || this.stage === 'transition-paused')

        const countEl = element.querySelector<HTMLElement>('.stage-count--transition')
        if (countEl) {
          countEl.classList.toggle('is-visible', isActiveTransition)
          countEl.textContent = `${isActiveTransition ? this.nextExerciseRemainingSeconds : item.durationSeconds}`
        }

        const progressEl = element.querySelector<HTMLElement>('.bar--vertical--transition > span')
        if (progressEl) {
          const transitionRemainingPercent = isActiveTransition
            ? `${(this.nextExerciseRemainingSeconds / EXERCISE_TRANSITION_SECONDS) * 100}%`
            : timelineState === 'complete'
              ? '0%'
              : '100%'
          progressEl.style.height = transitionRemainingPercent
        }

        const primaryActionEl = element.querySelector<HTMLElement>('.transition-primary-action')
        if (primaryActionEl) {
          if (this.stage === 'transition') {
            primaryActionEl.dataset.action = 'stay-here'
            primaryActionEl.textContent = 'Stay Here'
          } else {
            primaryActionEl.dataset.action = 'next'
            primaryActionEl.textContent = 'Next'
          }
        }
      }
    })

    this.shadowRoot.querySelectorAll<HTMLElement>('.timeline-item[data-motion]').forEach((element) => {
      element.removeAttribute('data-motion')
    })

    const currentActive = this.shadowRoot.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
    if (previousActive && previousActive !== currentActive) {
      previousActive.dataset.motion = 'exiting'
    }
    if (currentActive) {
      currentActive.dataset.motion = 'entering'
    }

    this.scheduleMotionCleanup()

    return true
  }

  private transitionToCurrentActiveItem(): void {
    if (!this.patchTimelineStateInPlace()) {
      this.render()
      this.scrollActiveIntoView()
      return
    }

    this.scrollActiveIntoView('smooth')
  }

  private syncStartSectionState(startItem: HTMLElement): void {
    const startActions = startItem.querySelector<HTMLElement>('.start-actions')
    const startHint = startItem.querySelector<HTMLElement>('.start-hint')
    const isLocked = this.stage === 'locked'

    startActions?.classList.toggle('is-visible', isLocked)
    startHint?.classList.toggle('is-visible', !isLocked)
  }

  private syncActiveSetRepValue(): void {
    const currentItem = this.currentItem()
    if (!currentItem || currentItem.kind !== 'set') {
      return
    }

    const activeSetValue = this.shadowRoot?.querySelector<HTMLElement>('.timeline-item--set[data-state="active"] .rep-value')
    if (!activeSetValue) {
      return
    }

    const exercise = getExercise(currentItem.exerciseIndex)
    activeSetValue.textContent = exercise.name === 'Plank' ? `${this.repValue * 5} sec` : `${this.repValue} reps`
  }

  private syncOverallProgress(): void {
    const fill = this.shadowRoot?.querySelector<HTMLElement>('.overall-progress__fill')
    if (!fill) {
      return
    }

    const totalSetCount = this.getTotalSetCount()
    const completedSetCount = this.getCompletedSetCount()
    const overallProgressPercent = totalSetCount > 0 ? (completedSetCount / totalSetCount) * 100 : 0

    fill.style.height = `${overallProgressPercent}%`
    this.overallProgressVisualPercent = overallProgressPercent
  }

  private currentItem(): TimelineItem | null {
    return TIMELINE[this.activeTimelineIndex] ?? null
  }

  private scrollActiveIntoView(behavior: ScrollBehavior = 'smooth'): void {
    requestAnimationFrame(() => {
      const active = this.shadowRoot?.querySelector<HTMLElement>('.timeline-item[data-state="active"]')
      active?.scrollIntoView({ behavior, block: 'center' })
    })
  }

  private getTimelineState(index: number): 'future' | 'active' | 'complete' {
    if (this.stage === 'locked') {
      return 'future'
    }

    if (this.stage === 'workout-complete') {
      return 'complete'
    }

    if (index < this.activeTimelineIndex) {
      return 'complete'
    }

    if (index > this.activeTimelineIndex) {
      return 'future'
    }

    return 'active'
  }

  private formatClock(totalSeconds: number): string {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  private getCompletedSetCount(): number {
    return this.completedSetsByExercise.reduce((sum, value) => sum + value, 0)
  }

  private getTotalSetCount(): number {
    return EXERCISES.reduce((sum, exercise) => sum + exercise.totalSets, 0)
  }

  private updateLiveStageVisuals(): void {
    if (!this.shadowRoot) {
      return
    }

    if (this.stage === 'rest') {
      const restItem = this.currentItem()
      if (!restItem || restItem.kind !== 'rest') {
        return
      }

      const timer = this.shadowRoot.querySelector<HTMLElement>('.timeline-item--rest[data-state="active"] .stage-count--rest')
      const fill = this.shadowRoot.querySelector<HTMLElement>('.timeline-item--rest[data-state="active"] .bar--vertical > span')

      if (timer) {
        timer.textContent = this.formatClock(this.restRemainingSeconds)
      }

      if (fill) {
        const restRemainingPercent = Math.max(0, Math.min(100, (this.restRemainingSeconds / restItem.durationSeconds) * 100))
        fill.style.height = `${restRemainingPercent}%`
      }
      return
    }

    if (this.stage === 'transition') {
      const timer = this.shadowRoot.querySelector<HTMLElement>('.timeline-item--transition[data-state="active"] .stage-count--transition')
      const fill = this.shadowRoot.querySelector<HTMLElement>('.timeline-item--transition[data-state="active"] .bar--vertical--transition > span')

      if (timer) {
        timer.textContent = `${this.nextExerciseRemainingSeconds}`
      }

      if (fill) {
        const transitionRemainingPercent = `${(this.nextExerciseRemainingSeconds / EXERCISE_TRANSITION_SECONDS) * 100}%`
        fill.style.height = transitionRemainingPercent
      }
    }
  }

  private render(): void {
    if (!this.shadowRoot) {
      return
    }

    const currentItem = this.currentItem()
    const startState = this.stage === 'locked' ? 'active' : 'complete'
    const completedSetCount = this.getCompletedSetCount()
    const totalSetCount = this.getTotalSetCount()
    const overallProgressPercent = totalSetCount > 0 ? (completedSetCount / totalSetCount) * 100 : 0

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="prototype">
        <div class="overall-progress" aria-hidden="true">
          <div class="overall-progress__track">
            <span class="overall-progress__fill" style="height: ${this.overallProgressVisualPercent}%;"></span>
          </div>
        </div>
        <div class="stack is-dimmed">
          <section class="timeline-item timeline-item--start" data-state="${startState}">
            <h2 class="name">Ready?</h2>
            <div class="actions start-actions${this.stage === 'locked' ? ' is-visible' : ''}"><rrr-button data-action="go" type="button" tone="accent">GO</rrr-button></div>
            <div class="hint start-hint${this.stage === 'locked' ? '' : ' is-visible'}">Workout flow is running. Active section is centered when possible.</div>
          </section>

          ${TIMELINE.map((item, index) => {
            const state = this.getTimelineState(index)
            const exercise = getExercise(item.exerciseIndex)
            const isActive = state === 'active'

            if (item.kind === 'set') {
              const repDisplay = exercise.name === 'Plank' ? `${this.repValue * 5} sec` : `${this.repValue} reps`
              return `
                <section class="timeline-item timeline-item--set" data-state="${state}">
                  <div class="set-header">
                    <h2 class="name"><span class="name-prefix">Doing&nbsp;</span><span class="name-text">${exercise.name}</span></h2>
                    <span class="set-count">${item.setNumber} / ${exercise.totalSets}</span>
                  </div>
                  <div class="set-detail">
                    <div class="set-detail__inner">
                      <div class="last-time">Previously: ${exercise.previousPerformance}</div>
                      <div class="rep-row">
                        <rrr-button type="button" variant="outline" data-action="rep-minus" aria-label="decrease reps">-</rrr-button>
                        <div class="rep-value">${repDisplay}</div>
                        <rrr-button type="button" variant="outline" data-action="rep-plus" aria-label="increase reps">+</rrr-button>
                      </div>
                      <div class="actions"><rrr-button type="button" data-action="done-set">Done</rrr-button></div>
                    </div>
                  </div>
                </section>
              `
            }

            if (item.kind === 'rest') {
              const isActiveRest = isActive && (this.stage === 'rest' || this.stage === 'rest-paused')
              const isCompletedRest = state === 'complete'
              const restRemainingPercent = isActiveRest
                ? Math.max(0, Math.min(100, (this.restRemainingSeconds / item.durationSeconds) * 100))
                : isCompletedRest
                  ? 0
                  : 100
              const restDisplayTime = isActiveRest ? this.formatClock(this.restRemainingSeconds) : this.formatClock(item.durationSeconds)
              return `
                <section class="timeline-item timeline-item--rest" data-state="${state}">
                  <div class="countdown countdown--vertical" aria-hidden="true">
                    <div class="bar bar--vertical"><span style="height: ${restRemainingPercent}%;"></span></div>
                  </div>
                  <div class="rest-header">
                    <div class="rest-title"><rrr-icon name="water-bottle"></rrr-icon>Rest</div>
                    <span class="stage-count stage-count--rest${isActiveRest ? ' is-visible' : ''}">${restDisplayTime}</span>
                  </div>
                  <div class="rest-detail">
                    <div class="rest-detail__inner">
                      <div class="actions">
                        <rrr-button type="button" variant="secondary" tone="accent" data-action="${this.stage === 'rest' ? 'pause-rest' : 'resume-rest'}" class="rest-primary-action">${this.stage === 'rest' ? 'Pause' : 'Resume'}</rrr-button>
                        <rrr-button type="button" variant="outline" tone="accent" data-action="skip-rest">Skip Rest</rrr-button>
                      </div>
                    </div>
                  </div>
                </section>
              `
            }

            const nextExercise = EXERCISES[item.exerciseIndex + 1]
            const isActiveTransition = isActive && (this.stage === 'transition' || this.stage === 'transition-paused')
            const transitionDisplayTime = isActiveTransition ? this.nextExerciseRemainingSeconds : item.durationSeconds
            const transitionRemainingPercent = isActiveTransition
              ? Math.max(0, Math.min(100, (this.nextExerciseRemainingSeconds / item.durationSeconds) * 100))
              : state === 'complete'
                ? 0
                : 100
            const transitionPrimaryLabel = this.stage === 'transition' ? 'Stay Here' : 'Next'
            const transitionPrimaryAction = this.stage === 'transition' ? 'stay-here' : 'next'
            return `
              <section class="timeline-item timeline-item--transition" data-state="${state}">
                <div class="countdown countdown--vertical" aria-hidden="true">
                  <div class="bar bar--vertical bar--vertical--transition"><span style="height: ${transitionRemainingPercent}%;"></span></div>
                </div>
                <div class="rest-header">
                  <div class="rest-title">Time to switch to: ${nextExercise ? nextExercise.name : 'Workout complete'}</div>
                  <span class="stage-count stage-count--transition${isActiveTransition ? ' is-visible' : ''}">${transitionDisplayTime}</span>
                </div>
                <div class="transition-detail transition-detail--actions">
                  <div class="transition-detail__inner">
                    <div class="actions">
                      <rrr-button type="button" variant="secondary" tone="accent" data-action="${transitionPrimaryAction}" class="transition-primary-action">${transitionPrimaryLabel}</rrr-button>
                      <rrr-button type="button" variant="outline" tone="accent" data-action="next-now">Next Now</rrr-button>
                    </div>
                  </div>
                </div>
              </section>
            `
          }).join('')}

          ${this.stage === 'workout-complete'
            ? `
              <section class="complete">
                <h2 class="name">Workout complete</h2>
                <div class="hint">Logged sets: ${completedSetCount}</div>
                <div class="hint">Prototype success condition: you should feel guided without extra taps.</div>
              </section>
            `
            : ''}
        </div>
      </section>
    `

    requestAnimationFrame(() => {
      const fill = this.shadowRoot?.querySelector<HTMLElement>('.overall-progress__fill')
      if (!fill) {
        return
      }

      // Set the target on the next frame so the initial inline height is painted first.
      requestAnimationFrame(() => {
        fill.style.height = `${overallProgressPercent}%`
        this.overallProgressVisualPercent = overallProgressPercent
      })
    })
  }
}

customElements.define('rrr-workout-logging-prototype', RrrWorkoutLoggingPrototype)