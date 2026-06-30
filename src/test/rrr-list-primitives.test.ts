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
  test('renders navigation and action rows as honest light-DOM interactive elements', async () => {
    document.body.innerHTML = `
      <div class="rrr-list-card">
        <rrr-list-row href="#/settings" label="Settings" accessory="chevron"></rrr-list-row>
        <rrr-list-row activation="button" label="Export data" disabled></rrr-list-row>
      </div>
    `
    await Promise.resolve()

    const rows = Array.from(document.querySelectorAll<RrrListRow>('rrr-list-row'))
    const link = rows[0]?.querySelector(':scope > a')
    const button = rows[1]?.querySelector<HTMLButtonElement>(':scope > button')

    expect(rows[0]?.shadowRoot).toBeNull()
    expect(link?.getAttribute('href')).toBe('#/settings')
    expect(link?.textContent).toContain('Settings')
    expect(button?.disabled).toBe(true)
    expect(rows[1]?.getAttribute('aria-disabled')).toBe('true')
  })

  test('supports the standard button tones on action rows', async () => {
    const tones = ['primary', 'neutral', 'accent', 'info', 'success', 'warning', 'danger']
    document.body.innerHTML = tones
      .map((tone) => `<rrr-list-row activation="button" tone="${tone}" label="${tone}"></rrr-list-row>`)
      .join('')
    await Promise.resolve()

    const rows = Array.from(document.querySelectorAll<RrrListRow>('rrr-list-row'))

    expect(rows.map((row) => row.getAttribute('tone'))).toEqual(tones)
    expect(rows.every((row) => row.querySelector(':scope > button') !== null)).toBe(true)
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

    expect(document.querySelector('rrr-list-card')?.shadowRoot).toBeNull()

    const rows = Array.from(document.querySelectorAll<RrrListRow>('rrr-list-row'))
    const firstInput = rows[0]?.querySelector<HTMLInputElement>('input')
    const secondInput = rows[1]?.querySelector<HTMLInputElement>('input')

    expect(firstInput?.tabIndex).toBe(0)
    expect(secondInput?.tabIndex).toBe(-1)

    firstInput?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
    }))

    expect(rows[0]?.checked).toBe(false)
    expect(rows[1]?.checked).toBe(true)
    expect(rows[1]?.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(0)

    rows[2]?.querySelector<HTMLInputElement>('input')?.click()

    expect(rows[1]?.checked).toBe(false)
    expect(rows[2]?.checked).toBe(true)
  })

  test('updates radio tab stops when rows are added dynamically', async () => {
    const card = document.createElement('rrr-list-card')
    const row = document.createElement('rrr-list-row') as RrrListRow
    row.setAttribute('control', 'radio')
    row.setAttribute('name', 'theme')
    row.setAttribute('value', 'auto')
    row.setAttribute('label', 'Automatic')
    card.appendChild(row)
    document.body.appendChild(card)
    await Promise.resolve()

    const secondRow = document.createElement('rrr-list-row') as RrrListRow
    secondRow.setAttribute('control', 'radio')
    secondRow.setAttribute('name', 'theme')
    secondRow.setAttribute('value', 'dark')
    secondRow.setAttribute('label', 'Dark')
    card.appendChild(secondRow)
    await Promise.resolve()

    expect(row.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(0)
    expect(secondRow.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(-1)
  })

  test('renders switch semantics and reflects its checked state', async () => {
    document.body.innerHTML = `
      <rrr-list-row control="switch" name="wake-lock" label="Keep screen awake"></rrr-list-row>
    `
    await Promise.resolve()

    const row = document.querySelector<RrrListRow>('rrr-list-row')
    const input = row?.querySelector<HTMLInputElement>('input')

    expect(input?.getAttribute('role')).toBe('switch')
    input?.click()
    expect(row?.checked).toBe(true)
  })

  test('preserves arbitrary row body content across light-DOM rerenders', async () => {
    document.body.innerHTML = `
      <rrr-list-row label="Full Body" description="Push-ups, Plank" href="#/routines/1">
        <span slot="body" data-routine-meta>Chest · Last started yesterday</span>
      </rrr-list-row>
    `
    await Promise.resolve()

    const row = document.querySelector<RrrListRow>('rrr-list-row')
    const body = row?.querySelector<HTMLElement>('.rrr-list-row__body')
    const projectedContent = body?.querySelector<HTMLElement>('[data-routine-meta]')

    expect(projectedContent?.textContent).toContain('Last started yesterday')

    row?.setAttribute('description', 'Updated description')
    await Promise.resolve()

    expect(row?.querySelector('.rrr-list-row__body [data-routine-meta]')).toBe(projectedContent)

    row?.remove()
    if (row) {
      document.body.appendChild(row)
    }
    await Promise.resolve()

    expect(row?.querySelector('.rrr-list-row__body [data-routine-meta]')).toBe(projectedContent)
  })

  test('retains the leading and trailing slot authoring API in light DOM', async () => {
    document.body.innerHTML = `
      <rrr-list-row label="Custom row" accessory="custom">
        <span slot="leading" data-leading>Leading</span>
        <span slot="trailing" data-trailing>Trailing</span>
      </rrr-list-row>
    `
    await Promise.resolve()

    const row = document.querySelector<RrrListRow>('rrr-list-row')

    expect(row?.querySelector('.rrr-list-row__leading > [slot="leading"]')?.hasAttribute('data-leading')).toBe(true)
    expect(row?.querySelector('.rrr-list-row__trailing > [slot="trailing"]')?.hasAttribute('data-trailing')).toBe(true)
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

    expect(appearanceRow?.getAttribute('value-text')).toBe('Dark')
    expect(appearanceRow?.getAttribute('accessory')).toBe('value-chevron')
  })

  test('emits preference changes from native radio rows', async () => {
    const settings = document.createElement('rrr-appearance-settings')
    settings.setAttribute('theme', 'auto')
    settings.setAttribute('contrast', 'normal')
    const preferenceChange = vi.fn()
    settings.addEventListener('rrr-display-preference-change', preferenceChange)
    document.body.appendChild(settings)
    await Promise.resolve()

    const darkRow = settings.querySelector<RrrListRow>('rrr-list-row[name="theme"][value="dark"]')
    darkRow?.querySelector<HTMLInputElement>('input')?.click()

    expect(preferenceChange).toHaveBeenCalledOnce()
    expect((preferenceChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      preference: 'theme',
      value: 'dark',
    })
  })
})
