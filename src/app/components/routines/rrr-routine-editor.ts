import { storageService } from '../../storage-instance.ts'
import { getActiveExercises } from '../../../domain/exercise-service.ts'
import {
  createRoutineExercise,
  reorderRoutineExercises,
} from '../../../domain/routine-service.ts'
import { t } from '../../../i18n/index.ts'
import type { RoutineExercise } from '../../../domain/types.ts'
import type {
  SequenceReorderDetail,
  SequenceSortStatusDetail,
} from '../../../design-system/components/rrr-sequence.ts'
import type {
  SwipeActionCommitDetail,
} from '../../../design-system/components/rrr-swipe-action.ts'
import { escapeHtml } from '../../render-helpers.ts'
import { confirmSheet } from '../../../foundation/sheet-service.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { presentSheet } from '../../../foundation/sheet-service.ts'
import {
  promptRoutineTransitionDefault,
  promptTransitionOverride,
} from './routine-timing-sheets.ts'
import { promptRoutineExerciseSettings } from './routine-exercise-sheets.ts'
import {
  renderRoutineFlowControls,
  renderRoutineReorderControl,
  renderRoutineFlowSequence,
  type RoutineFlowGutterMotion,
} from './routine-flow-markup.ts'
import { announceRoutineFlowSort } from './routine-flow-sorting.ts'
import { promptRoutineExercisePicker } from './routine-exercise-picker.ts'

export class RrrRoutineEditor extends HTMLElement {
  private static readonly defaultTransitionSeconds = 10
  private static readonly natoAlphabet = [
    'Alpha',
    'Bravo',
    'Charlie',
    'Delta',
    'Echo',
    'Foxtrot',
    'Golf',
    'Hotel',
    'India',
    'Juliett',
    'Kilo',
    'Lima',
    'Mike',
    'November',
    'Oscar',
    'Papa',
    'Quebec',
    'Romeo',
    'Sierra',
    'Tango',
    'Uniform',
    'Victor',
    'Whiskey',
    'X-ray',
    'Yankee',
    'Zulu',
  ]
  private static readonly geographicNames = [
    'Harbor',
    'Summit',
    'Valley',
    'Ridge',
    'Bay',
    'Cove',
    'Delta',
    'Canyon',
    'Plateau',
    'Lagoon',
    'Meadow',
    'Glacier',
    'Dune',
    'Forest',
    'Prairie',
    'Cliff',
    'Rapids',
    'River',
    'Strait',
    'Isle',
    'Tundra',
    'Marsh',
    'Grove',
    'Spring',
  ]

  private name = ''
  private transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
  private exercises: RoutineExercise[] = []
  private listenersBound = false
  private creationCommitted = false
  private renameSheetActive = false
  private sheetSessionActive = false
  private reorderMode = false
  private gutterMotion: RoutineFlowGutterMotion = 'reveal'

  connectedCallback(): void {
    this.bindListeners()
    this.initialize()
  }

  private initialize(): void {
    const data = storageService.getData()

    this.name = this.getSuggestedRoutineName(data)
    this.transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
    this.exercises = []
    this.reorderMode = false
    this.gutterMotion = 'reveal'

    this.render()
  }

  private getSuggestedRoutineName(data: ReturnType<typeof storageService.getData>): string {
    const existingNames = new Set(
      data.routines.map((routine) => routine.name.trim().toLowerCase()).filter(Boolean),
    )

    const prefixStartIndex = data.routines.length % RrrRoutineEditor.natoAlphabet.length

    for (let offset = 0; offset < RrrRoutineEditor.natoAlphabet.length; offset += 1) {
      const prefixIndex = (prefixStartIndex + offset) % RrrRoutineEditor.natoAlphabet.length
      const prefix = RrrRoutineEditor.natoAlphabet[prefixIndex]!
      const geographics = this.getShuffledGeographicNames()

      for (const geographic of geographics) {
        const candidate = t('routineEditor.autoName.comboPattern', {
          nato: prefix,
          geographic,
        })
        if (!existingNames.has(candidate.trim().toLowerCase())) {
          return candidate
        }
      }
    }

    let suffix = 2
    while (true) {
      for (let offset = 0; offset < RrrRoutineEditor.natoAlphabet.length; offset += 1) {
        const prefixIndex = (prefixStartIndex + offset) % RrrRoutineEditor.natoAlphabet.length
        const prefix = RrrRoutineEditor.natoAlphabet[prefixIndex]!
        const geographics = this.getShuffledGeographicNames()

        for (const geographic of geographics) {
          const baseCandidate = t('routineEditor.autoName.comboPattern', {
            nato: prefix,
            geographic,
          })
          const candidate = `${baseCandidate} ${suffix}`
          if (!existingNames.has(candidate.trim().toLowerCase())) {
            return candidate
          }
        }
      }
      suffix += 1
    }
  }

  private getShuffledGeographicNames(): string[] {
    const values = [...RrrRoutineEditor.geographicNames]
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const current = values[index]
      const target = values[swapIndex]
      if (!current || !target) {
        continue
      }
      values[index] = target
      values[swapIndex] = current
    }
    return values
  }

  private bindListeners(): void {
    if (this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.addEventListener('rrr-sequence-sort-status', (event) => {
      announceRoutineFlowSort(
        (event as CustomEvent<SequenceSortStatusDetail>).detail,
      )
    })
    this.addEventListener('rrr-sequence-reorder', (event) => {
      if (!this.reorderMode) {
        return
      }

      const detail = (event as CustomEvent<SequenceReorderDetail>).detail
      const exercises = reorderRoutineExercises(this.exercises, detail.orderedIds)
      if (exercises === this.exercises) {
        return
      }

      this.exercises = exercises
      this.render()

      if (detail.input === 'keyboard') {
        queueMicrotask(() => {
          Array.from(this.querySelectorAll<HTMLElement>('[data-sort-id]'))
            .find((item) => item.dataset.sortId === detail.movedId)
            ?.querySelector<HTMLElement>('[data-sort-handle]')
            ?.focus()
        })
      }
    })
    this.addEventListener('rrr-swipe-action-commit', (event) => {
      if (
        this.reorderMode
        || (event as CustomEvent<SwipeActionCommitDetail>).detail.action !== 'delete'
      ) {
        return
      }

      const target = event.target
      const routineExerciseId = target instanceof HTMLElement
        ? target.dataset.swipeRoutineExerciseId
        : undefined
      if (!routineExerciseId) {
        return
      }

      this.exercises = this.exercises.filter(
        (exercise) => exercise.id !== routineExerciseId,
      )
      this.render()
    })
    this.addEventListener('change', (event) => {
      const reorderControl = event
        .composedPath()
        .find((node): node is HTMLElement & { checked: boolean } =>
          node instanceof HTMLElement
          && node.dataset.action === 'toggle-reorder-exercises')
      if (reorderControl) {
        this.setReorderMode(reorderControl.checked)
      }
    })

    this.addEventListener('click', (event) => {
      const routineExerciseTarget = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement
          && node.dataset.routineExerciseId !== undefined)
      if (routineExerciseTarget?.dataset.routineExerciseId) {
        if (this.reorderMode) {
          return
        }
        void this.editRoutineExercise(routineExerciseTarget.dataset.routineExerciseId)
        return
      }

      const transitionTarget = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement
          && node.dataset.beforeExerciseId !== undefined)
      if (transitionTarget?.dataset.beforeExerciseId) {
        if (this.reorderMode) {
          return
        }
        void this.editTransitionOverride(transitionTarget.dataset.beforeExerciseId)
        return
      }

      const actionTarget = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)

      if (!actionTarget) {
        return
      }

      const action = actionTarget.dataset.action

      if (action === 'add-routine-exercise') {
        void this.addRoutineExercise()
        return
      }

      if (action === 'edit-transition-default') {
        void this.editDefaultTransition()
        return
      }

    if (action === 'create-routine') {
      this.createRoutine()
        return
      }

    })
  }

  private resolveExerciseName(exerciseId: string): string {
    return storageService
      .getData()
      .exercises.find((exercise) => exercise.id === exerciseId)?.name
      ?? t('routineEditor.exercises.unknown')
  }

  private async addRoutineExercise(): Promise<void> {
    if (this.sheetSessionActive || this.reorderMode) {
      return
    }

    const options = getActiveExercises(storageService.getData())
    if (options.length === 0) {
      return
    }

    this.sheetSessionActive = true
    try {
      await promptRoutineExercisePicker(options, ({ exerciseId, settings }) => {
        this.exercises = [...this.exercises, createRoutineExercise(exerciseId, settings)]
        this.render()
      })
    } finally {
      this.sheetSessionActive = false
    }
  }

  private async editDefaultTransition(): Promise<void> {
    if (this.sheetSessionActive) {
      return
    }

    this.sheetSessionActive = true
    try {
      const seconds = await promptRoutineTransitionDefault(this.transitionSeconds)
      if (seconds === undefined || seconds === this.transitionSeconds) {
        return
      }

      this.transitionSeconds = seconds
    } finally {
      this.sheetSessionActive = false
    }

    this.render()
  }

  private async editRoutineExercise(routineExerciseId: string): Promise<void> {
    if (this.reorderMode) {
      return
    }

    const routineExercise = this.exercises.find(
      (exercise) => exercise.id === routineExerciseId,
    )
    if (!routineExercise || this.sheetSessionActive) {
      return
    }

    const exerciseName = this.resolveExerciseName(routineExercise.exerciseId)
    this.sheetSessionActive = true
    try {
      const result = await promptRoutineExerciseSettings({
        exerciseName,
        setCount: routineExercise.setCount,
        restSeconds: routineExercise.restSeconds,
      })
      if (!result) {
        return
      }

      if (result.kind === 'delete') {
        const confirmed = await confirmSheet({
          title: t('routineExercise.dialog.delete.title', { exercise: exerciseName }),
          message: t('routineExercise.dialog.delete.message'),
          confirmLabel: t('action.delete'),
          confirmTone: 'danger',
        })
        if (confirmed) {
          this.exercises = this.exercises.filter(
            (exercise) => exercise.id !== routineExerciseId,
          )
          this.render()
        }
        return
      }

      const { settings } = result
      if (
        settings.setCount === routineExercise.setCount
        && settings.restSeconds === routineExercise.restSeconds
      ) {
        return
      }

      this.exercises = this.exercises.map((exercise) =>
        exercise.id === routineExerciseId
          ? { ...exercise, ...settings }
          : exercise)
      this.render()
    } finally {
      this.sheetSessionActive = false
    }
  }

  private async editTransitionOverride(beforeExerciseId: string): Promise<void> {
    if (this.reorderMode) {
      return
    }

    const destination = this.exercises.find(
      (exercise) => exercise.id === beforeExerciseId,
    )
    if (!destination || this.sheetSessionActive) {
      return
    }

    this.sheetSessionActive = true
    try {
      const override = await promptTransitionOverride({
        routineDefaultSeconds: this.transitionSeconds,
        currentOverrideSeconds: destination.transitionBeforeOverrideSeconds,
        destinationName: this.resolveExerciseName(destination.exerciseId),
      })
      if (
        override === undefined
        || override === destination.transitionBeforeOverrideSeconds
      ) {
        return
      }

      this.exercises = this.exercises.map((exercise) =>
        exercise.id === beforeExerciseId
          ? { ...exercise, transitionBeforeOverrideSeconds: override }
          : exercise)
      this.render()
    } finally {
      this.sheetSessionActive = false
    }
  }

  private setReorderMode(enabled: boolean): void {
    const nextMode = enabled && this.exercises.length > 1
    if (nextMode === this.reorderMode) {
      return
    }

    this.reorderMode = nextMode
    this.gutterMotion = nextMode ? 'collapse' : 'reveal'
    this.render()

    const focusTarget = (): void => {
      const target = nextMode
        ? this.querySelector<HTMLElement>('[data-sort-handle]')
        : this.querySelector<HTMLElement>(
            'rrr-list-row[data-action="toggle-reorder-exercises"]',
          )
      target?.focus()
    }
    const sequence = this.querySelector<HTMLElement>('rrr-sequence')
    if (nextMode && sequence?.getAttribute('aria-busy') === 'true') {
      sequence.addEventListener(
        'rrr-sequence-reorder-ready',
        () => focusTarget(),
        { once: true },
      )
    } else {
      queueMicrotask(focusTarget)
    }
  }

  async openRenameSheet(): Promise<boolean> {
    if (this.renameSheetActive) {
      return false
    }

    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.className = 'sheet-title'
    heading.textContent = t('routineEditor.dialog.rename.title')

    const nameInput = document.createElement('rrr-input') as HTMLElement & { value: string }
    nameInput.slot = 'body'
    nameInput.setAttribute('autofocus', '')
    nameInput.setAttribute('label', t('routineEditor.dialog.rename.label'))
    nameInput.setAttribute('placeholder', this.getSuggestedRoutineName(storageService.getData()))
    nameInput.value = this.name

    const confirmButton = document.createElement('rrr-button')
    confirmButton.slot = 'actions'
    confirmButton.setAttribute('type', 'button')
    confirmButton.setAttribute('data-sheet-result', 'confirm')
    confirmButton.textContent = t('action.confirm')

    sheet.append(heading, nameInput, confirmButton)
    this.renameSheetActive = true
    try {
      if (await presentSheet(sheet) !== 'confirm') {
        return false
      }

      const nextName = nameInput.value.trim()
      if (nextName === this.name) {
        return false
      }

      this.name = nextName
      this.render()
      return true
    } finally {
      this.renameSheetActive = false
    }
  }

  getCurrentName(): string {
    return this.name.trim() || this.getSuggestedRoutineName(storageService.getData())
  }

  private createRoutine(): void {
    const resolvedName = this.name.trim() || this.getSuggestedRoutineName(storageService.getData())
    this.name = resolvedName

    if (this.creationCommitted) {
      return
    }

    this.creationCommitted = true
    try {
      const saved = storageService.saveRoutine(
        null,
        resolvedName,
        this.exercises,
        this.transitionSeconds,
      )

      window.dispatchEvent(new CustomEvent('rrr-data-changed'))
      window.location.hash = `#/routines/${encodeURIComponent(saved.id)}`
    } catch (error) {
      this.creationCommitted = false
      throw error
    }
  }

  private render(): void {
    const reorderAvailable = this.exercises.length > 1
    const reorderEnabled = this.reorderMode && reorderAvailable
    if (this.reorderMode !== reorderEnabled) {
      this.reorderMode = reorderEnabled
    }
    const gutterMotion = this.exercises.length > 1 ? this.gutterMotion : 'none'
    const gutterMotionAttribute = gutterMotion === 'none'
      ? ''
      : `data-gutter-motion="${gutterMotion}"`

    this.innerHTML = `
      <section class="page">
        <p class="status-message">${t('routineEditor.status.default')}</p>
        <rrr-section>
          <span slot="heading">${t('routineDetail.section.flow')}</span>
          ${this.exercises.length > 0
            ? renderRoutineReorderControl({
                action: 'toggle-reorder-exercises',
                available: reorderAvailable,
                enabled: reorderEnabled,
              })
            : ''}
          <div class="rrr-card">
            ${
    this.exercises.length > 0
      ? `
                    <rrr-sequence
                      ${reorderEnabled ? 'sortable' : ''}
                      ${gutterMotionAttribute}
                      aria-label="${escapeHtml(t('routineDetail.exercises.sequenceAria'))}"
                    >
                      ${renderRoutineFlowSequence(
      {
        id: 'editor-preview',
        routineId: 'new',
        previousVersionId: null,
        transitionSeconds: this.transitionSeconds,
        exercises: this.exercises,
        createdAt: '',
      },
      {
        resolveExerciseName: (exerciseId) => this.resolveExerciseName(exerciseId),
        showExerciseDescription: !reorderEnabled,
        exerciseInteractive: !reorderEnabled,
        transitionInteractive: !reorderEnabled,
        sortable: reorderEnabled,
        swipeable: !reorderEnabled,
      },
    )}
                    </rrr-sequence>
                  `
      : `<p>${t('routineEditor.exercises.empty')}</p>`
  }
          </div>
          ${renderRoutineFlowControls({
    addAction: 'add-routine-exercise',
    addDisabled: reorderEnabled,
    transitionAction: 'edit-transition-default',
    transitionSeconds: this.transitionSeconds,
  })}
        </rrr-section>
        <rrr-section>
          <span slot="heading">${t('routineDetail.actions')}</span>
          <div class="rrr-list-card">
            <rrr-list-row
              activation="button"
              label="${t('routineEditor.action.create')}"
              data-action="create-routine"
            ></rrr-list-row>
          </div>
        </rrr-section>
      </section>
    `

    if (gutterMotion !== 'none' && this.isConnected) {
      this.gutterMotion = 'none'
    }
  }
}

customElements.define('rrr-routine-editor', RrrRoutineEditor)
