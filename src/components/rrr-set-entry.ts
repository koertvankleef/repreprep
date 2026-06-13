import type { ExerciseKind, SetEntry } from '../domain/types.ts'
import { shadowTypographyStyles } from '../styles/shadow-styles.ts'

const styles = `
  ${shadowTypographyStyles}

  .set {
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-md);
    padding: var(--rrr-space-md);
    background: var(--rrr-color-surface);
    display: grid;
    gap: var(--rrr-space-sm);
  }

  .fields {
    display: grid;
    gap: var(--rrr-space-sm);
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
`

export class RrrSetEntry extends HTMLElement {
  private setValue: SetEntry | null = null
  private exerciseKindValue: ExerciseKind = 'reps-weight'

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

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
    if (!this.shadowRoot || !this.setValue) {
      return
    }

    const set = this.setValue

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="set">
        <div class="fields">
          ${
            this.exerciseKindValue === 'duration'
              ? `
                <label>
                  Seconds
                  <input type="number" min="0" step="1" name="seconds" value="${set.kind === 'duration' ? set.seconds : 0}" />
                </label>
              `
              : `
                <label>
                  Reps
                  <input type="number" min="0" step="1" name="reps" value="${set.kind === 'reps-weight' ? set.reps : 0}" />
                </label>
                <label>
                  Weight (kg)
                  <input type="number" min="0" step="0.5" name="weightKg" value="${set.kind === 'reps-weight' && set.weightKg !== null ? set.weightKg : ''}" />
                </label>
              `
          }
        </div>
        <label>
          Notes
          <input type="text" name="notes" value="${set.notes}" placeholder="Optional notes" />
        </label>
        <div class="actions">
          <button type="button" data-action="remove">Remove Set</button>
        </div>
      </div>
    `

    this.shadowRoot.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.addEventListener('input', () => {
        if (!this.setValue) {
          return
        }

        if (this.exerciseKindValue === 'duration' && this.setValue.kind === 'duration') {
          const secondsInput = this.shadowRoot?.querySelector<HTMLInputElement>('input[name="seconds"]')
          const notesInput = this.shadowRoot?.querySelector<HTMLInputElement>('input[name="notes"]')

          this.setValue = {
            ...this.setValue,
            seconds: Number(secondsInput?.value ?? 0),
            notes: notesInput?.value ?? '',
          }
        }

        if (this.exerciseKindValue === 'reps-weight' && this.setValue.kind === 'reps-weight') {
          const repsInput = this.shadowRoot?.querySelector<HTMLInputElement>('input[name="reps"]')
          const weightInput = this.shadowRoot?.querySelector<HTMLInputElement>('input[name="weightKg"]')
          const notesInput = this.shadowRoot?.querySelector<HTMLInputElement>('input[name="notes"]')
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

    this.shadowRoot.querySelector<HTMLButtonElement>('button[data-action="remove"]')?.addEventListener('click', () => {
      if (this.setValue) {
        this.emitRemoved(this.setValue.id)
      }
    })
  }
}

customElements.define('rrr-set-entry', RrrSetEntry)
