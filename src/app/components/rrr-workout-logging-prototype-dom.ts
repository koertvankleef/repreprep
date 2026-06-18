import type {
  TimelineItem,
  TimelineState,
} from './rrr-workout-logging-prototype-model.ts'

export type SetTimelineItemDomAdapter = {
  kind: 'set'
  element: HTMLElement
  repValueEl: HTMLElement | null
  minusButton: HTMLButtonElement | null
  plusButton: HTMLButtonElement | null
  confirmButton: HTMLButtonElement | null
  startRestNowButton: HTMLButtonElement | null
  debounceHint: HTMLElement | null
  graceHint: HTMLElement | null
  timedMainGroup: HTMLElement | null
  timedGraceGroup: HTMLElement | null
  timedStartButton: HTMLButtonElement | null
  timedStopButton: HTMLButtonElement | null
  timedEditButton: HTMLButtonElement | null
  timedStartRestNowButton: HTMLButtonElement | null
  timedCountEl: HTMLElement | null
  graceCountdownValueEl: HTMLElement | null
  graceSummaryEl: HTMLElement | null
  debounceCountdownValueEl: HTMLElement | null
}

export type RestTimelineItemDomAdapter = {
  kind: 'rest'
  element: HTMLElement
  countEl: HTMLElement | null
  primaryActionEl: HTMLElement | null
  progressEl: HTMLElement | null
}

export type TransitionTimelineItemDomAdapter = {
  kind: 'transition'
  element: HTMLElement
  countEl: HTMLElement | null
  primaryActionEl: HTMLElement | null
  progressEl: HTMLElement | null
}

export type TimelineItemDomAdapter =
  | SetTimelineItemDomAdapter
  | RestTimelineItemDomAdapter
  | TransitionTimelineItemDomAdapter

export function createTimelineItemDomAdapter(item: TimelineItem, element: HTMLElement): TimelineItemDomAdapter {
  if (item.kind === 'set') {
    return {
      kind: 'set',
      element,
      repValueEl: element.querySelector<HTMLElement>('.rep-value'),
      minusButton: element.querySelector<HTMLButtonElement>('[data-action="rep-minus"]'),
      plusButton: element.querySelector<HTMLButtonElement>('[data-action="rep-plus"]'),
      confirmButton: element.querySelector<HTMLButtonElement>('.rep-confirm-action'),
      startRestNowButton: element.querySelector<HTMLButtonElement>('.rep-start-rest-now-action'),
      debounceHint: element.querySelector<HTMLElement>('.rep-debounce-hint'),
      graceHint: element.querySelector<HTMLElement>('.rep-grace-hint'),
      timedMainGroup: element.querySelector<HTMLElement>('.timed-main-group'),
      timedGraceGroup: element.querySelector<HTMLElement>('.timed-grace-group'),
      timedStartButton: element.querySelector<HTMLButtonElement>('.timed-start-action'),
      timedStopButton: element.querySelector<HTMLButtonElement>('.timed-stop-action'),
      timedEditButton: element.querySelector<HTMLButtonElement>('.timed-edit-grace-action'),
      timedStartRestNowButton: element.querySelector<HTMLButtonElement>('.timed-start-rest-now-action'),
      timedCountEl: element.querySelector<HTMLElement>('.timed-count-value'),
      graceCountdownValueEl: element.querySelector<HTMLElement>('.grace-countdown-value'),
      graceSummaryEl: element.querySelector<HTMLElement>('.grace-summary'),
      debounceCountdownValueEl: element.querySelector<HTMLElement>('.debounce-countdown-value'),
    }
  }

  if (item.kind === 'rest') {
    return {
      kind: 'rest',
      element,
      countEl: element.querySelector<HTMLElement>('.stage-count--rest'),
      primaryActionEl: element.querySelector<HTMLElement>('.rest-primary-action'),
      progressEl: element.querySelector<HTMLElement>('.bar--vertical > span'),
    }
  }

  return {
    kind: 'transition',
    element,
    countEl: element.querySelector<HTMLElement>('.stage-count--transition'),
    primaryActionEl: element.querySelector<HTMLElement>('.transition-primary-action'),
    progressEl: element.querySelector<HTMLElement>('.bar--vertical--transition > span'),
  }
}

export function syncTimelineItemState(element: HTMLElement, timelineState: TimelineState): void {
  element.dataset.state = timelineState
  if (timelineState === 'active') {
    element.setAttribute('aria-current', 'step')
    return
  }

  element.removeAttribute('aria-current')
}
