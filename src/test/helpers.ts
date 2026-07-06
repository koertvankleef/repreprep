import { it } from 'vitest'
import { initLocale } from '../i18n/index.ts'

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type Suffix3 = `${Digit}${Digit}${Digit}`
export type SpecId = `${string}-${string}-${Suffix3}`

export type SpecMapEntry = {
  testName: string
  ids: SpecId[]
}

const specMap: SpecMapEntry[] = []

export function getSpecMap(): SpecMapEntry[] {
  return specMap
}

type MaybePromise<T> = T | Promise<T>

/**
 * Define a test with spec IDs. Test name stays clean in output; IDs are
 * stored in the spec map for coverage reporting.
 */
export function specIt(
  name: string,
  ids: SpecId[],
  fn: () => MaybePromise<unknown>,
  timeout?: number,
): void {
  it(name, () => fn(), timeout)
  specMap.push({ testName: name, ids: [...ids] })
}

export function initTestLocale(): void {
  initLocale('en-US')
}

export function getDeepActiveElement(): Element | null {
  let activeElement: Element | null = document.activeElement
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement
  }
  return activeElement
}

export function enterKeyEvent(options: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: 'Enter',
    ...options,
  })
}
