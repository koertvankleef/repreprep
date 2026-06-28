import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListCard } from '../design-system/components/rrr-list-card.ts'
import { registerRrrListRow, type RrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import '../app/components/rrr-appearance-settings.ts'
import '../app/components/rrr-settings.ts'

beforeAll(() => {
  initLocale('en-US')
  registerRrrSection()
  registerRrrListCard()
  registerRrrListRow()
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('list structure primitives', () => {
  test('renders navigation and action rows with honest interactive elements', () => {
    document.body.innerHTML = `
      <rrr-list-card>
        <rrr-list-row href="#/settings" label="Settings" accessory="chevron"></rrr-list-row>
        <rrr-list-row activation="button" label="Export data" disabled></rrr-list-row>
      </rrr-list-card>
    `

    const rows = Array.from(document.querySelectorAll<RrrListRow>('rrr-list-row'))
    const link = rows[0]?.shadowRoot?.querySelector('a')
    const button = rows[1]?.shadowRoot?.querySelector('button')

    expect(link?.getAttribute('href')).toBe('#/settings')
    expect(link?.textContent).toContain('Settings')
    expect(button?.disabled).toBe(true)
    expect(rows[1]?.getAttribute('aria-disabled')).toBe('true')
  })

  test('keeps one radio row selected and supports arrow-key selection', async () => {
    document.body.innerHTML = `
      <rrr-list-card role="radiogroup" aria-label="Theme">
        <rrr-list-row control="radio" name="theme" value="auto" label="Automatic" checked></rrr-list-row>
        <rrr-list-row control="radio" name="theme" value="light" label="Light"></rrr-list-row>
        <rrr-list-row control="radio" name="theme" value="dark" label="Dark"></rrr-list-row>
      </rrr-list-card>
    `
    await Promise.resolve()

    const rows = Array.from(document.querySelectorAll<RrrListRow>('rrr-list-row'))
    const firstInput = rows[0]?.shadowRoot?.querySelector<HTMLInputElement>('input')
    const secondInput = rows[1]?.shadowRoot?.querySelector<HTMLInputElement>('input')

    expect(firstInput?.tabIndex).toBe(0)
    expect(secondInput?.tabIndex).toBe(-1)

    firstInput?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
    }))

    expect(rows[0]?.checked).toBe(false)
    expect(rows[1]?.checked).toBe(true)
    expect(rows[1]?.shadowRoot?.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(0)

    rows[2]?.shadowRoot?.querySelector<HTMLInputElement>('input')?.click()

    expect(rows[1]?.checked).toBe(false)
    expect(rows[2]?.checked).toBe(true)
  })

  test('renders switch semantics and reflects its checked state', () => {
    document.body.innerHTML = `
      <rrr-list-row control="switch" name="wake-lock" label="Keep screen awake"></rrr-list-row>
    `

    const row = document.querySelector<RrrListRow>('rrr-list-row')
    const input = row?.shadowRoot?.querySelector<HTMLInputElement>('input')

    expect(input?.getAttribute('role')).toBe('switch')
    input?.click()
    expect(row?.checked).toBe(true)
  })

  test('hides an empty section header and reveals slotted section copy', async () => {
    const section = document.createElement('rrr-section')
    document.body.appendChild(section)

    expect(section.shadowRoot?.querySelector<HTMLElement>('.header')?.hidden).toBe(true)

    const heading = document.createElement('span')
    heading.slot = 'heading'
    heading.textContent = 'Appearance'
    section.appendChild(heading)
    await Promise.resolve()

    const headingWrapper = section.shadowRoot?.querySelector<HTMLElement>('.heading')
    expect(section.shadowRoot?.querySelector<HTMLElement>('.header')?.hidden).toBe(false)
    expect(headingWrapper?.getAttribute('role')).toBe('heading')
    expect(headingWrapper?.getAttribute('aria-level')).toBe('2')

    section.setAttribute('heading-level', '3')
    expect(headingWrapper?.getAttribute('aria-level')).toBe('3')
  })
})

describe('settings structure', () => {
  test('links to the appearance subpage and shows the current theme', () => {
    const settings = document.createElement('rrr-settings')
    settings.setAttribute('theme', 'dark')
    document.body.appendChild(settings)

    const appearanceRow = settings.querySelector<RrrListRow>('rrr-list-row[href="#/settings/appearance"]')

    expect(appearanceRow?.getAttribute('value-text')).toBe('Dark mode')
    expect(appearanceRow?.getAttribute('accessory')).toBe('value-chevron')
  })

  test('emits preference changes from native radio rows', () => {
    const settings = document.createElement('rrr-appearance-settings')
    settings.setAttribute('theme', 'auto')
    settings.setAttribute('contrast', 'normal')
    const preferenceChange = vi.fn()
    settings.addEventListener('rrr-display-preference-change', preferenceChange)
    document.body.appendChild(settings)

    const darkRow = settings.querySelector<RrrListRow>('rrr-list-row[name="theme"][value="dark"]')
    darkRow?.shadowRoot?.querySelector<HTMLInputElement>('input')?.click()

    expect(preferenceChange).toHaveBeenCalledOnce()
    expect((preferenceChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      preference: 'theme',
      value: 'dark',
    })
  })
})
