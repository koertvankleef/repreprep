import { filterExercises, searchExercises, type ExerciseFilters } from '../../domain/exercise-service.ts'
import type { AppData, Equipment, ExerciseDefinition, MeasurementProfile, MeasurementType, Muscle } from '../../domain/types.ts'
import { t } from '../../i18n/index.ts'
import { FocusedSequenceController, type FocusSequenceState } from '../focused-sequence-controller.ts'
import { storageService } from '../storage-instance.ts'
import styles from './rrr-exercise-catalogue.css?inline'

const VISIBLE_RADIUS = 6
const SCROLL_PIXELS_PER_ITEM = 120
const COMPACT_ITEM_HEIGHT_REM = 4
const FOCUSED_ITEM_HEIGHT_REM = 11
const FOCUS_VISUAL_DEAD_ZONE = 0.04
const SECTION_TITLE_HEIGHT_REM = 0.9 * 1.5
const SECTION_GAP_BEFORE_REM = 1.25
const SECTION_GAP_AFTER_REM = 0.25
const SECTION_BOUNDARY_GAP_REM = (
  SECTION_GAP_BEFORE_REM
  + SECTION_TITLE_HEIGHT_REM
  + SECTION_GAP_AFTER_REM
)
const START_FOCUS_ANCHOR_REM = (
  FOCUSED_ITEM_HEIGHT_REM / 2
  + SECTION_GAP_AFTER_REM
  + SECTION_TITLE_HEIGHT_REM
)
const END_FOCUS_CLEARANCE_REM = FOCUSED_ITEM_HEIGHT_REM / 2

type ExerciseVisualLayout = {
  itemOffsets: number[]
  sectionTitleOffsets: number[]
}

let catalogueInstanceCount = 0

export class RrrExerciseCatalogue extends HTMLElement {
  private readonly focusSequence = new FocusedSequenceController<ExerciseDefinition>()
  private readonly statusId = `exercise-browser-status-${catalogueInstanceCount += 1}`
  private searchQueryValue = ''
  private filtersValue: ExerciseFilters = { categories: [], equipment: [] }
  private focusedExerciseIdValue: string | null = null
  private sequenceState = this.focusSequence.state
  private usedExerciseIds = new Set<string>()
  private announcedFocusedExerciseId: string | null = null
  private isRendering = false
  private renderFrame = 0
  private initialSyncFrame = 0
  private unsubscribeState: (() => void) | null = null
  private unsubscribeFocus: (() => void) | null = null

  private readonly handleDataChanged = (): void => {
    this.render()
  }

  private readonly handleSequenceStateChanged = (state: FocusSequenceState<ExerciseDefinition>): void => {
    this.sequenceState = state

    if (!this.isRendering) {
      this.queueBrowserRender()
    }
  }

  private readonly handleSequenceFocusChanged = (event: { item: ExerciseDefinition }): void => {
    this.focusedExerciseIdValue = event.item.id
  }

  private readonly handleClick = (event: MouseEvent): void => {
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

  set focusedExerciseId(value: string | null) {
    this.focusedExerciseIdValue = value
  }

  get focusedExerciseId(): string | null {
    return this.focusedExerciseIdValue
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
    this.isRendering = true
    this.unsubscribeState = this.focusSequence.onStateChange(this.handleSequenceStateChanged)
    this.unsubscribeFocus = this.focusSequence.onFocusChange(this.handleSequenceFocusChanged)
    this.render()
    this.initialSyncFrame = requestAnimationFrame(() => {
      this.initialSyncFrame = 0
      this.syncScrollProxyToState()
    })
  }

  disconnectedCallback(): void {
    window.removeEventListener('rrr-data-changed', this.handleDataChanged)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('keydown', this.handleKeyDown)
    this.removeEventListener('scroll', this.handleScroll, true)
    cancelAnimationFrame(this.renderFrame)
    cancelAnimationFrame(this.initialSyncFrame)
    this.renderFrame = 0
    this.initialSyncFrame = 0
    this.unsubscribeState?.()
    this.unsubscribeFocus?.()
    this.unsubscribeState = null
    this.unsubscribeFocus = null
  }

  private getFilteredExercises(data: AppData): ExerciseDefinition[] {
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
    const currentFocusedId = this.focusedExerciseIdValue ?? this.sequenceState.items[this.sequenceState.focusedIndex]?.id ?? null
    const focusedIndex = currentFocusedId
      ? exercises.findIndex((exercise) => exercise.id === currentFocusedId)
      : 0
    const nextFocusedIndex = focusedIndex === -1 ? 0 : focusedIndex

    this.focusSequence.setItems(exercises, {
      focusedIndex: nextFocusedIndex,
      reason: currentFocusedId ? 'filter' : 'initial',
    })

    this.sequenceState = this.focusSequence.state
    this.focusedExerciseIdValue = exercises[nextFocusedIndex]?.id ?? null
  }

  private renderList(): string {
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
        role="region"
        tabindex="0"
        aria-label="${escapeHtml(t('exercise.browser.label'))}"
        aria-describedby="${this.statusId}"
      >
        <span class="sr-only" id="${this.statusId}" aria-live="polite">
          ${escapeHtml(this.getFocusedStatus())}
        </span>
        <div class="exercise-browser-presentation" data-browser-presentation>
          ${this.renderBrowserPresentation(state)}
        </div>
        <div
          class="exercise-browser-scroll-spacer"
          style="block-size: calc(${scrollRange}px + var(--rrr-exercise-browser-bottom-clearance));"
          aria-hidden="true"
        ></div>
      </div>
    `
  }

  private renderBrowserPresentation(state: FocusSequenceState<ExerciseDefinition>): string {
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
            --focus-anchor: ${getFocusAnchor(state.visualPosition, state.items.length)};
          "
        >
          ${visibleItems.map((exercise, offset) => this.renderExerciseBoundaryAndItem(
            exercise,
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
    index: number,
    startIndex: number,
    endIndex: number,
    visualLayout: ExerciseVisualLayout,
  ): string {
    return `${this.renderBoundaryMarker(exercise, index, startIndex, endIndex, visualLayout)}${this.renderExerciseItem(exercise, index, visualLayout)}`
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
        class="exercise-browser-section-title"
        style="${this.getMarkerStyle(index, visualLayout)}"
      >${escapeHtml(sectionTitle)}</h2>
    `
  }

  private renderExerciseItem(
    exercise: ExerciseDefinition,
    index: number,
    visualLayout: ExerciseVisualLayout,
  ): string {
    const used = this.usedExerciseIds.has(exercise.id)
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
          <span class="exercise-browser-name">${escapeHtml(exercise.name)}</span>
          ${exercise.createdByUser ? `<rrr-badge tone="accent">${t('exercise.badge.custom')}</rrr-badge>` : ''}
          ${used ? `<rrr-badge class="exercise-browser-used-badge">${t('exercise.badge.used')}</rrr-badge>` : ''}
        </span>
        <span class="exercise-browser-meta">${escapeHtml(this.renderExerciseMeta(exercise))}</span>
      </span>
      ${this.renderFocusedDetails(exercise)}
    `
  }

  private renderFocusedDetails(exercise: ExerciseDefinition): string {
    return `
      <span class="exercise-browser-preview">
        <span class="exercise-browser-cue">${escapeHtml(getMovementCue(exercise.description))}</span>
        <span class="exercise-browser-profile-list">
          ${exercise.measurementProfiles.map((profile) => this.renderMeasurementProfile(profile)).join('')}
        </span>
      </span>
      <span class="exercise-browser-open">
        <span class="sr-only">${t('exercise.browser.openDetails')}</span>
        <rrr-icon name="chevron-right"></rrr-icon>
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

  private queueBrowserRender(): void {
    if (this.renderFrame) {
      return
    }

    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = 0

      if (this.isConnected) {
        this.renderBrowser()
      }
    })
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

    presentation.innerHTML = this.renderBrowserPresentation(this.sequenceState)
    this.updateFocusedStatus(scrollProxy)

    if (shouldRestoreBrowserFocus) {
      scrollProxy.focus({ preventScroll: true })
    }
  }

  private updateFocusedStatus(scrollProxy: HTMLElement): void {
    const focusedExercise = this.sequenceState.items[this.sequenceState.focusedIndex]

    if (!focusedExercise || focusedExercise.id === this.announcedFocusedExerciseId) {
      return
    }

    const status = scrollProxy.querySelector<HTMLElement>(`#${this.statusId}`)
    if (status) {
      status.textContent = this.getFocusedStatus()
    }
    this.announcedFocusedExerciseId = focusedExercise.id
  }

  private getFocusedStatus(): string {
    const focusedExercise = this.sequenceState.items[this.sequenceState.focusedIndex]

    if (!focusedExercise) {
      return ''
    }

    return t('exercise.browser.focusedStatus', {
      name: focusedExercise.name,
      index: this.sequenceState.focusedIndex + 1,
      count: this.sequenceState.items.length,
    })
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

    return [
      `--focus-amount: ${formatCssNumber(focusAmount)}`,
      `--near-amount: ${formatCssNumber(nearAmount)}`,
      `--slot-distance: ${formatCssNumber(visualLayout.itemOffsets[index] ?? 0)}rem`,
      `--item-z-index: ${zIndex}`,
      `--item-height: ${formatCssNumber(itemHeight)}rem`,
      `--preview-max-block-size: ${formatCssNumber(previewMaxHeight)}rem`,
      `--preview-opacity: ${formatCssNumber(focusAmount)}`,
    ].join('; ')
  }

  private getMarkerStyle(index: number, visualLayout: ExerciseVisualLayout): string {
    const markerOffset = visualLayout.sectionTitleOffsets[index] ?? 0
    const absoluteDistance = Math.abs(index - 0.5 - this.sequenceState.visualPosition)
    const zIndex = Math.max(1, 18 - Math.round(absoluteDistance * 3))

    return [
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
    cancelAnimationFrame(this.renderFrame)
    this.renderFrame = 0
    const addExerciseLabel = escapeHtml(t('exercise.form.add'))
    const data = storageService.getData()
    const exercises = this.getFilteredExercises(data)

    this.isRendering = true
    this.usedExerciseIds = getUsedExerciseIds(data)
    this.syncFocusedSequence(exercises)
    this.announcedFocusedExerciseId = exercises[this.sequenceState.focusedIndex]?.id ?? null

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
  const heights: number[] = []
  const centers: number[] = []
  const sectionTitleCenters: number[] = []

  for (let index = startIndex; index <= endIndex; index += 1) {
    heights[index] = getItemHeightRem(index, visualPosition)
  }

  centers[startIndex] = 0

  for (let index = startIndex + 1; index <= endIndex; index += 1) {
    const previousIndex = index - 1
    const previousCenter = centers[previousIndex] ?? 0
    const previousHeight = heights[previousIndex] ?? COMPACT_ITEM_HEIGHT_REM
    const currentHeight = heights[index] ?? COMPACT_ITEM_HEIGHT_REM
    const sectionBoundary = getExerciseSectionTitle(items[previousIndex]?.name ?? '')
      !== getExerciseSectionTitle(items[index]?.name ?? '')
    const gap = sectionBoundary ? SECTION_BOUNDARY_GAP_REM : 0
    const previousBottom = previousCenter + previousHeight / 2

    centers[index] = previousBottom + gap + currentHeight / 2

    if (sectionBoundary) {
      sectionTitleCenters[index] = (
        previousBottom
        + SECTION_GAP_BEFORE_REM
        + SECTION_TITLE_HEIGHT_REM / 2
      )
    }
  }

  if (startIndex === 0) {
    const firstHeight = heights[0] ?? COMPACT_ITEM_HEIGHT_REM
    sectionTitleCenters[0] = (
      -firstHeight / 2
      - SECTION_GAP_AFTER_REM
      - SECTION_TITLE_HEIGHT_REM / 2
    )
  }

  const lowerIndex = clamp(Math.floor(visualPosition), startIndex, endIndex)
  const upperIndex = clamp(Math.ceil(visualPosition), startIndex, endIndex)
  const interpolation = visualPosition - Math.floor(visualPosition)
  const lowerCenter = centers[lowerIndex] ?? 0
  const upperCenter = centers[upperIndex] ?? lowerCenter
  const referenceCenter = lowerCenter + (upperCenter - lowerCenter) * interpolation
  const itemOffsets: number[] = []
  const sectionTitleOffsets: number[] = []

  for (let index = startIndex; index <= endIndex; index += 1) {
    itemOffsets[index] = (centers[index] ?? referenceCenter) - referenceCenter

    const sectionTitleCenter = sectionTitleCenters[index]
    if (sectionTitleCenter !== undefined) {
      sectionTitleOffsets[index] = sectionTitleCenter - referenceCenter
    }
  }

  return { itemOffsets, sectionTitleOffsets }
}

function getUsedExerciseIds(data: AppData): Set<string> {
  const activeVersionIds = new Set(
    data.routines
      .filter((routine) => !routine.archived)
      .map((routine) => routine.activeVersionId),
  )
  const usedExerciseIds = new Set<string>()

  data.routineVersions.forEach((version) => {
    if (!activeVersionIds.has(version.id)) {
      return
    }

    version.exercises.forEach((entry) => usedExerciseIds.add(entry.exerciseId))
  })

  return usedExerciseIds
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

function getFocusAnchor(visualPosition: number, itemCount: number): string {
  if (itemCount <= 1) {
    return `${formatCssNumber(START_FOCUS_ANCHOR_REM)}rem`
  }

  const lastIndex = itemCount - 1
  const edgeRange = Math.min(3, lastIndex / 2)

  if (visualPosition <= edgeRange) {
    const edgeProgress = clamp(visualPosition / edgeRange, 0, 1)

    if (edgeProgress === 0) {
      return `${formatCssNumber(START_FOCUS_ANCHOR_REM)}rem`
    }

    return `calc(${formatCssNumber(START_FOCUS_ANCHOR_REM * (1 - edgeProgress))}rem + ${formatCssNumber(50 * edgeProgress)}%)`
  }

  if (visualPosition >= lastIndex - edgeRange) {
    const edgeProgress = clamp((visualPosition - (lastIndex - edgeRange)) / edgeRange, 0, 1)

    if (edgeProgress === 1) {
      return `calc(100% - ${formatCssNumber(END_FOCUS_CLEARANCE_REM)}rem)`
    }

    return `calc(${formatCssNumber(50 + 50 * edgeProgress)}% - ${formatCssNumber(END_FOCUS_CLEARANCE_REM * edgeProgress)}rem)`
  }

  return '50%'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-catalogue', RrrExerciseCatalogue)
