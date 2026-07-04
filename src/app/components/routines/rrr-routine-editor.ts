import { storageService } from '../../storage-instance.ts'
import { getActiveExercises } from '../../../domain/exercise-service.ts'
import {
  createRoutineExercise,
  getActiveRoutineVersion,
  getRoutine,
} from '../../../domain/routine-service.ts'
import { t } from '../../../i18n/index.ts'
import type { RoutineExercise } from '../../../domain/types.ts'
import { escapeHtml } from '../../render-helpers.ts'
import { confirmSheet } from '../../../utils/sheet-service.ts'
import { RrrSheet } from '../../../design-system/components/rrr-sheet.ts'
import { presentSheet } from '../../../utils/sheet-service.ts'
import { promptRoutineTransitionDefault } from './routine-timing-sheets.ts'
import {
  renderRoutineFlowControls,
  renderRoutineFlowSequence,
} from './routine-flow-markup.ts'
import styles from './rrr-routine-editor.css?inline'

export class RrrRoutineEditor extends HTMLElement {
  private static readonly defaultRestSeconds = 20
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

  private routineIdValue: string | null = null
  private name = ''
  private transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
  private exercises: RoutineExercise[] = []
  private listenersBound = false
  private statusMessage = ''
  private statusType: 'error' | 'success' | null = null
  private createConfirmActive = false
  private renameSheetActive = false
  private timingSheetActive = false

  set routineId(value: string | null) {
    this.routineIdValue = value
    this.initialize()
  }

  get routineId(): string | null {
    return this.routineIdValue
  }

  connectedCallback(): void {
    this.bindListeners()
    this.initialize()
  }

  private initialize(): void {
    const data = storageService.getData()

    if (this.routineIdValue) {
      const routine = getRoutine(data, this.routineIdValue)

      if (!routine) {
        this.name = ''
        this.exercises = []
        this.render()
        return
      }

      const version = getActiveRoutineVersion(data, this.routineIdValue)

      this.name = routine.name
      this.transitionSeconds = Math.max(0, version?.transitionSeconds ?? RrrRoutineEditor.defaultTransitionSeconds)
      this.exercises = version
        ? version.exercises.map((exercise) => ({
            ...exercise,
            restSeconds: Math.max(0, exercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds),
          }))
        : []
    } else {
      this.name = this.getSuggestedRoutineName(data)
      this.transitionSeconds = RrrRoutineEditor.defaultTransitionSeconds
      this.exercises = []
    }

    this.render()
  }

  private getSuggestedRoutineName(data: ReturnType<typeof storageService.getData>): string {
    const existingNames = new Set(
      data.routines.map((routine) => routine.name.trim().toLowerCase()).filter(Boolean),
    )

    const prefixStartIndex = data.routines.length % RrrRoutineEditor.natoAlphabet.length

    for (let offset = 0; offset < RrrRoutineEditor.natoAlphabet.length; offset += 1) {
      const prefixIndex = (prefixStartIndex + offset) % RrrRoutineEditor.natoAlphabet.length
      const prefix = RrrRoutineEditor.natoAlphabet[prefixIndex]
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
        const prefix = RrrRoutineEditor.natoAlphabet[prefixIndex]
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

  private setStatus(message: string, type: 'error' | 'success'): void {
    this.statusMessage = message
    this.statusType = type
  }
  private bindListeners(): void {
    if (this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.addEventListener('click', (event) => {
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

      if (action === 'remove-exercise') {
        const id = actionTarget.dataset.id

        if (id) {
          this.removeExercise(id)
        }

        return
      }

      if (action === 'move-up') {
        const id = actionTarget.dataset.id

        if (id) {
          this.moveExercise(id, -1)
        }

        return
      }

      if (action === 'move-down') {
        const id = actionTarget.dataset.id

        if (id) {
          this.moveExercise(id, 1)
        }

        return
      }

      if (action === 'save') {
        void this.save()
        return
      }

      if (action === 'back') {
        window.location.hash = this.getReturnHash()
      }
    })
  }

  private readFields(): void {
    this.exercises = this.exercises.map((exercise) => {
      const restInput = this.querySelector<HTMLInputElement>(
        `input[data-exercise-id="${exercise.id}"][data-field="rest-seconds"]`,
      )
      const restValue = restInput?.valueAsNumber
      const setCountInput = this.querySelector<HTMLInputElement>(
        `input[data-exercise-id="${exercise.id}"][data-field="set-count"]`,
      )
      const setCountValue = setCountInput?.valueAsNumber

      return {
        ...exercise,
        restSeconds: Number.isFinite(restValue)
          ? Math.max(0, Math.trunc(restValue ?? RrrRoutineEditor.defaultRestSeconds))
          : Math.max(0, exercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds),
        setCount: Number.isFinite(setCountValue)
          ? Math.max(1, Math.trunc(setCountValue ?? 1))
          : Math.max(1, exercise.setCount),
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
    this.readFields()
    if (this.timingSheetActive) {
      return
    }

    const options = getActiveExercises(storageService.getData())
    if (options.length === 0) {
      return
    }

    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.className = 'sheet-title'
    heading.textContent = t('label.addExercise')

    const select = document.createElement('rrr-select') as HTMLElement & { value: string }
    select.slot = 'body'
    select.setAttribute('label', t('label.addExercise'))
    select.setAttribute('name', 'add-exercise')
    select.innerHTML = options
      .map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`)
      .join('')
    select.value = options[0]?.id ?? ''

    const confirmButton = document.createElement('rrr-button')
    confirmButton.slot = 'actions'
    confirmButton.setAttribute('type', 'button')
    confirmButton.setAttribute('data-sheet-result', 'confirm')
    confirmButton.textContent = t('action.add')

    sheet.append(heading, select, confirmButton)

    this.timingSheetActive = true
    try {
      if (await presentSheet(sheet) !== 'confirm') {
        return
      }

      const exerciseId = String(select.value ?? '').trim()
      if (!exerciseId) {
        return
      }

      this.exercises = [...this.exercises, createRoutineExercise(exerciseId)]
      this.render()
    } finally {
      this.timingSheetActive = false
    }
  }

  private async editDefaultTransition(): Promise<void> {
    if (this.timingSheetActive) {
      return
    }

    this.readFields()
    this.timingSheetActive = true
    try {
      const seconds = await promptRoutineTransitionDefault(this.transitionSeconds)
      if (seconds === undefined || seconds === this.transitionSeconds) {
        return
      }

      this.transitionSeconds = seconds
    } finally {
      this.timingSheetActive = false
    }

    this.render()
  }

  private removeExercise(id: string): void {
    this.readFields()
    this.exercises = this.exercises.filter((e) => e.id !== id)
    this.render()
  }

  private moveExercise(id: string, direction: -1 | 1): void {
    this.readFields()
    const index = this.exercises.findIndex((e) => e.id === id)

    if (index === -1) {
      return
    }

    const next = index + direction

    if (next < 0 || next >= this.exercises.length) {
      return
    }

    const updated = [...this.exercises]
    const temp = updated[index]
    const swapTarget = updated[next]

    if (!temp || !swapTarget) {
      return
    }

    updated[index] = swapTarget
    updated[next] = temp

    this.exercises = updated
    this.render()
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

  private async save(): Promise<void> {
    this.readFields()

    const resolvedName = this.name.trim() || this.getSuggestedRoutineName(storageService.getData())
    this.name = resolvedName

    if (!this.routineIdValue) {
      if (this.createConfirmActive) {
        return
      }

      this.createConfirmActive = true
      try {
        const confirmed = await confirmSheet({
          title: t('routineEditor.dialog.create.title'),
          message: t('routineEditor.dialog.create.message', { name: resolvedName }),
          confirmLabel: t('routineEditor.dialog.create.confirm'),
        })
        if (!confirmed) {
          return
        }
      } finally {
        this.createConfirmActive = false
      }
    }

    const saved = storageService.saveRoutine(this.routineIdValue, resolvedName, this.exercises, this.transitionSeconds)

    window.dispatchEvent(new CustomEvent('rrr-data-changed'))
    this.routineIdValue = saved.id
    window.location.hash = `#/routines/${encodeURIComponent(saved.id)}`
  }

  private getReturnHash(): string {
    return this.routineIdValue && getRoutine(storageService.getData(), this.routineIdValue)
      ? `#/routines/${encodeURIComponent(this.routineIdValue)}`
      : '#/routines'
  }

  private render(): void {
    const data = storageService.getData()
    const isEditing = this.routineIdValue !== null

    if (isEditing && this.routineIdValue !== null && !getRoutine(data, this.routineIdValue)) {
      this.innerHTML = `
        <style>${styles}</style>
        <section class="page">
          <div class="rrr-card">
            <h2>${t('routineEditor.notFound.title')}</h2>
            <rrr-button type="button" variant="outline" data-action="back">${t('routineEditor.notFound.back')}</rrr-button>
          </div>
        </section>
      `
      return
    }

    const exerciseListHtml = this.exercises
      .map((routineExercise, index) => {
            const def = data.exercises.find((e) => e.id === routineExercise.exerciseId)
            const exerciseName = def?.name ?? t('routineEditor.exercises.unknown')
            const exerciseHeadingId = `routine-exercise-${routineExercise.id}`
            const isFirst = index === 0
            const isLast = index === this.exercises.length - 1

            return `
              <section class="exercise-item" aria-labelledby="${exerciseHeadingId}">
                <div class="exercise-header">
                  <span class="exercise-name" id="${exerciseHeadingId}">${escapeHtml(exerciseName)}</span>
                  <div class="exercise-order">
                    <rrr-button type="button" variant="outline" data-action="move-up" data-id="${routineExercise.id}"
                      ${isFirst ? 'disabled' : ''} aria-label="${escapeHtml(t('routineEditor.action.moveUpAria', { name: exerciseName }))}">↑</rrr-button>
                    <rrr-button type="button" variant="outline" data-action="move-down" data-id="${routineExercise.id}"
                      ${isLast ? 'disabled' : ''} aria-label="${escapeHtml(t('routineEditor.action.moveDownAria', { name: exerciseName }))}">↓</rrr-button>
                    <rrr-button type="button" variant="ghost" tone="danger" data-action="remove-exercise" data-id="${routineExercise.id}" aria-label="${escapeHtml(t('routineEditor.action.removeExerciseAria', { name: exerciseName }))}"><rrr-icon name="delete"></rrr-icon></rrr-button>
                  </div>
                </div>
                <label>
                  ${t('routineExercise.setCount.label')}
                  <input type="number" min="1" step="1"
                    data-exercise-id="${routineExercise.id}"
                    data-field="set-count"
                    value="${Math.max(1, routineExercise.setCount)}" />
                </label>
                <label>
                  ${t('routineEditor.field.restSeconds')}
                  <input type="number" min="0" step="1"
                    data-exercise-id="${routineExercise.id}"
                    data-field="rest-seconds"
                    value="${Math.max(0, routineExercise.restSeconds ?? RrrRoutineEditor.defaultRestSeconds)}" />
                </label>
              </section>
            `
            })
          .join('')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <p class="status-message${this.statusType ? ` status-${this.statusType}` : ''}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage || t('routineEditor.status.default')}</p>
        <rrr-section>
          <span slot="heading">${t('routineDetail.section.flow')}</span>
          <div class="rrr-card">
            ${
    this.exercises.length > 0
      ? `
                    <rrr-sequence aria-label="${escapeHtml(t('routineDetail.exercises.sequenceAria'))}">
                      ${renderRoutineFlowSequence(
      {
        id: 'editor-preview',
        routineId: this.routineIdValue ?? 'new',
        previousVersionId: null,
        transitionSeconds: this.transitionSeconds,
        exercises: this.exercises,
        createdAt: '',
      },
      {
        resolveExerciseName: (exerciseId) => this.resolveExerciseName(exerciseId),
        exerciseInteractive: false,
        transitionInteractive: false,
      },
    )}
                    </rrr-sequence>
                  `
      : `<p>${t('routineEditor.exercises.empty')}</p>`
  }
            ${renderRoutineFlowControls({
    addAction: 'add-routine-exercise',
    transitionAction: 'edit-transition-default',
    transitionSeconds: this.transitionSeconds,
  })}
          </div>
        </rrr-section>
        ${
    this.exercises.length > 0
      ? `
            <div>
              <h3>${t('routineEditor.section.exercises')}</h3>
              <div class="exercise-list" aria-live="polite">${exerciseListHtml}</div>
            </div>
          `
      : ''
  }
        <rrr-section>
          <span slot="heading">${t('routineDetail.actions')}</span>
          <div class="rrr-list-card">
            <rrr-list-row
              activation="button"
              label="${t('routineEditor.action.save')}"
              data-action="save"
            ></rrr-list-row>
          </div>
        </rrr-section>
      </section>
    `
  }
}

customElements.define('rrr-routine-editor', RrrRoutineEditor)
