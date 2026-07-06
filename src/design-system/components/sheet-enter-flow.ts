import type { RrrListRow } from './rrr-list-row.ts'

const textFieldSelectors = [
  'rrr-input:not([data-sheet-enter-ignore])',
  'rrr-number-stepper:not([data-sheet-enter-ignore])',
  'input:not([data-sheet-enter-ignore])',
]
const controlSelectors = [
  'rrr-list-row[control="radio"]:not([data-sheet-enter-ignore])',
  'rrr-list-row[control="checkbox"]:not([data-sheet-enter-ignore])',
  'rrr-list-row[control="switch"]:not([data-sheet-enter-ignore])',
]
const textFieldSelector = textFieldSelectors.join(',')
const controlSelector = controlSelectors.join(',')
const fieldSelector = [...textFieldSelectors, ...controlSelectors].join(',')
const bodyFieldSelector = [...textFieldSelectors, ...controlSelectors]
  .map((selector) => `.sheet-body ${selector}`)
  .join(',')
const bodyTextFieldSelector = textFieldSelectors
  .map((selector) => `.sheet-body ${selector}`)
  .join(',')
const nativeInputTypes = new Set([
  'email',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'url',
])

export class SheetEnterFlow {
  private readonly observer: MutationObserver

  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly shouldStop: () => boolean,
  ) {
    this.observer = new MutationObserver(() => {
      this.syncHints()
    })
  }

  connect(): void {
    this.dialog.addEventListener('keydown', this.handleKeyDown)
    this.observer.observe(this.dialog, {
      attributes: true,
      attributeFilter: [
        'button-only',
        'data-sheet-enter-ignore',
        'disabled',
        'hidden',
        'readonly',
        'type',
      ],
      childList: true,
      subtree: true,
    })
    this.syncHints()
  }

  disconnect(): void {
    this.dialog.removeEventListener('keydown', this.handleKeyDown)
    this.observer.disconnect()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Enter'
      || event.repeat
      || event.isComposing
      || event.keyCode === 229
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
    ) {
      return
    }

    const path = event.composedPath()
    const input = path.find((node): node is HTMLInputElement =>
      node instanceof HTMLInputElement)
    const fieldHost = path.find((node): node is HTMLElement =>
      node instanceof HTMLElement
      && !(node instanceof HTMLInputElement)
      && node.matches(fieldSelector))
    const field = fieldHost ?? (
      input?.matches('input:not([data-sheet-enter-ignore])')
        ? input
        : undefined
    )
    if (!input || !field || !this.isAvailable(field)) {
      return
    }

    if (field.matches(controlSelector)) {
      event.preventDefault()
      this.activateControl(field as RrrListRow, input)
      if (this.shouldStop()) {
        return
      }
    }

    const fields = this.getFields()
    const currentIndex = fields.findIndex((candidate) =>
      this.isSameField(candidate, field))
    if (currentIndex < 0) {
      return
    }

    const nextField = fields[currentIndex + 1]
    if (nextField) {
      event.preventDefault()
      nextField.focus()
      return
    }

    const confirmAction = this.getConfirmAction()
    if (!confirmAction) {
      return
    }

    event.preventDefault()
    if (
      !confirmAction.hasAttribute('disabled')
      && confirmAction.getAttribute('aria-disabled') !== 'true'
    ) {
      confirmAction.click()
    }
  }

  private getFields(): HTMLElement[] {
    const fields = Array.from(
      this.dialog.querySelectorAll<HTMLElement>(bodyFieldSelector),
    ).filter((field) => this.isAvailable(field))

    const normalizedFields: HTMLElement[] = []
    for (const field of fields) {
      if (!this.isRadioRow(field)) {
        normalizedFields.push(field)
        continue
      }

      if (normalizedFields.some((candidate) =>
        this.isSameRadioGroup(candidate, field))) {
        continue
      }

      const groupRows = fields.filter((candidate) =>
        this.isSameRadioGroup(candidate, field))
      normalizedFields.push(
        groupRows.find((candidate) => (candidate as RrrListRow).checked)
          ?? groupRows[0]!,
      )
    }

    return normalizedFields
  }

  private getConfirmAction(): HTMLElement | null {
    return this.dialog.querySelector<HTMLElement>(
      '[data-sheet-result="confirm"]',
    )
  }

  private syncHints(): void {
    const allFields = this.dialog.querySelectorAll<HTMLElement>(
      bodyTextFieldSelector,
    )
    allFields.forEach((field) => field.removeAttribute('enterkeyhint'))

    if (!this.getConfirmAction()) {
      return
    }

    const fields = this.getFields()
    fields.forEach((field, index) => {
      if (field.matches(textFieldSelector)) {
        field.setAttribute(
          'enterkeyhint',
          index === fields.length - 1 ? 'done' : 'next',
        )
      }
    })
  }

  private activateControl(row: RrrListRow, input: HTMLInputElement): void {
    if (row.control === 'radio') {
      const wasChecked = row.checked
      row.selectControl()
      if (wasChecked) {
        row.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
      return
    }

    input.click()
  }

  private isSameField(candidate: HTMLElement, field: HTMLElement): boolean {
    return candidate === field || this.isSameRadioGroup(candidate, field)
  }

  private isRadioRow(field: HTMLElement): field is RrrListRow {
    return field.matches('rrr-list-row[control="radio"]')
  }

  private isSameRadioGroup(first: HTMLElement, second: HTMLElement): boolean {
    if (!this.isRadioRow(first) || !this.isRadioRow(second)) {
      return false
    }

    return first.name === second.name
      && this.getRadioGroupContainer(first) === this.getRadioGroupContainer(second)
  }

  private getRadioGroupContainer(row: HTMLElement): Element | null {
    return row.closest('[role="radiogroup"], rrr-list-card')
      ?? row.parentElement
  }

  private isAvailable(field: HTMLElement): boolean {
    if (field instanceof HTMLInputElement) {
      if (
        !nativeInputTypes.has(field.type)
        || field.readOnly
        || field.closest('rrr-list-row')
      ) {
        return false
      }
    }

    if (
      field.tagName.toLowerCase() === 'rrr-number-stepper'
      && field.hasAttribute('button-only')
    ) {
      return false
    }

    return !field.hasAttribute('disabled')
      && field.getAttribute('aria-disabled') !== 'true'
      && !field.hasAttribute('hidden')
      && !field.closest('[hidden]')
  }
}
