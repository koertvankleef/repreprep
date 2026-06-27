import { filterExercises, isExerciseUsedInRoutines, searchExercises, type ExerciseFilters } from '../../domain/exercise-service.ts'
import type { AppData, Equipment, ExerciseDefinition, MeasurementProfile, MeasurementType, Muscle } from '../../domain/types.ts'
import { t } from '../../i18n/index.ts'
import { FocusedSequenceController, type FocusSequenceState } from '../focused-sequence-controller.ts'
import { storageService } from '../storage-instance.ts'
import styles from './rrr-exercise-catalogue.css?inline'

const VISIBLE_RADIUS = 4
const SCROLL_PIXELS_PER_ITEM = 120
const COMPACT_ITEM_HEIGHT_REM = 5.25
const FOCUSED_ITEM_HEIGHT_REM = 15.5
const FOCUS_VISUAL_DEAD_ZONE = 0.04
const SECTION_BOUNDARY_GAP_REM = 3.75
const SECTION_TITLE_LEADING_REM = 1.75

type ExerciseVisualLayout = {
  itemOffsets: Map<number, number>
  markerOffsets: Map<number, number>
}

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
    const visualLayout = createExerciseVisualLayout(state.items, state.visualPosition, startIndex, endIndex)

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
            visualLayout,
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
    visualLayout: ExerciseVisualLayout,
  ): string {
    return `${this.renderBoundaryMarker(exercise, index, startIndex, endIndex, visualLayout)}${this.renderExerciseItem(exercise, data, index, visualLayout)}`
  }

  private renderBoundaryMarker(
    exercise: ExerciseDefinition,
    index: number,
    startIndex: number,
    endIndex: number,
    visualLayout: ExerciseVisualLayout,
  ): string {
    const sectionTitle = getExerciseSectionTitle(exercise.name)
    const previousTitle = index > 0 ? getExerciseSectionTitle(this.sequenceState.items[index - 1]?.name ?? '') : null
    const startsSection = index === 0 || sectionTitle !== previousTitle
    const boundaryIsInsideRenderedRange = index === 0 || (index - 1 >= startIndex && index <= endIndex)

    if (!startsSection || !boundaryIsInsideRenderedRange) {
      return ''
    }

    return `
      <h2
        class="rrr-section-title exercise-browser-section-title"
        style="${this.getMarkerStyle(index, visualLayout)}"
        aria-hidden="true"
      >${escapeHtml(sectionTitle)}</h2>
    `
  }

  private renderExerciseItem(
    exercise: ExerciseDefinition,
    data: AppData,
    index: number,
    visualLayout: ExerciseVisualLayout,
  ): string {
    const used = isExerciseUsedInRoutines(data, exercise.id)
    const sectionTitle = getExerciseSectionTitle(exercise.name)
    const previousSectionTitle = index > 0 ? getExerciseSectionTitle(this.sequenceState.items[index - 1]?.name ?? '') : null
    const nextSectionTitle = index < this.sequenceState.items.length - 1
      ? getExerciseSectionTitle(this.sequenceState.items[index + 1]?.name ?? '')
      : null
    const isSectionFirst = index === 0 || sectionTitle !== previousSectionTitle
    const isSectionLast = index === this.sequenceState.items.length - 1 || sectionTitle !== nextSectionTitle

    return `
      <button
        id="exercise-browser-item-${escapeHtml(exercise.id)}"
        class="exercise-browser-item"
        style="${this.getItemStyle(index, this.sequenceState, visualLayout)}"
        type="button"
        role="option"
        aria-selected="${index === this.sequenceState.focusedIndex ? 'true' : 'false'}"
        aria-current="${index === this.sequenceState.focusedIndex ? 'true' : 'false'}"
        data-action="focus-exercise"
        data-exercise-id="${escapeHtml(exercise.id)}"
        data-focused="${index === this.sequenceState.focusedIndex ? 'true' : 'false'}"
        data-interactive="${this.isItemInteractive(index, this.sequenceState) ? 'true' : 'false'}"
        data-section-first="${isSectionFirst ? 'true' : 'false'}"
        data-section-last="${isSectionLast ? 'true' : 'false'}"
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
          <h4 class="exercise-browser-name">${escapeHtml(exercise.name)}</h4>
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

  private getItemStyle(
    index: number,
    state: FocusSequenceState<ExerciseDefinition>,
    visualLayout: ExerciseVisualLayout,
  ): string {
    const distance = index - state.visualPosition
    const absoluteDistance = Math.abs(distance)
    const focusAmount = getVisualFocusAmount(absoluteDistance)
    const nearAmount = Math.max(0, 1 - absoluteDistance / 3)
    const zIndex = Math.max(1, 20 - Math.round(absoluteDistance * 3))
    const itemHeight = getItemHeightRem(index, state.visualPosition)
    const previewMaxHeight = 10 * focusAmount
    const paddingBlock = 0.55 + 0.7 * focusAmount

    return [
      `--distance: ${formatCssNumber(distance)}`,
      `--abs-distance: ${formatCssNumber(absoluteDistance)}`,
      `--focus-amount: ${formatCssNumber(focusAmount)}`,
      `--near-amount: ${formatCssNumber(nearAmount)}`,
      `--slot-distance: ${formatCssNumber(visualLayout.itemOffsets.get(index) ?? 0)}rem`,
      `--item-z-index: ${zIndex}`,
      `--item-height: ${formatCssNumber(itemHeight)}rem`,
      `--item-padding-block: ${formatCssNumber(paddingBlock)}rem`,
      `--preview-max-block-size: ${formatCssNumber(previewMaxHeight)}rem`,
      `--preview-opacity: ${formatCssNumber(focusAmount)}`,
    ].join('; ')
  }

  private getMarkerStyle(index: number, visualLayout: ExerciseVisualLayout): string {
    const markerOffset = visualLayout.markerOffsets.get(index) ?? 0
    const absoluteDistance = Math.abs(index - 0.5 - this.sequenceState.visualPosition)
    const zIndex = Math.max(1, 18 - Math.round(absoluteDistance * 3))

    return [
      `--abs-distance: ${formatCssNumber(absoluteDistance)}`,
      `--slot-distance: ${formatCssNumber(markerOffset)}rem`,
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

function createExerciseVisualLayout(
  items: ExerciseDefinition[],
  visualPosition: number,
  startIndex: number,
  endIndex: number,
): ExerciseVisualLayout {
  const heights = new Map<number, number>()
  const centers = new Map<number, number>()
  const markerCenters = new Map<number, number>()

  for (let index = startIndex; index <= endIndex; index += 1) {
    heights.set(index, getItemHeightRem(index, visualPosition))
  }

  centers.set(startIndex, 0)

  for (let index = startIndex + 1; index <= endIndex; index += 1) {
    const previousIndex = index - 1
    const previousCenter = centers.get(previousIndex) ?? 0
    const previousHeight = heights.get(previousIndex) ?? COMPACT_ITEM_HEIGHT_REM
    const currentHeight = heights.get(index) ?? COMPACT_ITEM_HEIGHT_REM
    const sectionBoundary = getExerciseSectionTitle(items[previousIndex]?.name ?? '')
      !== getExerciseSectionTitle(items[index]?.name ?? '')
    const gap = sectionBoundary ? SECTION_BOUNDARY_GAP_REM : 0
    const previousBottom = previousCenter + previousHeight / 2

    centers.set(index, previousBottom + gap + currentHeight / 2)

    if (sectionBoundary) {
      markerCenters.set(index, previousBottom + gap / 2)
    }
  }

  if (startIndex === 0) {
    const firstHeight = heights.get(0) ?? COMPACT_ITEM_HEIGHT_REM
    markerCenters.set(0, -firstHeight / 2 - SECTION_TITLE_LEADING_REM)
  }

  const lowerIndex = clamp(Math.floor(visualPosition), startIndex, endIndex)
  const upperIndex = clamp(Math.ceil(visualPosition), startIndex, endIndex)
  const interpolation = visualPosition - Math.floor(visualPosition)
  const lowerCenter = centers.get(lowerIndex) ?? 0
  const upperCenter = centers.get(upperIndex) ?? lowerCenter
  const referenceCenter = lowerCenter + (upperCenter - lowerCenter) * interpolation
  const itemOffsets = new Map<number, number>()
  const markerOffsets = new Map<number, number>()

  centers.forEach((center, index) => {
    itemOffsets.set(index, center - referenceCenter)
  })

  markerCenters.forEach((center, index) => {
    markerOffsets.set(index, center - referenceCenter)
  })

  return { itemOffsets, markerOffsets }
}

function getItemHeightRem(index: number, visualPosition: number): number {
  const focusAmount = getVisualFocusAmount(Math.abs(index - visualPosition))

  return COMPACT_ITEM_HEIGHT_REM + (FOCUSED_ITEM_HEIGHT_REM - COMPACT_ITEM_HEIGHT_REM) * focusAmount
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
