import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { RrrNumberStepper } from '../design-system/components/rrr-number-stepper.ts'

let NumberStepperConstructor: typeof RrrNumberStepper

beforeAll(async () => {
  installConstructableStylesheetShim()
  const {
    registerRrrNumberStepper,
    RrrNumberStepper,
  } = await import('../design-system/components/rrr-number-stepper.ts')
  NumberStepperConstructor = RrrNumberStepper
  registerRrrNumberStepper()
})

function createStepper(attributes: Record<string, string> = {}): RrrNumberStepper {
  const stepper = document.createElement('rrr-number-stepper') as RrrNumberStepper
  for (const [name, value] of Object.entries(attributes)) {
    stepper.setAttribute(name, value)
  }
  document.body.append(stepper)
  return stepper
}

function getInput(stepper: RrrNumberStepper): HTMLInputElement {
  return stepper.shadowRoot!.querySelector<HTMLInputElement>('input')!
}

function getButton(stepper: RrrNumberStepper, direction: -1 | 1): HTMLButtonElement {
  return stepper.shadowRoot!.querySelector<HTMLButtonElement>(`[data-step="${direction}"]`)!
}

describe('rrr-number-stepper', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    document.documentElement.lang = 'en-US'
  })

  test('declares native form association', () => {
    expect(NumberStepperConstructor.formAssociated).toBe(true)
  })

  test('steps atomically and disables buttons at finite boundaries', () => {
    const stepper = createStepper({ value: '1', min: '1', max: '2' })
    const inputSpy = vi.fn()
    const changeSpy = vi.fn()
    stepper.addEventListener('input', inputSpy)
    stepper.addEventListener('change', changeSpy)

    expect(getButton(stepper, -1).disabled).toBe(true)
    getButton(stepper, 1).click()

    expect(stepper.value).toBe('2')
    expect(stepper.valueAsNumber).toBe(2)
    expect(getButton(stepper, 1).disabled).toBe(true)
    expect(inputSpy).toHaveBeenCalledOnce()
    expect(changeSpy).toHaveBeenCalledOnce()
  })

  test('uses decimal-safe stepping', () => {
    const stepper = createStepper({ value: '0.2', min: '0', step: '0.1' })

    getButton(stepper, 1).click()

    expect(stepper.value).toBe('0.3')
  })

  test('steps from an empty value to the nearest finite boundary', () => {
    const incrementing = createStepper({ value: '', min: '1', step: '1' })
    const decrementing = createStepper({ value: '', max: '10', step: '1' })

    getButton(incrementing, 1).click()
    getButton(decrementing, -1).click()

    expect(incrementing.value).toBe('1')
    expect(decrementing.value).toBe('10')
  })

  test('formats and accepts decimal values using the supplied locale', () => {
    const stepper = createStepper({ value: '1.5', locale: 'nl-NL' })
    const input = getInput(stepper)

    expect(input.value).toBe('1,5')
    input.focus()
    input.value = '2,5'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(stepper.value).toBe('2.5')
    expect(stepper.valueAsNumber).toBe(2.5)
  })

  test('makes direct editing optional without hiding the numeric value', () => {
    const stepper = createStepper({ value: '3', 'button-only': '' })
    const input = getInput(stepper)

    expect(input.readOnly).toBe(true)
    expect(input.getAttribute('role')).toBe('spinbutton')
    expect(input.getAttribute('aria-valuenow')).toBe('3')
  })

  test('resolves field size from fallback, then max, then uncapped explicit size', () => {
    const stepper = createStepper({ value: '1' })
    const input = getInput(stepper)

    expect(input.style.getPropertyValue('--rrr-number-stepper-field-size')).toBe('3')
    stepper.setAttribute('max', '1000')
    expect(input.style.getPropertyValue('--rrr-number-stepper-field-size')).toBe('4')
    stepper.setAttribute('size', '24')
    expect(input.style.getPropertyValue('--rrr-number-stepper-field-size')).toBe('24')
  })

  test('exposes helper and error text to the input', () => {
    const stepper = createStepper({
      value: '1',
      'helper-text': 'Choose a value',
      'error-text': 'Value is invalid',
    })
    const input = getInput(stepper)
    const message = stepper.shadowRoot!.querySelector<HTMLElement>('#message')!

    expect(message.textContent).toBe('Choose a value')
    expect(message.getAttribute('part')).toBe('helper')
    expect(input.getAttribute('aria-describedby')).toContain('message')

    stepper.setAttribute('invalid', '')

    expect(message.textContent).toBe('Value is invalid')
    expect(message.classList.contains('message--error')).toBe(true)
    expect(message.getAttribute('part')).toBe('error')
    expect(input.hasAttribute('aria-invalid')).toBe(true)
  })
})

function installConstructableStylesheetShim(): void {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }

  const adoptedStyleSheets = new WeakMap<Document | ShadowRoot, CSSStyleSheet[]>()
  const descriptor = {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      return adoptedStyleSheets.get(this) ?? []
    },
    set(this: Document | ShadowRoot, value: CSSStyleSheet[]): void {
      adoptedStyleSheets.set(this, value)
    },
  }

  if (!('adoptedStyleSheets' in Document.prototype)) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', descriptor)
  }
  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', descriptor)
  }
}
