import { createDurationSet, createRepsWeightSet } from '../domain/workout-service.ts'
import { t } from '../i18n/index.ts'
import { shadowTypographyStyles } from '../styles/shadow-styles.ts'
import type { ExerciseDefinition, SetEntry, WorkoutExerciseEntry } from '../domain/types.ts'
import './rrr-set-entry.ts'

const styles = `
  ${shadowTypographyStyles}

  .entry {
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: var(--rrr-space-md);
    background: var(--rrr-color-surface);
    display: grid;
    gap: var(--rrr-space-md);
  }

  .header {
    display: flex;
    justify-content: space-between;
    gap: var(--rrr-space-sm);
    align-items: center;
  }

  .sets {
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .footer {
    display: flex;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }
`

export class RrrExerciseEntry extends HTMLElement {
  private entryValue: WorkoutExerciseEntry | null = null
  private exerciseValue: ExerciseDefinition | null = null
  private listenersBound = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  set entry(value: WorkoutExerciseEntry) {
    this.entryValue = value
    this.render()
  }

  get entry(): WorkoutExerciseEntry | null {
    return this.entryValue
  }

  set exercise(value: ExerciseDefinition | null) {
    this.exerciseValue = value
    this.render()
  }

  connectedCallback(): void {
    this.bindListeners()
    this.render()
  }

  private bindListeners(): void {
    if (!this.shadowRoot || this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.shadowRoot.addEventListener('rrr-set-changed', (event) => {
      const customEvent = event as CustomEvent<SetEntry>

      if (!this.entryValue) {
        return
      }

      this.entryValue = {
        ...this.entryValue,
        sets: this.entryValue.sets.map((set) => (set.id === customEvent.detail.id ? customEvent.detail : set)),
      }

      this.emitChanged()
    })

    this.shadowRoot.addEventListener('rrr-set-removed', (event) => {
      const customEvent = event as CustomEvent<string>

      if (!this.entryValue) {
        return
      }

      this.entryValue = {
        ...this.entryValue,
        sets: this.entryValue.sets.filter((set) => set.id !== customEvent.detail),
      }

      this.emitChanged()
      this.render()
    })
  }

  private emitChanged(): void {
    if (!this.entryValue) {
      return
    }

    this.dispatchEvent(
      new CustomEvent<WorkoutExerciseEntry>('rrr-exercise-changed', {
        detail: this.entryValue,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private emitRemoved(): void {
    if (!this.entryValue) {
      return
    }

    this.dispatchEvent(
      new CustomEvent<string>('rrr-exercise-removed', {
        detail: this.entryValue.id,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private addSet(): void {
    if (!this.entryValue) {
      return
    }

    const nextSet = this.exerciseValue?.kind === 'duration' ? createDurationSet(0) : createRepsWeightSet(0, null)

    this.entryValue = {
      ...this.entryValue,
      sets: [...this.entryValue.sets, nextSet],
    }

    this.emitChanged()
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot || !this.entryValue) {
      return
    }

    const exerciseName = this.exerciseValue?.name ?? t('exerciseEntry.unknownExercise')
    const exerciseKind = this.exerciseValue?.kind ?? 'reps-weight'
    const headingId = `exercise-entry-${this.entryValue.id}`

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="entry" aria-labelledby="${headingId}">
        <div class="header">
          <div>
            <h3 id="${headingId}">${exerciseName}</h3>
            <p>${exerciseKind === 'duration' ? t('exerciseEntry.kind.duration') : t('exerciseEntry.kind.repsWeight')}</p>
          </div>
          <button type="button" data-action="remove-exercise" aria-label="${escapeHtml(t('exerciseEntry.action.removeExerciseAria', { name: exerciseName }))}">${t('action.remove')}</button>
        </div>
        <label>
          ${t('exerciseEntry.field.notes')}
          <textarea rows="2" name="notes" placeholder="${t('exerciseEntry.field.notes.placeholder')}">${this.entryValue.notes}</textarea>
        </label>
        <div class="sets" aria-live="polite"></div>
        <div class="footer">
          <button type="button" data-action="add-set" aria-label="${escapeHtml(t('exerciseEntry.action.addSetAria', { name: exerciseName }))}">${t('exerciseEntry.action.addSet')}</button>
        </div>
      </section>
    `

    this.shadowRoot.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')?.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLTextAreaElement

      if (!this.entryValue) {
        return
      }

      this.entryValue = {
        ...this.entryValue,
        notes: target.value,
      }

      this.emitChanged()
    })

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="add-set"]')?.addEventListener('click', () => {
      this.addSet()
    })

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="remove-exercise"]')?.addEventListener('click', () => {
      this.emitRemoved()
    })

    const container = this.shadowRoot.querySelector<HTMLDivElement>('.sets')

    if (container) {
      if (this.entryValue.sets.length === 0) {
        container.innerHTML = `<p>${t('exerciseEntry.empty.sets')}</p>`
      } else {
        this.entryValue.sets.forEach((set) => {
          const setElement = document.createElement('rrr-set-entry') as HTMLElement & {
            setData: SetEntry
            exerciseKind: 'reps-weight' | 'duration'
          }

          setElement.setData = set
          setElement.exerciseKind = exerciseKind
          container.append(setElement)
        })
      }
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

customElements.define('rrr-exercise-entry', RrrExerciseEntry)
