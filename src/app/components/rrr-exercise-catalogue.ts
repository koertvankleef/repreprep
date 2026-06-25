import { filterExercises, isExerciseUsedInRoutines, searchExercises, type ExerciseFilters } from '../../domain/exercise-service.ts'
import type { AppData, Equipment, ExerciseDefinition, MeasurementProfile, MeasurementType, Muscle } from '../../domain/types.ts'
import { t } from '../../i18n/index.ts'
import { FocusedSequenceController, type FocusSequenceState } from '../focused-sequence-controller.ts'
import { storageService } from '../storage-instance.ts'
import styles from './rrr-exercise-catalogue.css?inline'

const VISIBLE_RADIUS = 4
const WHEEL_ITEM_SIZE = 260
const MAX_WHEEL_DELTA_ITEMS = 1.15
const TOUCH_ITEM_SIZE = 155
const BOUNDARY_RELEASE_OFFSET = 0.42
const FOCUS_SLOT_STEP_REM = 13.75
const COMPACT_SLOT_STEP_REM = 6.8

export class RrrExerciseCatalogue extends HTMLElement {
  private readonly focusSequence = new FocusedSequenceController<ExerciseDefinition>(() => this.prefersReducedMotion())
  private searchQueryValue = ''
  private filtersValue: ExerciseFilters = { categories: [], equipment: [] }
  private focusedExerciseId: string | null = null
  private sequenceState = this.focusSequence.state
  private isRendering = false
  private wheelSnapTimeout = 0
  private touchLastY: number | null = null
  private touchMoved = false
  private unsubscribeState: (() => void) | null = null
  private unsubscribeFocus: (() => void) | null = null

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  private readonly handleSequenceStateChanged = (state: FocusSequenceState<ExerciseDefinition>): void => {
    this.sequenceState = state

    if (!this.isRendering) {
      this.renderBrowser()
    }
  }

  private readonly handleSequenceFocusChanged = (event: { item: ExerciseDefinition }): void => {
    this.focusedExerciseId = event.item.id
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const openButton = (event.target as Element | null)?.closest('[data-action="open-exercise"]')

    if (openButton) {
      this.openFocusedExercise()
      return
    }

    const itemButton = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-action="focus-exercise"]')

    if (!itemButton) {
      return
    }

    const index = Number(itemButton.dataset.index)

    if (!Number.isInteger(index)) {
      return
    }

    if (index === this.sequenceState.focusedIndex) {
      this.openFocusedExercise()
      return
    }

    this.focusSequence.setFocusedIndex(index, {
      animate: true,
      reason: 'programmatic',
    })
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const browser = (event.target as Element | null)?.closest('[data-exercise-browser]')

    if (!browser || this.sequenceState.items.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.focusSequence.focusNext({ animate: true, reason: 'keyboard' })
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.focusSequence.focusPrevious({ animate: true, reason: 'keyboard' })
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      this.focusSequence.setFocusedIndex(0, { animate: true, reason: 'keyboard' })
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      this.focusSequence.setFocusedIndex(this.sequenceState.items.length - 1, { animate: true, reason: 'keyboard' })
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && event.target === browser) {
      event.preventDefault()
      this.openFocusedExercise()
    }
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    const browser = (event.target as Element | null)?.closest('[data-exercise-browser]')

    if (!browser || this.sequenceState.items.length < 2) {
      return
    }

    const deltaItems = clamp(
      normalizeWheelDelta(event) / WHEEL_ITEM_SIZE,
      -MAX_WHEEL_DELTA_ITEMS,
      MAX_WHEEL_DELTA_ITEMS,
    )

    if (Math.abs(deltaItems) < 0.01) {
      return
    }

    if (this.focusSequence.boundaryOverflow(deltaItems) > BOUNDARY_RELEASE_OFFSET) {
      this.scheduleSnap('wheel')
      return
    }

    event.preventDefault()
    this.focusSequence.applyGestureDelta(deltaItems, 'wheel')
    this.scheduleSnap('wheel')
  }

  private readonly handleTouchStart = (event: TouchEvent): void => {
    const browser = (event.target as Element | null)?.closest('[data-exercise-browser]')
    const touch = event.touches.item(0)

    if (!browser || !touch || this.sequenceState.items.length < 2) {
      return
    }

    this.touchLastY = touch.clientY
    this.touchMoved = false
  }

  private readonly handleTouchMove = (event: TouchEvent): void => {
    if (this.touchLastY === null) {
      return
    }

    const browser = (event.target as Element | null)?.closest('[data-exercise-browser]')
    const touch = event.touches.item(0)

    if (!browser || !touch) {
      return
    }

    const deltaItems = (this.touchLastY - touch.clientY) / TOUCH_ITEM_SIZE
    this.touchLastY = touch.clientY

    if (Math.abs(deltaItems) < 0.005) {
      return
    }

    if (this.focusSequence.boundaryOverflow(deltaItems) > BOUNDARY_RELEASE_OFFSET) {
      this.endTouchGesture()
      return
    }

    event.preventDefault()
    this.touchMoved = true
    this.focusSequence.applyGestureDelta(deltaItems, 'gesture')
  }

  private readonly handleTouchEnd = (): void => {
    this.endTouchGesture()
  }

  set searchQuery(value: string) {
    this.setSearchAndFilters(value, this.filtersValue)
  }

  get searchQuery(): string {
    return this.searchQueryValue
  }

  set filters(value: ExerciseFilters) {
    this.setSearchAndFilters(this.searchQueryValue, value)
  }

  get filters(): ExerciseFilters {
    return {
      categories: [...this.filtersValue.categories],
      equipment: [...this.filtersValue.equipment],
    }
  }

  setSearchAndFilters(searchQuery: string, filters: ExerciseFilters): void {
    this.searchQueryValue = searchQuery
    this.filtersValue = {
      categories: [...filters.categories],
      equipment: [...filters.equipment],
    }
    this.render()
  }

  connectedCallback(): void {
    window.addEventListener('rrr-data-changed', this.handleDataChanged)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('keydown', this.handleKeyDown)
    this.addEventListener('wheel', this.handleWheel, { passive: false })
    this.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    this.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    this.addEventListener('touchend', this.handleTouchEnd)
    this.addEventListener('touchcancel', this.handleTouchEnd)
    this.unsubscribeState = this.focusSequence.onStateChange(this.handleSequenceStateChanged)
    this.unsubscribeFocus = this.focusSequence.onFocusChange(this.handleSequenceFocusChanged)
    this.render()
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('keydown', this.handleKeyDown)
    this.removeEventListener('wheel', this.handleWheel)
    this.removeEventListener('touchstart', this.handleTouchStart)
    this.removeEventListener('touchmove', this.handleTouchMove)
    this.removeEventListener('touchend', this.handleTouchEnd)
    this.removeEventListener('touchcancel', this.handleTouchEnd)
    window.clearTimeout(this.wheelSnapTimeout)
    this.unsubscribeState?.()
    this.unsubscribeFocus?.()
    this.unsubscribeState = null
    this.unsubscribeFocus = null
  }

  private getFilteredExercises(): ExerciseDefinition[] {
    const data = storageService.getData()

    return filterExercises(
      searchExercises(
        data.exercises.filter((exercise) => !exercise.archived),
        this.searchQueryValue,
      ),
      this.filtersValue,
    )
      .sort(compareExerciseNames)
  }

  private syncFocusedSequence(exercises: ExerciseDefinition[]): void {
    const currentFocusedId = this.focusedExerciseId ?? this.sequenceState.items[this.sequenceState.focusedIndex]?.id ?? null
    const focusedIndex = currentFocusedId
      ? exercises.findIndex((exercise) => exercise.id === currentFocusedId)
      : 0
    const nextFocusedIndex = focusedIndex === -1 ? 0 : focusedIndex

    this.focusSequence.setItems(exercises, {
      focusedIndex: nextFocusedIndex,
      animate: false,
      reason: currentFocusedId ? 'filter' : 'initial',
    })

    this.focusedExerciseId = exercises[nextFocusedIndex]?.id ?? null
  }

  private renderList(): string {
    const data = storageService.getData()
    const state = this.sequenceState

    if (state.items.length === 0) {
      return `
        <div class="exercise-browser-empty" data-result-count="0">
          <p>${t('exercise.list.empty')}</p>
        </div>
      `
    }

    const startIndex = Math.max(0, Math.floor(state.visualPosition) - VISIBLE_RADIUS)
    const endIndex = Math.min(state.items.length - 1, Math.ceil(state.visualPosition) + VISIBLE_RADIUS)
    const visibleItems = state.items.slice(startIndex, endIndex + 1)

    return `
      <div
        class="exercise-browser"
        data-exercise-browser
        data-result-count="${state.items.length}"
        role="listbox"
        tabindex="0"
        aria-label="${escapeHtml(t('exercise.browser.label'))}"
        aria-activedescendant="exercise-browser-item-${escapeHtml(state.items[state.focusedIndex]?.id ?? '')}"
      >
        <div class="exercise-browser-track" style="--visual-position: ${formatCssNumber(state.visualPosition)};">
          ${visibleItems.map((exercise, offset) => this.renderExerciseItem(exercise, data, startIndex + offset)).join('')}
        </div>
      </div>
    `
  }

  private renderExerciseItem(
    exercise: ExerciseDefinition,
    data: AppData,
    index: number,
  ): string {
    const used = isExerciseUsedInRoutines(data, exercise.id)
    const sectionTitle = getExerciseSectionTitle(exercise.name)
    const previousTitle = index > 0 ? getExerciseSectionTitle(this.sequenceState.items[index - 1]?.name ?? '') : null
    const marker = sectionTitle !== previousTitle
      ? `<span class="exercise-browser-marker" aria-hidden="true">${escapeHtml(sectionTitle)}</span>`
      : ''

    return `
      <button
        id="exercise-browser-item-${escapeHtml(exercise.id)}"
        class="exercise-browser-item"
        style="${this.getItemStyle(index, this.sequenceState)}"
        type="button"
        role="option"
        aria-selected="${index === this.sequenceState.focusedIndex ? 'true' : 'false'}"
        aria-current="${index === this.sequenceState.focusedIndex ? 'true' : 'false'}"
        data-action="focus-exercise"
        data-exercise-id="${escapeHtml(exercise.id)}"
        data-focused="${index === this.sequenceState.focusedIndex ? 'true' : 'false'}"
        data-interactive="${this.isItemInteractive(index, this.sequenceState) ? 'true' : 'false'}"
        data-index="${index}"
      >
        ${marker}
        ${this.renderExerciseContent(exercise, used)}
      </button>
    `
  }

  private renderExerciseContent(exercise: ExerciseDefinition, used: boolean): string {
    return `
      <span class="exercise-browser-main">
        <span class="exercise-browser-heading">
          <span class="exercise-browser-name">${escapeHtml(exercise.name)}</span>
          ${exercise.createdByUser ? `<rrr-badge tone="accent">${t('exercise.badge.custom')}</rrr-badge>` : ''}
          ${used ? `<rrr-badge class="exercise-browser-used-badge">${t('exercise.badge.used')}</rrr-badge>` : ''}
        </span>
        <span class="exercise-browser-meta">${escapeHtml(this.renderExerciseMeta(exercise))}</span>
        <span class="exercise-browser-cue">${escapeHtml(getMovementCue(exercise.description))}</span>
      </span>
      ${this.renderFocusedDetails(exercise)}
    `
  }

  private renderFocusedDetails(exercise: ExerciseDefinition): string {
    return `
      <span class="exercise-browser-preview">
        <span class="exercise-browser-description">${escapeHtml(getPreviewDescription(exercise.description))}</span>
        ${exercise.aliases.length > 0 ? `
          <span class="exercise-browser-detail-line">
            <span class="exercise-browser-detail-label">${t('exercise.detail.aliases')}</span>
            <span>${escapeHtml(exercise.aliases.join(', '))}</span>
          </span>
        ` : ''}
        <span class="exercise-browser-profile-list">
          ${exercise.measurementProfiles.map((profile) => this.renderMeasurementProfile(profile)).join('')}
        </span>
        <span class="exercise-browser-open" data-action="open-exercise">${t('exercise.browser.openDetails')}</span>
      </span>
    `
  }

  private renderMeasurementProfile(profile: MeasurementProfile): string {
    return `
      <span class="exercise-browser-profile">
        ${profile.map((type) => `<rrr-badge>${escapeHtml(getMeasurementTypeLabel(type))}</rrr-badge>`).join('')}
      </span>
    `
  }

  private renderExerciseMeta(exercise: ExerciseDefinition): string {
    const muscleText = exercise.primaryMuscles.length > 0
      ? exercise.primaryMuscles.map(getMuscleLabel).join(', ')
      : t('exercise.detail.none')
    const equipmentText = exercise.equipment.length > 0
      ? exercise.equipment.map(getEquipmentLabel).join(', ')
      : t('exercise.detail.none')

    return `${muscleText} • ${equipmentText}`
  }

  private renderBrowser(): void {
    const list = this.querySelector<HTMLElement>('[data-list="active"]')

    if (!list) {
      return
    }

    const root = this.getRootNode() as Document | ShadowRoot
    const activeElement = root.activeElement
    const shouldRestoreBrowserFocus = activeElement instanceof Element
      && Boolean(activeElement.closest('[data-exercise-browser], [data-action="focus-exercise"]'))

    list.innerHTML = this.renderList()

    if (shouldRestoreBrowserFocus) {
      this.querySelector<HTMLElement>('[data-exercise-browser]')?.focus({ preventScroll: true })
    }
  }

  private getItemStyle(index: number, state: FocusSequenceState<ExerciseDefinition>): string {
    const distance = index - state.visualPosition
    const absoluteDistance = Math.abs(distance)
    const focusAmount = Math.max(0, 1 - absoluteDistance)
    const nearAmount = Math.max(0, 1 - absoluteDistance / 3)
    const slotDistance = getSlotDistanceRem(distance)
    const zIndex = Math.max(1, 20 - Math.round(absoluteDistance * 3))

    return [
      `--distance: ${formatCssNumber(distance)}`,
      `--abs-distance: ${formatCssNumber(absoluteDistance)}`,
      `--focus-amount: ${formatCssNumber(focusAmount)}`,
      `--near-amount: ${formatCssNumber(nearAmount)}`,
      `--slot-distance: ${formatCssNumber(slotDistance)}rem`,
      `--item-z-index: ${zIndex}`,
    ].join('; ')
  }

  private isItemInteractive(index: number, state: FocusSequenceState<ExerciseDefinition>): boolean {
    return Math.abs(index - state.visualPosition) <= 2.35
  }

  private scheduleSnap(reason: 'gesture' | 'wheel'): void {
    window.clearTimeout(this.wheelSnapTimeout)
    this.wheelSnapTimeout = window.setTimeout(() => {
      this.focusSequence.snapToFocused({ animate: true, reason })
    }, reason === 'wheel' ? 130 : 0)
  }

  private endTouchGesture(): void {
    if (this.touchLastY !== null || this.touchMoved) {
      this.focusSequence.snapToFocused({ animate: true, reason: 'gesture' })
    }

    this.touchLastY = null
    this.touchMoved = false
  }

  private openFocusedExercise(): void {
    const exercise = this.sequenceState.items[this.sequenceState.focusedIndex]

    if (!exercise) {
      return
    }

    window.location.hash = `#/exercises/${encodeURIComponent(exercise.id)}`
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  private render(): void {
    const addExerciseLabel = escapeHtml(t('exercise.form.add'))
    const exercises = this.getFilteredExercises()

    this.isRendering = true
    this.syncFocusedSequence(exercises)

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <div class="list" data-list="active">
          ${this.renderList()}
        </div>
        <rrr-button
          type="button"
          tone="accent"
          rounded
          data-action="new-exercise"
          aria-label="${addExerciseLabel}"
          title="${addExerciseLabel}"
        ><rrr-icon name="add"></rrr-icon></rrr-button>
      </section>
    `

    this.isRendering = false
  }
}

function compareExerciseNames(left: ExerciseDefinition, right: ExerciseDefinition): number {
  return left.name.localeCompare(right.name)
}

function getExerciseSectionTitle(name: string): string {
  const firstCharacter = normalizeSectionCharacter(name.trim().charAt(0))

  if (!firstCharacter) {
    return '?!'
  }

  if (/^\d$/.test(firstCharacter)) {
    return '#'
  }

  if (/^[A-Z]$/.test(firstCharacter)) {
    return firstCharacter
  }

  return '?!'
}

function normalizeSectionCharacter(character: string): string {
  return character
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase()
}

function getMovementCue(description: string): string {
  const normalized = normalizeDescription(description)

  if (!normalized) {
    return t('exercise.browser.noDescription')
  }

  const firstSentence = normalized.match(/^.+?[.!?](?:\s|$)/)?.[0]?.trim() ?? normalized

  return truncateText(firstSentence, 132)
}

function getPreviewDescription(description: string): string {
  const normalized = normalizeDescription(description)

  if (!normalized) {
    return t('exercise.browser.noDescription')
  }

  return truncateText(normalized, 360)
}

function normalizeDescription(description: string): string {
  return description.replace(/\s+/g, ' ').trim()
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  const truncated = text.slice(0, maxLength - 1).trimEnd()

  return `${truncated}...`
}

function getEquipmentLabel(equipment: Equipment): string {
  return t(`exercise.equipment.${equipment}`)
}

function getMuscleLabel(muscle: Muscle): string {
  return t(`exercise.muscle.${muscle}`)
}

function getMeasurementTypeLabel(type: MeasurementType): string {
  return t(`exercise.measurement.${type}`)
}

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight
  }

  return event.deltaY
}

function formatCssNumber(value: number): string {
  return value.toFixed(4)
}

function getSlotDistanceRem(distance: number): number {
  const absoluteDistance = Math.abs(distance)
  const direction = Math.sign(distance)

  if (absoluteDistance <= 1) {
    return distance * FOCUS_SLOT_STEP_REM
  }

  return direction * (FOCUS_SLOT_STEP_REM + (absoluteDistance - 1) * COMPACT_SLOT_STEP_REM)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
