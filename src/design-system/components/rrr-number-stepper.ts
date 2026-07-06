import styles from './rrr-number-stepper.css?inline'
import { defineCustomElementOnce } from './shared.ts'

const stepperSheet = new CSSStyleSheet()
stepperSheet.replaceSync(styles)

const template = document.createElement('template')
template.innerHTML = `
  <label part="label" for="value" hidden></label>
  <div class="control" part="control">
    <button class="step-button" part="decrement-button" type="button" data-step="-1">
      <rrr-icon name="subtract"></rrr-icon>
    </button>
    <input
      id="value"
      part="input"
      type="text"
      inputmode="decimal"
      role="spinbutton"
      autocomplete="off"
      spellcheck="false"
    >
    <button class="step-button" part="increment-button" type="button" data-step="1">
      <rrr-icon name="add"></rrr-icon>
    </button>
  </div>
  <p class="message" part="helper" id="message"></p>
`

const defaultFieldSize = 3

export class RrrNumberStepper extends HTMLElement {
  static formAssociated = true

  static observedAttributes = [
    'aria-describedby',
    'aria-label',
    'autofocus',
    'button-only',
    'decrement-label',
    'disabled',
    'enterkeyhint',
    'error-text',
    'helper-text',
    'increment-label',
    'invalid',
    'label',
    'locale',
    'max',
    'min',
    'name',
    'required',
    'size',
    'step',
    'value',
  ]

  private readonly input: HTMLInputElement
  private readonly labelElement: HTMLLabelElement
  private readonly messageElement: HTMLParagraphElement
  private readonly decrementButton: HTMLButtonElement
  private readonly incrementButton: HTMLButtonElement
  private readonly internals: ElementInternals | undefined
  private defaultValue: string | null = null
  private formDisabled = false
  private reflectingValue = false

  constructor() {
    super()

    const internals = this.attachInternals?.()
    this.internals = internals && typeof internals.setFormValue === 'function'
      ? internals
      : undefined
    const shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
    shadowRoot.adoptedStyleSheets = [stepperSheet]
    shadowRoot.appendChild(template.content.cloneNode(true))

    this.input = shadowRoot.querySelector<HTMLInputElement>('input')!
    this.labelElement = shadowRoot.querySelector<HTMLLabelElement>('label')!
    this.messageElement = shadowRoot.querySelector<HTMLParagraphElement>('.message')!
    this.decrementButton = shadowRoot.querySelector<HTMLButtonElement>('[data-step="-1"]')!
    this.incrementButton = shadowRoot.querySelector<HTMLButtonElement>('[data-step="1"]')!

    this.decrementButton.addEventListener('click', () => this.stepBy(-1))
    this.incrementButton.addEventListener('click', () => this.stepBy(1))
    this.input.addEventListener('keydown', (event) => this.handleInputKeydown(event))
    this.input.addEventListener('input', (event) => this.handleInput(event))
    this.input.addEventListener('change', (event) => this.handleChange(event))
    this.input.addEventListener('blur', () => this.formatInputValue())
  }

  connectedCallback(): void {
    this.defaultValue ??= this.value
    this.syncAll(true)

    if (this.hasAttribute('autofocus')) {
      queueMicrotask(() => {
        if (this.isConnected) {
          this.focus()
        }
      })
    }
  }

  attributeChangedCallback(name: string): void {
    if (!this.shadowRoot) {
      return
    }

    this.syncAll(name === 'value' && !this.reflectingValue)
  }

  get value(): string {
    return this.getAttribute('value') ?? ''
  }

  set value(nextValue: string | number) {
    this.setAttribute('value', String(nextValue))
  }

  get valueAsNumber(): number {
    return this.parseCanonicalNumber(this.value) ?? Number.NaN
  }

  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null
  }

  get validity(): ValidityState {
    return this.internals?.validity ?? this.input.validity
  }

  get validationMessage(): string {
    return this.internals?.validationMessage ?? this.input.validationMessage
  }

  get willValidate(): boolean {
    return this.internals?.willValidate ?? false
  }

  checkValidity(): boolean {
    return this.internals?.checkValidity() ?? true
  }

  reportValidity(): boolean {
    return this.internals?.reportValidity() ?? true
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled
    this.syncAll()
  }

  formResetCallback(): void {
    this.value = this.defaultValue ?? ''
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') {
      this.value = state
    }
  }

  override focus(options?: FocusOptions): void {
    this.input.focus(options)
  }

  private syncAll(forceValueDisplay = false): void {
    const label = this.getAttribute('label') ?? ''
    const disabled = this.isDisabled

    this.labelElement.textContent = label
    this.labelElement.hidden = label.length === 0
    this.input.required = this.hasAttribute('required')
    this.input.readOnly = this.hasAttribute('button-only')
    this.input.disabled = disabled
    this.input.lang = this.locale
    this.reflectEnterKeyHint()
    this.input.setAttribute('aria-readonly', this.input.readOnly ? 'true' : 'false')

    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel) {
      this.input.setAttribute('aria-label', ariaLabel)
    } else {
      this.input.removeAttribute('aria-label')
    }

    this.decrementButton.setAttribute(
      'aria-label',
      this.getAttribute('decrement-label') || (label ? `− ${label}` : '−'),
    )
    this.incrementButton.setAttribute(
      'aria-label',
      this.getAttribute('increment-label') || (label ? `+ ${label}` : '+'),
    )

    if (forceValueDisplay || this.shadowRoot?.activeElement !== this.input) {
      this.formatInputValue()
    }

    this.syncFieldSize()
    this.syncMessage()
    this.syncValueSemantics()
    this.syncButtonState()
    this.syncFormState()
    this.setAttribute('aria-disabled', disabled ? 'true' : 'false')
  }

  private handleInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    this.stepBy(event.key === 'ArrowUp' ? 1 : -1)
  }

  private handleInput(event: Event): void {
    event.stopPropagation()
    const value = this.parseLocalizedNumber(this.input.value)
    this.reflectValue(value === null ? '' : this.stringifyNumber(value))
    this.syncValueSemantics()
    this.syncButtonState()
    this.syncFormState()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private handleChange(event: Event): void {
    event.stopPropagation()
    this.formatInputValue()
    this.syncFormState()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private stepBy(direction: -1 | 1): void {
    if (this.isDisabled) {
      return
    }

    const min = this.minimum
    const max = this.maximum
    const step = this.step
    const current = this.currentNumber
    let next: number

    if (current === null && direction === 1 && Number.isFinite(min)) {
      next = min
    } else if (current === null && direction === -1 && Number.isFinite(max)) {
      next = max
    } else {
      const base = current ?? 0
      const precision = Math.max(
        this.decimalPlaces(base),
        this.decimalPlaces(step),
        Number.isFinite(min) ? this.decimalPlaces(min) : 0,
        Number.isFinite(max) ? this.decimalPlaces(max) : 0,
      )
      const scale = 10 ** Math.min(precision, 12)
      next = (Math.round(base * scale) + direction * Math.round(step * scale)) / scale
    }

    if (next < min) {
      next = min
    }
    if (next > max) {
      next = max
    }

    this.reflectValue(this.stringifyNumber(next))
    this.input.value = this.formatNumber(next)
    this.syncValueSemantics()
    this.syncButtonState()
    this.syncFormState()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private syncButtonState(): void {
    const disabled = this.isDisabled
    const value = this.currentNumber
    this.decrementButton.disabled = disabled || (value !== null && value <= this.minimum)
    this.incrementButton.disabled = disabled || (value !== null && value >= this.maximum)
  }

  private reflectEnterKeyHint(): void {
    const enterKeyHint = this.getAttribute('enterkeyhint')
    if (enterKeyHint === null) {
      this.input.removeAttribute('enterkeyhint')
      return
    }

    this.input.setAttribute('enterkeyhint', enterKeyHint)
  }

  private syncValueSemantics(): void {
    const value = this.currentNumber
    this.reflectAriaNumber('aria-valuemin', this.minimum)
    this.reflectAriaNumber('aria-valuemax', this.maximum)

    if (value === null) {
      this.input.removeAttribute('aria-valuenow')
      this.input.removeAttribute('aria-valuetext')
      return
    }

    this.input.setAttribute('aria-valuenow', this.stringifyNumber(value))
    this.input.setAttribute('aria-valuetext', this.formatNumber(value))
  }

  private reflectAriaNumber(name: 'aria-valuemin' | 'aria-valuemax', value: number): void {
    if (Number.isFinite(value)) {
      this.input.setAttribute(name, this.stringifyNumber(value))
    } else {
      this.input.removeAttribute(name)
    }
  }

  private syncMessage(): void {
    const invalid = this.hasAttribute('invalid')
    const errorText = invalid ? this.getAttribute('error-text') ?? '' : ''
    const helperText = this.getAttribute('helper-text') ?? ''
    const message = errorText || helperText
    const describedBy = [
      this.getAttribute('aria-describedby'),
      message ? 'message' : null,
    ].filter(Boolean).join(' ')

    this.messageElement.textContent = message
    this.messageElement.classList.toggle('message--error', Boolean(errorText))
    this.messageElement.setAttribute('part', errorText ? 'error' : 'helper')
    if (invalid) {
      this.input.setAttribute('aria-invalid', 'true')
    } else {
      this.input.removeAttribute('aria-invalid')
    }

    if (describedBy) {
      this.input.setAttribute('aria-describedby', describedBy)
    } else {
      this.input.removeAttribute('aria-describedby')
    }
  }

  private syncFieldSize(): void {
    const explicitSize = this.parsePositiveInteger(this.getAttribute('size'))
    let fieldSize = defaultFieldSize

    if (Number.isFinite(this.maximum)) {
      fieldSize = Math.max(
        this.formatNumber(this.maximum).length,
        Number.isFinite(this.minimum) ? this.formatNumber(this.minimum).length : 0,
        1,
      )
    }

    if (explicitSize !== null) {
      fieldSize = explicitSize
    }

    this.input.style.setProperty(
      '--rrr-number-stepper-field-size',
      String(fieldSize),
    )
  }

  private syncFormState(): void {
    if (!this.internals) {
      return
    }

    this.internals.setFormValue(this.value, this.value)
    const validationInput = document.createElement('input')
    validationInput.type = 'number'
    validationInput.lang = this.locale
    validationInput.required = this.hasAttribute('required')
    validationInput.value = this.value

    if (Number.isFinite(this.minimum)) {
      validationInput.min = this.stringifyNumber(this.minimum)
    }
    if (Number.isFinite(this.maximum)) {
      validationInput.max = this.stringifyNumber(this.maximum)
    }
    validationInput.step = this.stringifyNumber(this.step)

    const validity = validationInput.validity
    const flags: ValidityStateFlags = {
      badInput: validity.badInput,
      customError: validity.customError,
      patternMismatch: validity.patternMismatch,
      rangeOverflow: validity.rangeOverflow,
      rangeUnderflow: validity.rangeUnderflow,
      stepMismatch: validity.stepMismatch,
      tooLong: validity.tooLong,
      tooShort: validity.tooShort,
      typeMismatch: validity.typeMismatch,
      valueMissing: validity.valueMissing,
    }

    if (validationInput.checkValidity()) {
      this.internals.setValidity({})
    } else {
      this.internals.setValidity(flags, validationInput.validationMessage, this.input)
    }
  }

  private formatInputValue(): void {
    const value = this.parseCanonicalNumber(this.value)
    this.input.value = value === null ? '' : this.formatNumber(value)
  }

  private reflectValue(value: string): void {
    try {
      this.reflectingValue = true
      this.setAttribute('value', value)
    } finally {
      this.reflectingValue = false
    }
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 20,
      useGrouping: false,
    }).format(Object.is(value, -0) ? 0 : value)
  }

  private parseLocalizedNumber(rawValue: string): number | null {
    let value = rawValue.trim().replaceAll('\u2212', '-')
    if (!value) {
      return null
    }

    const parts = new Intl.NumberFormat(this.locale).formatToParts(-1234.5)
    const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.'
    const minus = parts.find((part) => part.type === 'minusSign')?.value
    const group = parts.find((part) => part.type === 'group')?.value

    if (minus && minus !== '-') {
      value = value.replaceAll(minus, '-')
    }
    if (group && group !== '.' && group !== ',') {
      value = value.replaceAll(group, '')
    }
    if (decimal !== '.') {
      value = value.replaceAll(decimal, '.')
    }

    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      return null
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  private parseCanonicalNumber(rawValue: string | null): number | null {
    if (rawValue === null || !rawValue.trim()) {
      return null
    }

    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : null
  }

  private parsePositiveInteger(rawValue: string | null): number | null {
    const parsed = Number(rawValue)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  private stringifyNumber(value: number): string {
    return String(Object.is(value, -0) ? 0 : value)
  }

  private decimalPlaces(value: number): number {
    const text = this.stringifyNumber(value).toLowerCase()
    if (!text.includes('e')) {
      return text.split('.')[1]?.length ?? 0
    }

    const [coefficient = '', exponentText = '0'] = text.split('e')
    const coefficientDecimals = coefficient.split('.')[1]?.length ?? 0
    return Math.max(0, coefficientDecimals - Number(exponentText))
  }

  private get locale(): string {
    return this.getAttribute('locale') || document.documentElement.lang || 'en-US'
  }

  private get currentNumber(): number | null {
    if (this.shadowRoot?.activeElement === this.input) {
      return this.parseLocalizedNumber(this.input.value)
    }

    return this.parseCanonicalNumber(this.value)
  }

  private get minimum(): number {
    return this.parseCanonicalNumber(this.getAttribute('min')) ?? Number.NEGATIVE_INFINITY
  }

  private get maximum(): number {
    return this.parseCanonicalNumber(this.getAttribute('max')) ?? Number.POSITIVE_INFINITY
  }

  private get step(): number {
    const step = this.parseCanonicalNumber(this.getAttribute('step'))
    return step !== null && step > 0 ? step : 1
  }

  private get isDisabled(): boolean {
    return this.hasAttribute('disabled') || this.formDisabled
  }
}

export function registerRrrNumberStepper(): void {
  defineCustomElementOnce('rrr-number-stepper', RrrNumberStepper)
}
