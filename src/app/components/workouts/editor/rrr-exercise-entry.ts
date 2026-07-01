import { createTimeSet, createRepsSet } from '../../../../domain/workout-service.ts'
import { t } from '../../../../i18n/index.ts'
import type { ExerciseDefinition, SetEntry, WorkoutExerciseEntry } from '../../../../domain/types.ts'
import { escapeHtml } from '../../../render-helpers.ts'
import './rrr-set-entry.ts'
import styles from './rrr-exercise-entry.css?inline'

export class RrrExerciseEntry extends HTMLElement {
  private entryValue: WorkoutExerciseEntry | null = null
  private exerciseValue: ExerciseDefinition | null = null
  private listenersBound = false

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
    if (this.listenersBound) {
      return
    }

    this.listenersBound = true

    this.addEventListener('rrr-set-changed', (event) => {
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

    this.addEventListener('rrr-set-removed', (event) => {
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

    const nextSet = this.exerciseValue?.kind === 'time' ? createTimeSet(0) : createRepsSet(0, null)

    this.entryValue = {
      ...this.entryValue,
      sets: [...this.entryValue.sets, nextSet],
    }

    this.emitChanged()
    this.render()
  }

  private render(): void {
    if (!this.entryValue) {
      return
    }

    const exerciseName = this.exerciseValue?.name ?? t('exerciseEntry.unknownExercise')
    const exerciseKind = this.exerciseValue?.kind ?? 'reps'
    const headingId = `exercise-entry-${this.entryValue.id}`

    this.innerHTML = `
      <style>${styles}</style>
      <section class="entry" aria-labelledby="${headingId}">
        <div class="header">
          <div>
            <h3 id="${headingId}">${exerciseName}</h3>
            <p>${exerciseKind === 'time' ? t('exerciseEntry.kind.duration') : t('exerciseEntry.kind.repsWeight')}</p>
          </div>
          <rrr-button type="button" variant="ghost" tone="danger" data-action="remove-exercise" aria-label="${escapeHtml(t('exerciseEntry.action.removeExerciseAria', { name: exerciseName }))}"><rrr-icon name="delete"></rrr-icon></rrr-button>
        </div>
        <rrr-textarea label="${t('exerciseEntry.field.notes')}" rows="2" name="notes" placeholder="${t('exerciseEntry.field.notes.placeholder')}" value="${escapeHtml(this.entryValue.notes)}"></rrr-textarea>
        <div class="sets" aria-live="polite"></div>
        <div class="footer">
          <rrr-button type="button" data-action="add-set" aria-label="${escapeHtml(t('exerciseEntry.action.addSetAria', { name: exerciseName }))}">${t('exerciseEntry.action.addSet')}</rrr-button>
        </div>
      </section>
    `

    this.querySelector<HTMLElement & { value: string }>('rrr-textarea[name="notes"]')?.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLElement & { value: string }

      if (!this.entryValue) {
        return
      }

      this.entryValue = {
        ...this.entryValue,
        notes: target.value,
      }

      this.emitChanged()
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="add-set"]')?.addEventListener('click', () => {
      this.addSet()
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="remove-exercise"]')?.addEventListener('click', () => {
      this.emitRemoved()
    })

    const container = this.querySelector<HTMLDivElement>('.sets')

    if (container) {
      if (this.entryValue.sets.length === 0) {
        container.innerHTML = `<p>${t('exerciseEntry.empty.sets')}</p>`
      } else {
        this.entryValue.sets.forEach((set) => {
          const setElement = document.createElement('rrr-set-entry') as HTMLElement & {
            setData: SetEntry
            exerciseKind: 'reps' | 'time'
          }

          setElement.setData = set
          setElement.exerciseKind = exerciseKind
          container.append(setElement)
        })
      }
    }
  }
}

customElements.define('rrr-exercise-entry', RrrExerciseEntry)
