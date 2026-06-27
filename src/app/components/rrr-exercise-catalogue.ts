import { filterExercises, isExerciseUsedInRoutines, searchExercises, type ExerciseFilters } from '../../domain/exercise-service.ts'
import type { AppData, Equipment, ExerciseDefinition, MeasurementProfile, MeasurementType, Muscle } from '../../domain/types.ts'
import { t } from '../../i18n/index.ts'
import { FocusedSequenceController, type FocusSequenceState } from '../focused-sequence-controller.ts'
import { storageService } from '../storage-instance.ts'
import styles from './rrr-exercise-catalogue.css?inline'

const VISIBLE_RADIUS = 4
const SCROLL_PIXELS_PER_ITEM = 120
const FOCUS_SLOT_STEP_REM = 13.75
const COMPACT_SLOT_STEP_REM = 6.8
const COMPACT_ITEM_HEIGHT_REM = 5.25
const FOCUSED_ITEM_HEIGHT_REM = 15.5
const FOCUS_VISUAL_DEAD_ZONE = 0.04

export class RrrExerciseCatalogue extends HTMLElement {
  private readonly focusSequence = new FocusedSequenceController<ExerciseDefinition>(() => this.prefersReducedMotion())
  private searchQueryValue = ''
  private filtersValue: ExerciseFilters = { categories: [], equipment: [] }
  private focusedExerciseId: string | null = null
  private sequenceState = this.focusSequence.state
  private isRendering = false
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

    this.scrollToIndex(index)
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const browser = (event.target as Element | null)?.closest('[data-exercise-scroll]')

    if (!browser || this.sequenceState.items.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.scrollToIndex(this.sequenceState.focusedIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.scrollToIndex(this.sequenceState.focusedIndex - 1)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      this.scrollToIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      this.scrollToIndex(this.sequenceState.items.length - 1)
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && event.target === browser) {
      event.preventDefault()
      this.openFocusedExercise()
    }
  }

  private readonly handleScroll = (event: Event): void => {
    const scrollProxy = event.target

    if (!(scrollProxy instanceof HTMLElement) || !scrollProxy.matches('[data-exercise-scroll]')) {
      return
    }

    this.focusSequence.setVisualPosition(scrollProxy.scrollTop / SCROLL_PIXELS_PER_ITEM, 'scroll')
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
    this.addEventListener('scroll', this.handleScroll, true)
    this.unsubscribeState = this.focusSequence.onStateChange(this.handleSequenceStateChanged)
    this.unsubscribeFocus = this.focusSequence.onFocusChange(this.handleSequenceFocusChanged)
    this.render()
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      this.syncScrollProxyToState()
    })
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('keydown', this.handleKeyDown)
    this.removeEventListener('scroll', this.handleScroll, true)
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

    const scrollRange = (state.items.length - 1) * SCROLL_PIXELS_PER_ITEM

    return `
      <div
        class="exercise-browser-scroll"
        data-exercise-scroll
        data-result-count="${state.items.length}"
        role="listbox"
        tabindex="0"
        aria-label="${escapeHtml(t('exercise.browser.label'))}"
        aria-activedescendant="exercise-browser-item-${escapeHtml(state.items[state.focusedIndex]?.id ?? '')}"
      >
        <div class="exercise-browser-presentation" data-browser-presentation>
          ${this.renderBrowserPresentation(data, state)}
        </div>
        <div class="exercise-browser-scroll-spacer" style="block-size: ${scrollRange}px;" aria-hidden="true"></div>
      </div>
    `
  }

  private renderBrowserPresentation(data: AppData, state: FocusSequenceState<ExerciseDefinition>): string {
    const startIndex = Math.max(0, Math.floor(state.visualPosition) - VISIBLE_RADIUS)
    const endIndex = Math.min(state.items.length - 1, Math.ceil(state.visualPosition) + VISIBLE_RADIUS)
    const visibleItems = state.items.slice(startIndex, endIndex + 1)

    return `
      <div
        class="exercise-browser"
        data-exercise-browser
      >
        <div
          class="exercise-browser-track"
          style="
            --visual-position: ${formatCssNumber(state.visualPosition)};
            --focus-anchor: ${formatCssNumber(getFocusAnchorPercent(state.visualPosition, state.items.length))}%;
          "
        >
          ${visibleItems.map((exercise, offset) => this.renderExerciseBoundaryAndItem(
            exercise,
            data,
            startIndex + offset,
            startIndex,
            endIndex,
          )).join('')}
        </div>
      </div>
    `
  }

  private renderExerciseBoundaryAndItem(
    exercise: ExerciseDefinition,
    data: AppData,
    index: number,
    startIndex: number,
    endIndex: number,
  ): string {
    return `${this.renderBoundaryMarker(exercise, index, startIndex, endIndex)}${this.renderExerciseItem(exercise, data, index)}`
  }

  private renderBoundaryMarker(
    exercise: ExerciseDefinition,
    index: number,
    startIndex: number,
    endIndex: number,
  ): string {
    const sectionTitle = getExerciseSectionTitle(exercise.name)
    const previousTitle = index > 0 ? getExerciseSectionTitle(this.sequenceState.items[index - 1]?.name ?? '') : null
    const startsSection = index === 0 || sectionTitle !== previousTitle
    const boundaryIsInsideRenderedRange = index === 0 || (index - 1 >= startIndex && index <= endIndex)

    if (!startsSection || !boundaryIsInsideRenderedRange) {
      return ''
    }

    return `
      <span
        class="exercise-browser-marker"
        style="${this.getMarkerStyle(index)}"
        aria-hidden="true"
      >${escapeHtml(sectionTitle)}</span>
    `
  }

  private renderExerciseItem(
    exercise: ExerciseDefinition,
    data: AppData,
    index: number,
  ): string {
    const used = isExerciseUsedInRoutines(data, exercise.id)

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
    const scrollProxy = list.querySelector<HTMLElement>('[data-exercise-scroll]')
    const presentation = list.querySelector<HTMLElement>('[data-browser-presentation]')

    if (!scrollProxy || !presentation) {
      list.innerHTML = this.renderList()
      this.syncScrollProxyToState()
      return
    }

    scrollProxy.setAttribute(
      'aria-activedescendant',
      `exercise-browser-item-${this.sequenceState.items[this.sequenceState.focusedIndex]?.id ?? ''}`,
    )
    presentation.innerHTML = this.renderBrowserPresentation(storageService.getData(), this.sequenceState)

    if (shouldRestoreBrowserFocus) {
      scrollProxy.focus({ preventScroll: true })
    }
  }

  private getItemStyle(index: number, state: FocusSequenceState<ExerciseDefinition>): string {
    const distance = index - state.visualPosition
    const absoluteDistance = Math.abs(distance)
    const focusAmount = getVisualFocusAmount(absoluteDistance)
    const nearAmount = Math.max(0, 1 - absoluteDistance / 3)
    const slotDistance = getSlotDistanceRem(distance)
    const zIndex = Math.max(1, 20 - Math.round(absoluteDistance * 3))
    const itemHeight = COMPACT_ITEM_HEIGHT_REM + (FOCUSED_ITEM_HEIGHT_REM - COMPACT_ITEM_HEIGHT_REM) * focusAmount
    const previewMaxHeight = 10 * focusAmount
    const paddingBlock = 0.55 + 0.7 * focusAmount

    return [
      `--distance: ${formatCssNumber(distance)}`,
      `--abs-distance: ${formatCssNumber(absoluteDistance)}`,
      `--focus-amount: ${formatCssNumber(focusAmount)}`,
      `--near-amount: ${formatCssNumber(nearAmount)}`,
      `--slot-distance: ${formatCssNumber(slotDistance)}rem`,
      `--item-z-index: ${zIndex}`,
      `--item-height: ${formatCssNumber(itemHeight)}rem`,
      `--item-padding-block: ${formatCssNumber(paddingBlock)}rem`,
      `--preview-max-block-size: ${formatCssNumber(previewMaxHeight)}rem`,
      `--preview-opacity: ${formatCssNumber(focusAmount)}`,
    ].join('; ')
  }

  private getMarkerStyle(index: number): string {
    const markerPosition = index === 0 ? -0.52 : index - 0.5
    const distance = markerPosition - this.sequenceState.visualPosition
    const absoluteDistance = Math.abs(distance)
    const nearAmount = Math.max(0, 1 - absoluteDistance / 3)
    const slotDistance = getSlotDistanceRem(distance)
    const zIndex = Math.max(1, 18 - Math.round(absoluteDistance * 3))

    return [
      `--distance: ${formatCssNumber(distance)}`,
      `--abs-distance: ${formatCssNumber(absoluteDistance)}`,
      `--near-amount: ${formatCssNumber(nearAmount)}`,
      `--slot-distance: ${formatCssNumber(slotDistance)}rem`,
      `--item-z-index: ${zIndex}`,
    ].join('; ')
  }

  private isItemInteractive(index: number, state: FocusSequenceState<ExerciseDefinition>): boolean {
    return Math.abs(index - state.visualPosition) <= 2.35
  }

  private scrollToIndex(index: number): void {
    const scrollProxy = this.querySelector<HTMLElement>('[data-exercise-scroll]')

    if (!scrollProxy || this.sequenceState.items.length === 0) {
      return
    }

    const clampedIndex = clamp(index, 0, this.sequenceState.items.length - 1)
    const top = clampedIndex * SCROLL_PIXELS_PER_ITEM
    const behavior: ScrollBehavior = this.prefersReducedMotion() ? 'auto' : 'smooth'

    scrollProxy.scrollTo({ top, behavior })
  }

  private syncScrollProxyToState(): void {
    const scrollProxy = this.querySelector<HTMLElement>('[data-exercise-scroll]')

    if (!scrollProxy) {
      return
    }

    scrollProxy.scrollTop = this.sequenceState.visualPosition * SCROLL_PIXELS_PER_ITEM
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
    this.syncScrollProxyToState()
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

function formatCssNumber(value: number): string {
  return value.toFixed(4)
}

function getSlotDistanceRem(distance: number): number {
  const absoluteDistance = Math.abs(distance)
  const direction = Math.sign(distance)

  if (absoluteDistance <= 1) {
    return direction * FOCUS_SLOT_STEP_REM * Math.pow(absoluteDistance, 0.65)
  }

  return direction * (FOCUS_SLOT_STEP_REM + (absoluteDistance - 1) * COMPACT_SLOT_STEP_REM)
}

function getVisualFocusAmount(absoluteDistance: number): number {
  if (absoluteDistance <= FOCUS_VISUAL_DEAD_ZONE) {
    return 1
  }

  return Math.max(0, 1 - (absoluteDistance - FOCUS_VISUAL_DEAD_ZONE) / (1 - FOCUS_VISUAL_DEAD_ZONE))
}

function getFocusAnchorPercent(visualPosition: number, itemCount: number): number {
  if (itemCount <= 1) {
    return 50
  }

  const lastIndex = itemCount - 1
  const edgeRange = Math.min(3, lastIndex / 2)
  const edgeAnchor = itemCount === 2 ? 30 : itemCount === 3 ? 22 : 18

  if (visualPosition <= edgeRange) {
    return edgeAnchor + (50 - edgeAnchor) * clamp(visualPosition / edgeRange, 0, 1)
  }

  if (visualPosition >= lastIndex - edgeRange) {
    const edgeProgress = clamp((visualPosition - (lastIndex - edgeRange)) / edgeRange, 0, 1)

    return 50 + (50 - edgeAnchor) * edgeProgress
  }

  return 50
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
