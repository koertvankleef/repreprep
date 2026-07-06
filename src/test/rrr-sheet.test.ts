import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { registerRrrSheet, type RrrSheet } from '../design-system/components/rrr-sheet.ts'
import { getTopSheetPresentation } from '../foundation/presentation-stack.ts'
import { toastService } from '../foundation/toast.ts'
import { confirmSheet, presentSheet } from '../utils/sheet-service.ts'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListCard } from '../design-system/components/rrr-list-card.ts'
import { registerRrrListRow } from '../design-system/components/rrr-list-row.ts'

beforeAll(async () => {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }

  const [
    { registerRrrInput },
    { registerRrrNumberStepper },
  ] = await Promise.all([
    import('../design-system/components/rrr-input.ts'),
    import('../design-system/components/rrr-number-stepper.ts'),
  ])

  registerRrrSheet()
  registerRrrInput()
  registerRrrNumberStepper()
  registerRrrListRow()
  registerRrrListCard()

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = false
    },
  })
})

beforeEach(() => {
  document.body.innerHTML = ''
  initLocale('en-US')
})

describe('sheet presentation', () => {
  test('stacks independent sheets and dismisses only the top sheet', async () => {
    const firstResult = confirmSheet({
      title: 'First task',
      message: 'First message',
      confirmLabel: 'Continue',
    })
    const secondResult = confirmSheet({
      title: 'Second task',
      message: 'Second message',
      confirmLabel: 'Continue',
    })

    const sheets = Array.from(document.querySelectorAll<HTMLElement>('rrr-sheet'))
    const firstDialog = sheets[0]?.querySelector<HTMLDialogElement>('dialog')
    const secondDialog = sheets[1]?.querySelector<HTMLDialogElement>('dialog')

    expect(sheets).toHaveLength(2)
    expect(firstDialog?.open).toBe(true)
    expect(secondDialog?.open).toBe(true)
    expect(getTopSheetPresentation()?.host).toBe(sheets[1])
    expect(sheets[0]?.dataset.sheetStackDepth).toBe('1')
    expect(sheets[1]?.dataset.sheetStackDepth).toBe('2')
    expect(sheets[0]?.style.getPropertyValue('--rrr-sheet-stack-offset')).toBe(
      'calc(var(--rrr-sheet-stack-step))',
    )
    expect(sheets[1]?.style.getPropertyValue('--rrr-sheet-stack-offset')).toBe(
      'calc(var(--rrr-sheet-stack-step) + var(--rrr-sheet-stack-step))',
    )

    firstDialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(firstDialog?.hasAttribute('data-closing')).toBe(false)

    secondDialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
    await expect(secondResult).resolves.toBe(false)

    expect(firstDialog?.open).toBe(true)
    expect(getTopSheetPresentation()?.host).toBe(sheets[0])
    expect(sheets[0]?.dataset.sheetStackDepth).toBe('1')
    expect(sheets[0]?.style.getPropertyValue('--rrr-sheet-stack-offset')).toBe(
      'calc(var(--rrr-sheet-stack-step))',
    )
    expect(sheets[1]?.dataset.sheetStackDepth).toBeUndefined()
    expect(sheets[1]?.style.getPropertyValue('--rrr-sheet-stack-offset')).toBe('')

    sheets[0]?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(firstResult).resolves.toBe(true)
  })

  test('recalculates presentation depth when a sheet leaves the middle of the stack', async () => {
    const firstResult = confirmSheet({
      title: 'First task',
      message: 'First message',
      confirmLabel: 'Continue',
    })
    const secondResult = confirmSheet({
      title: 'Second task',
      message: 'Second message',
      confirmLabel: 'Continue',
    })
    const thirdResult = confirmSheet({
      title: 'Third task',
      message: 'Third message',
      confirmLabel: 'Continue',
    })
    const sheets = Array.from(document.querySelectorAll<HTMLElement>('rrr-sheet'))

    expect(sheets.map((sheet) => sheet.dataset.sheetStackDepth)).toEqual([
      '1',
      '2',
      '3',
    ])

    sheets[1]?.remove()
    await expect(secondResult).resolves.toBe(false)

    expect(sheets[0]?.dataset.sheetStackDepth).toBe('1')
    expect(sheets[2]?.dataset.sheetStackDepth).toBe('2')
    expect(sheets[2]?.style.getPropertyValue('--rrr-sheet-stack-offset')).toBe(
      'calc(var(--rrr-sheet-stack-step) + var(--rrr-sheet-stack-step))',
    )

    sheets[2]?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(thirdResult).resolves.toBe(true)
    sheets[0]?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(firstResult).resolves.toBe(true)
  })

  test('dismisses from the backdrop and restores focus', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()

    const result = confirmSheet({
      title: 'Delete routine?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      confirmTone: 'danger',
    })
    const dialog = document.querySelector<HTMLDialogElement>('rrr-sheet dialog')

    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await expect(result).resolves.toBe(false)

    expect(document.activeElement).toBe(trigger)
  })

  test('provides a localized assistive dismiss control', async () => {
    const result = confirmSheet({
      title: 'Choose a value',
      message: 'Select an option.',
      confirmLabel: 'Confirm',
    })
    const dismissButton = document.querySelector<HTMLButtonElement>('.sheet-assistive-dismiss')

    expect(dismissButton?.type).toBe('button')
    expect(dismissButton?.textContent).toBe('Close')

    dismissButton?.click()
    await expect(result).resolves.toBe(false)
  })

  test('omits the assistive dismiss control when the sheet is non-dismissible', async () => {
    const result = confirmSheet({
      title: 'Required decision',
      message: 'This workflow requires confirmation.',
      confirmLabel: 'Confirm',
      dismissible: false,
    })
    const dialog = document.querySelector<HTMLDialogElement>('rrr-sheet dialog')

    expect(dialog?.querySelector('.sheet-assistive-dismiss')).toBeNull()
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(dialog?.hasAttribute('data-closing')).toBe(false)

    dialog?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(result).resolves.toBe(true)
  })

  test('dismisses after a deliberate downward handle drag', async () => {
    const result = confirmSheet({
      title: 'Drag sheet',
      message: 'Drag the handle down.',
      confirmLabel: 'Continue',
    })
    const handle = document.querySelector<HTMLElement>('[data-drag-handle]')

    handle?.dispatchEvent(pointerEvent('pointerdown', 1, 10))
    handle?.dispatchEvent(pointerEvent('pointermove', 1, 90))
    handle?.dispatchEvent(pointerEvent('pointerup', 1, 90))

    await expect(result).resolves.toBe(false)
  })

  test('presents authored heading, body, and action content without replacing it', async () => {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.textContent = 'Interactive task'
    const body = document.createElement('div')
    body.slot = 'body'
    body.innerHTML = '<label>Value <input autofocus></label>'
    const action = document.createElement('button')
    action.slot = 'actions'
    action.dataset.sheetResult = 'saved'
    action.textContent = 'Save'
    sheet.append(heading, body, action)

    const result = presentSheet(sheet)

    expect(sheet.querySelector('.sheet-content > h3')).toBe(heading)
    expect(sheet.querySelector('.sheet-body > [slot="body"]')).toBe(body)
    expect(sheet.querySelector('.sheet-actions > [slot="actions"]')).toBe(action)
    expect(document.activeElement).toBe(body.querySelector('input'))

    action.click()
    await expect(result).resolves.toBe('saved')
  })

  test('advances eligible fields with Enter and confirms from the final field', async () => {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.textContent = 'Edit values'

    const firstField = document.createElement('rrr-input')
    firstField.slot = 'body'
    firstField.setAttribute('autofocus', '')
    const skippedField = document.createElement('rrr-input')
    skippedField.slot = 'body'
    skippedField.setAttribute('disabled', '')
    const finalField = document.createElement('rrr-number-stepper')
    finalField.slot = 'body'

    const confirm = document.createElement('button')
    confirm.slot = 'actions'
    confirm.dataset.sheetResult = 'confirm'
    confirm.textContent = 'Confirm'
    sheet.append(heading, firstField, skippedField, finalField, confirm)

    const result = presentSheet(sheet)
    await Promise.resolve()

    const firstInput = firstField.shadowRoot!.querySelector<HTMLInputElement>('input')!
    const skippedInput = skippedField.shadowRoot!.querySelector<HTMLInputElement>('input')!
    const finalInput = finalField.shadowRoot!.querySelector<HTMLInputElement>('input')!

    expect(firstInput.getAttribute('enterkeyhint')).toBe('next')
    expect(skippedInput.hasAttribute('enterkeyhint')).toBe(false)
    expect(finalInput.getAttribute('enterkeyhint')).toBe('done')

    firstInput.focus()
    const modifiedEnter = enterKeyEvent({ shiftKey: true })
    firstInput.dispatchEvent(modifiedEnter)
    expect(modifiedEnter.defaultPrevented).toBe(false)
    expect(getDeepActiveElement()).toBe(firstInput)

    const composingEnter = enterKeyEvent({ isComposing: true })
    firstInput.dispatchEvent(composingEnter)
    expect(composingEnter.defaultPrevented).toBe(false)
    expect(getDeepActiveElement()).toBe(firstInput)

    const nextEnter = enterKeyEvent()
    firstInput.dispatchEvent(nextEnter)
    expect(nextEnter.defaultPrevented).toBe(true)
    expect(getDeepActiveElement()).toBe(finalInput)

    const confirmEnter = enterKeyEvent()
    finalInput.dispatchEvent(confirmEnter)
    expect(confirmEnter.defaultPrevented).toBe(true)
    await expect(result).resolves.toBe('confirm')
  })

  test('does not confirm from Enter while the confirm action is disabled', async () => {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.textContent = 'Required value'
    const field = document.createElement('input')
    field.slot = 'body'
    const confirm = document.createElement('button')
    confirm.slot = 'actions'
    confirm.dataset.sheetResult = 'confirm'
    confirm.disabled = true
    sheet.append(heading, field, confirm)

    const result = presentSheet(sheet)
    await Promise.resolve()

    const input = field
    expect(input.getAttribute('enterkeyhint')).toBe('done')
    const enter = enterKeyEvent()
    input.dispatchEvent(enter)

    expect(enter.defaultPrevented).toBe(true)
    expect(sheet.querySelector('dialog')?.hasAttribute('data-closing')).toBe(false)

    confirm.disabled = false
    const enabledEnter = enterKeyEvent()
    input.dispatchEvent(enabledEnter)
    expect(enabledEnter.defaultPrevented).toBe(true)
    await expect(result).resolves.toBe('confirm')
  })

  test('treats a radio group as one choice before advancing', async () => {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.textContent = 'Choose a mode'
    const choices = document.createElement('rrr-list-card')
    choices.slot = 'body'
    choices.setAttribute('role', 'radiogroup')

    const firstChoice = document.createElement('rrr-list-row')
    firstChoice.setAttribute('control', 'radio')
    firstChoice.setAttribute('name', 'mode')
    firstChoice.setAttribute('label', 'Automatic')
    firstChoice.setAttribute('checked', '')
    const secondChoice = document.createElement('rrr-list-row')
    secondChoice.setAttribute('control', 'radio')
    secondChoice.setAttribute('name', 'mode')
    secondChoice.setAttribute('label', 'Custom')
    choices.append(firstChoice, secondChoice)

    const nextField = document.createElement('rrr-input')
    nextField.slot = 'body'
    const confirm = document.createElement('button')
    confirm.slot = 'actions'
    confirm.dataset.sheetResult = 'confirm'
    sheet.append(heading, choices, nextField, confirm)

    const result = presentSheet(sheet)
    await Promise.resolve()
    await Promise.resolve()

    const secondRadio = secondChoice.querySelector<HTMLInputElement>('input')!
    secondRadio.click()
    await Promise.resolve()

    expect((secondChoice as HTMLElement & { checked: boolean }).checked).toBe(true)
    expect(getDeepActiveElement()).toBe(
      nextField.shadowRoot!.querySelector<HTMLInputElement>('input'),
    )

    confirm.click()
    await expect(result).resolves.toBe('confirm')
  })

  test('reaffirms an already selected radio and toggles checkbox controls', async () => {
    const choiceSheet = document.createElement('rrr-sheet') as RrrSheet
    const choiceHeading = document.createElement('h3')
    choiceHeading.slot = 'heading'
    choiceHeading.textContent = 'Choose a source'
    const choices = document.createElement('rrr-list-card')
    choices.slot = 'body'
    const selectedChoice = document.createElement('rrr-list-row')
    selectedChoice.setAttribute('control', 'radio')
    selectedChoice.setAttribute('name', 'source')
    selectedChoice.setAttribute('checked', '')
    choices.append(selectedChoice)
    choices.addEventListener(
      'rrr-list-row-control-activate',
      () => choiceSheet.close('selected'),
    )
    choiceSheet.append(choiceHeading, choices)

    const choiceResult = presentSheet(choiceSheet)
    await Promise.resolve()
    await Promise.resolve()
    const selectedRadio = selectedChoice.querySelector<HTMLInputElement>('input')!
    selectedRadio.click()
    await expect(choiceResult).resolves.toBe('selected')

    const toggleSheet = document.createElement('rrr-sheet') as RrrSheet
    const toggleHeading = document.createElement('h3')
    toggleHeading.slot = 'heading'
    toggleHeading.textContent = 'Choose an option'
    const checkbox = document.createElement('rrr-list-row')
    checkbox.slot = 'body'
    checkbox.setAttribute('control', 'checkbox')
    const confirm = document.createElement('button')
    confirm.slot = 'actions'
    confirm.dataset.sheetResult = 'confirm'
    toggleSheet.append(toggleHeading, checkbox, confirm)

    const toggleResult = presentSheet(toggleSheet)
    await Promise.resolve()
    await Promise.resolve()
    const checkboxInput = checkbox.querySelector<HTMLInputElement>('input')!
    checkboxInput.dispatchEvent(enterKeyEvent())

    expect((checkbox as HTMLElement & { checked: boolean }).checked).toBe(true)
    await expect(toggleResult).resolves.toBe('confirm')
  })

  test('preserves native Enter behavior outside eligible single-line fields', async () => {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const heading = document.createElement('h3')
    heading.slot = 'heading'
    heading.textContent = 'Write notes'
    const body = document.createElement('div')
    body.slot = 'body'
    const textarea = document.createElement('textarea')
    const buttonOnlyStepper = document.createElement('rrr-number-stepper')
    buttonOnlyStepper.setAttribute('button-only', '')
    body.append(textarea, buttonOnlyStepper)
    const confirm = document.createElement('button')
    confirm.slot = 'actions'
    confirm.dataset.sheetResult = 'confirm'
    sheet.append(heading, body, confirm)

    const result = presentSheet(sheet)
    const enter = enterKeyEvent()
    textarea.dispatchEvent(enter)

    expect(enter.defaultPrevented).toBe(false)
    expect(sheet.querySelector('dialog')?.hasAttribute('data-closing')).toBe(false)

    const stepperInput = buttonOnlyStepper.shadowRoot!
      .querySelector<HTMLInputElement>('input')!
    const stepperEnter = enterKeyEvent()
    stepperInput.dispatchEvent(stepperEnter)
    expect(stepperEnter.defaultPrevented).toBe(false)
    expect(stepperInput.hasAttribute('enterkeyhint')).toBe(false)

    confirm.click()
    await expect(result).resolves.toBe('confirm')
  })

  test('places toasts inside the top sheet presentation layer', async () => {
    const result = confirmSheet({
      title: 'Sheet with feedback',
      message: 'The toast belongs above this sheet.',
      confirmLabel: 'Done',
    })
    const dialog = document.querySelector<HTMLDialogElement>('rrr-sheet dialog')

    toastService.success('Saved', { durationMs: 10_000 })

    expect(dialog?.querySelector('#rrr-toast-root')).not.toBeNull()
    dialog?.querySelector<HTMLElement>('[data-action="confirm"]')?.click()
    await expect(result).resolves.toBe(true)
    expect(document.body.querySelector('#rrr-toast-root')).not.toBeNull()
  })
})

function pointerEvent(type: string, pointerId: number, clientY: number): Event {
  const event = new MouseEvent(type, { bubbles: true, clientY })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  return event
}

function enterKeyEvent(options: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: 'Enter',
    ...options,
  })
}

function getDeepActiveElement(): Element | null {
  let activeElement: Element | null = document.activeElement
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement
  }
  return activeElement
}
