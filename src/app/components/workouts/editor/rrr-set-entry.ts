import { t } from '../../../../i18n/index.ts'
import type { ExerciseKind, SetEntry } from '../../../../domain/types.ts'
import styles from './rrr-set-entry.css?inline'

export class RrrSetEntry extends HTMLElement {
  private setValue: SetEntry | null = null
  private exerciseKindValue: ExerciseKind = 'reps'

  set setData(value: SetEntry) {
    this.setValue = value
    this.render()
  }

  get setData(): SetEntry | null {
    return this.setValue
  }

  set exerciseKind(value: ExerciseKind) {
    this.exerciseKindValue = value
    this.render()
  }

  connectedCallback(): void {
    this.render()
  }

  private emitChanged(set: SetEntry): void {
    this.dispatchEvent(
      new CustomEvent<SetEntry>('rrr-set-changed', {
        detail: set,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private emitRemoved(setId: string): void {
    this.dispatchEvent(
      new CustomEvent<string>('rrr-set-removed', {
        detail: setId,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private render(): void {
    if (!this.setValue) {
      return
    }

    const set = this.setValue
    const labelId = `set-label-${set.id}`

    this.innerHTML = `
      <style>${styles}</style>
      <div class="set" role="group" aria-labelledby="${labelId}">
        <span class="sr-only" id="${labelId}">${t('setEntry.groupLabel')}</span>
        <div class="fields">
          ${
            this.exerciseKindValue === 'time'
              ? `
                <label>
                  ${t('field.seconds')}
                  <input type="number" min="0" step="1" name="seconds" value="${set.kind === 'time' ? set.seconds : 0}" />
                </label>
              `
              : `
                <label>
                  ${t('setEntry.field.reps')}
                  <input type="number" min="0" step="1" name="reps" value="${set.kind === 'reps' ? set.reps : 0}" />
                </label>
                <label>
                  ${t('setEntry.field.weightKg')}
                  <input type="number" min="0" step="0.5" name="weightKg" value="${set.kind === 'reps' && set.weightKg !== null ? set.weightKg : ''}" />
                </label>
              `
          }
        </div>
        <label>
          ${t('setEntry.field.notes')}
          <input type="text" name="notes" value="${set.notes}" placeholder="${t('setEntry.field.notes.placeholder')}" />
        </label>
        <div class="actions">
          <rrr-button type="button" variant="ghost" tone="danger" data-action="remove" aria-label="${t('setEntry.action.removeAria')}"><rrr-icon name="delete"></rrr-icon></rrr-button>
        </div>
      </div>
    `

    this.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.addEventListener('input', () => {
        if (!this.setValue) {
          return
        }

        if (this.exerciseKindValue === 'time' && this.setValue.kind === 'time') {
          const secondsInput = this.querySelector<HTMLInputElement>('input[name="seconds"]')
          const notesInput = this.querySelector<HTMLInputElement>('input[name="notes"]')

          this.setValue = {
            ...this.setValue,
            seconds: Number(secondsInput?.value ?? 0),
            notes: notesInput?.value ?? '',
          }
        }

        if (this.exerciseKindValue === 'reps' && this.setValue.kind === 'reps') {
          const repsInput = this.querySelector<HTMLInputElement>('input[name="reps"]')
          const weightInput = this.querySelector<HTMLInputElement>('input[name="weightKg"]')
          const notesInput = this.querySelector<HTMLInputElement>('input[name="notes"]')
          const weightValue = weightInput?.value ?? ''

          this.setValue = {
            ...this.setValue,
            reps: Number(repsInput?.value ?? 0),
            weightKg: weightValue === '' ? null : Number(weightValue),
            notes: notesInput?.value ?? '',
          }
        }

        this.emitChanged(this.setValue)
      })
    })

    this.querySelector<HTMLElement>('rrr-button[data-action="remove"]')?.addEventListener('click', () => {
      if (this.setValue) {
        this.emitRemoved(this.setValue.id)
      }
    })
  }
}

customElements.define('rrr-set-entry', RrrSetEntry)
