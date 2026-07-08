import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { initLocale } from '../i18n/index.ts'
import { registerRrrListCard } from '../design-system/components/rrr-list-card.ts'
import { registerRrrListRow, type RrrListRow } from '../design-system/components/rrr-list-row.ts'
import { registerRrrSection } from '../design-system/components/rrr-section.ts'
import { registerRrrSequence } from '../design-system/components/rrr-sequence.ts'
import type {
  SequenceReorderDetail,
  SequenceSortStatusDetail,
} from '../design-system/components/rrr-sequence.ts'
import { registerRrrSequenceGutter } from '../design-system/components/rrr-sequence-gutter.ts'
import type {
  SwipeActionCommitDetail,
} from '../design-system/components/rrr-swipe-action.ts'
import '../app/components/settings/rrr-appearance-settings.ts'
import '../app/components/settings/rrr-language-settings.ts'
import '../app/components/settings/rrr-settings.ts'

beforeAll(async () => {
  if (!('replaceSync' in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      configurable: true,
      value: () => {},
    })
  }
  vi.stubGlobal('SVGSymbolElement', SVGElement)

  const { registerRrrSwipeAction } = await import(
    '../design-system/components/rrr-swipe-action.ts'
  )
  initLocale('en-US')
  registerRrrSection()
  registerRrrListCard()
  registerRrrListRow()
  registerRrrSequence()
  registerRrrSequenceGutter()
  registerRrrSwipeAction()
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('list structure primitives', () => {
  test('gives sequence rows and meaningful gutters list semantics', async () => {
    document.body.innerHTML = `
      <rrr-sequence aria-label="Routine flow">
        <rrr-list-row label="Push-ups"></rrr-list-row>
        <rrr-sequence-gutter
          value="20"
          unit="seconds"
          description="Custom"
          aria-label="20 seconds preparation before Row"
        ></rrr-sequence-gutter>
        <rrr-list-row label="Row"></rrr-list-row>
      </rrr-sequence>
    `
    await Promise.resolve()

    const sequence = document.querySelector('rrr-sequence')
    const gutter = sequence?.querySelector('rrr-sequence-gutter')

    expect(sequence?.getAttribute('role')).toBe('list')
    expect(Array.from(sequence?.children ?? []).map((child) => child.getAttribute('role')))
      .toEqual(['listitem', 'listitem', 'listitem'])
    expect(gutter?.querySelector('.rrr-measurement__value')?.textContent).toBe('20')
    expect(gutter?.querySelector('.rrr-measurement__unit')?.textContent).toBe('seconds')
    expect(gutter?.querySelector('.rrr-sequence-gutter__description')?.textContent).toBe('Custom')

    gutter?.setAttribute('value', '<strong>45</strong>')

    expect(gutter?.querySelector('strong')).toBeNull()
    expect(gutter?.querySelector('.rrr-measurement__value')?.textContent).toBe('<strong>45</strong>')
  })

  test('renders an editable gutter as a labelled native button', async () => {
    document.body.innerHTML = `
      <rrr-sequence-gutter
        activation="button"
        value="45"
        unit="s"
        description="Custom"
        action-label="Edit 45 seconds custom preparation before Row"
      ></rrr-sequence-gutter>
    `
    await Promise.resolve()

    const gutter = document.querySelector('rrr-sequence-gutter')
    const button = gutter?.querySelector<HTMLButtonElement>(':scope > button')

    expect(button?.getAttribute('aria-label'))
      .toBe('Edit 45 seconds custom preparation before Row')
    expect(button?.querySelector('.rrr-sequence-gutter__description')?.textContent)
      .toBe('Custom')
  })

  test('locks swipe actions only after horizontal intent and commits when armed', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    })
    document.body.innerHTML = `
      <rrr-swipe-action
        action="delete"
        action-label="Delete Push-ups"
        direction="end-to-start"
        icon="delete"
      >
        <rrr-list-row activation="button" label="Push-ups"></rrr-list-row>
      </rrr-swipe-action>
    `
    await Promise.resolve()

    const swipeAction = document.querySelector<HTMLElement>('rrr-swipe-action')!
    const content = swipeAction.querySelector<HTMLElement>('.rrr-swipe-action__content')!
    const commit = vi.fn()
    const setPointerCapture = vi.fn()
    content.setPointerCapture = setPointerCapture
    swipeAction.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      right: 300,
      bottom: 80,
      left: 0,
      width: 300,
      height: 80,
      toJSON: () => ({}),
    })
    swipeAction.addEventListener('rrr-swipe-action-commit', commit)

    const pointerEvent = (
      type: string,
      options: {
        pointerId: number
        clientX: number
        clientY: number
      },
    ): Event => {
      const event = new Event(type, { bubbles: true, composed: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: options.pointerId },
        clientX: { value: options.clientX },
        clientY: { value: options.clientY },
        button: { value: 0 },
        isPrimary: { value: true },
      })
      return event
    }

    content.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 1,
      clientX: 250,
      clientY: 20,
    }))
    const verticalMove = pointerEvent('pointermove', {
      pointerId: 1,
      clientX: 244,
      clientY: 60,
    })
    swipeAction.dispatchEvent(verticalMove)

    expect(verticalMove.defaultPrevented).toBe(false)
    expect(swipeAction.dataset.swipeState).toBe('closed')

    content.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 2,
      clientX: 250,
      clientY: 20,
    }))
    const revealMove = pointerEvent('pointermove', {
      pointerId: 2,
      clientX: 190,
      clientY: 22,
    })
    swipeAction.dispatchEvent(revealMove)

    expect(revealMove.defaultPrevented).toBe(true)
    expect(swipeAction.dataset.swipeState).toBe('revealing')
    expect(setPointerCapture).toHaveBeenCalledWith(2)

    swipeAction.dispatchEvent(pointerEvent('pointerup', {
      pointerId: 2,
      clientX: 190,
      clientY: 22,
    }))
    expect(swipeAction.dataset.swipeState).toBe('closed')
    expect(commit).not.toHaveBeenCalled()

    content.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 3,
      clientX: 250,
      clientY: 20,
    }))
    swipeAction.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 3,
      clientX: 155,
      clientY: 22,
    }))

    expect(swipeAction.dataset.swipeState).toBe('revealing')

    swipeAction.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 3,
      clientX: 154,
      clientY: 22,
    }))

    expect(swipeAction.dataset.swipeState).toBe('armed')
    expect(vibrate).toHaveBeenCalledOnce()
    expect(vibrate).toHaveBeenCalledWith(10)

    swipeAction.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 3,
      clientX: 145,
      clientY: 22,
    }))
    expect(vibrate).toHaveBeenCalledOnce()

    swipeAction.dispatchEvent(pointerEvent('pointerup', {
      pointerId: 3,
      clientX: 145,
      clientY: 22,
    }))

    expect(commit).toHaveBeenCalledOnce()
    expect((commit.mock.calls[0]?.[0] as CustomEvent<SwipeActionCommitDetail>).detail)
      .toEqual({ action: 'delete' })
    await Promise.resolve()
    expect(swipeAction.dataset.swipeState).toBe('closed')

    swipeAction.style.direction = 'rtl'
    content.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 4,
      clientX: 50,
      clientY: 20,
    }))
    swipeAction.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 4,
      clientX: 180,
      clientY: 22,
    }))
    expect(swipeAction.dataset.swipeState).toBe('armed')
    swipeAction.dispatchEvent(pointerEvent('pointercancel', {
      pointerId: 4,
      clientX: 180,
      clientY: 22,
    }))
  })

  test('ignores drag handles and closes another active swipe row', async () => {
    document.body.innerHTML = `
      <rrr-swipe-action action="delete" action-label="Delete Alpha">
        <rrr-list-row activation="button" label="Alpha"></rrr-list-row>
        <button type="button" data-sort-handle>Move Alpha</button>
      </rrr-swipe-action>
      <rrr-swipe-action action="delete" action-label="Delete Bravo">
        <rrr-list-row activation="button" label="Bravo"></rrr-list-row>
      </rrr-swipe-action>
    `
    await Promise.resolve()

    const actions = Array.from(document.querySelectorAll<HTMLElement>('rrr-swipe-action'))
    const pointerEvent = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ): Event => {
      const event = new Event(type, { bubbles: true, composed: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        clientX: { value: clientX },
        clientY: { value: clientY },
        button: { value: 0 },
        isPrimary: { value: true },
      })
      return event
    }
    for (const action of actions) {
      action.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        top: 0,
        right: 300,
        bottom: 80,
        left: 0,
        width: 300,
        height: 80,
        toJSON: () => ({}),
      })
    }

    const firstHandle = actions[0]?.querySelector<HTMLElement>('[data-sort-handle]')
    firstHandle?.dispatchEvent(pointerEvent('pointerdown', 1, 250, 20))
    actions[0]?.dispatchEvent(pointerEvent('pointermove', 1, 100, 20))
    expect(actions[0]?.dataset.swipeState).toBe('closed')

    const firstContent = actions[0]?.querySelector<HTMLElement>('.rrr-swipe-action__content')
    firstContent?.dispatchEvent(pointerEvent('pointerdown', 2, 250, 20))
    actions[0]?.dispatchEvent(pointerEvent('pointermove', 2, 190, 20))
    expect(actions[0]?.dataset.swipeState).toBe('revealing')

    const secondContent = actions[1]?.querySelector<HTMLElement>('.rrr-swipe-action__content')
    secondContent?.dispatchEvent(pointerEvent('pointerdown', 3, 250, 20))
    actions[1]?.dispatchEvent(pointerEvent('pointermove', 3, 190, 20))

    expect(actions[0]?.dataset.swipeState).toBe('closed')
    expect(actions[1]?.dataset.swipeState).toBe('revealing')
  })

  test('reorders sequence items by keyboard and restores them on cancel', async () => {
    document.body.innerHTML = `
      <rrr-sequence sortable aria-label="Routine flow">
        <div data-sequence-item data-sort-id="a" data-sort-label="Alpha">
          <rrr-list-row activation="button" label="Alpha"></rrr-list-row>
          <button type="button" data-sort-handle>Move Alpha</button>
        </div>
        <rrr-sequence-gutter value="10" unit="s"></rrr-sequence-gutter>
        <div data-sequence-item data-sort-id="b" data-sort-label="Bravo">
          <rrr-list-row activation="button" label="Bravo"></rrr-list-row>
          <button type="button" data-sort-handle>Move Bravo</button>
        </div>
        <rrr-sequence-gutter value="10" unit="s"></rrr-sequence-gutter>
        <div data-sequence-item data-sort-id="c" data-sort-label="Charlie">
          <rrr-list-row activation="button" label="Charlie"></rrr-list-row>
          <button type="button" data-sort-handle>Move Charlie</button>
        </div>
      </rrr-sequence>
    `
    await Promise.resolve()

    const sequence = document.querySelector<HTMLElement>('rrr-sequence')!
    const statuses: SequenceSortStatusDetail[] = []
    const reorders: SequenceReorderDetail[] = []
    sequence.addEventListener('rrr-sequence-sort-status', (event) => {
      statuses.push((event as CustomEvent<SequenceSortStatusDetail>).detail)
    })
    sequence.addEventListener('rrr-sequence-reorder', (event) => {
      reorders.push((event as CustomEvent<SequenceReorderDetail>).detail)
    })
    const ids = (): string[] => Array.from(
      sequence.querySelectorAll<HTMLElement>(':scope > [data-sort-id]'),
    ).map((item) => item.dataset.sortId ?? '')
    const alphaHandle = sequence.querySelector<HTMLButtonElement>(
      '[data-sort-id="a"] [data-sort-handle]',
    )!

    alphaHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))
    alphaHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))

    expect(sequence.dataset.sorting).toBe('keyboard')
    expect(ids()).toEqual(['b', 'a', 'c'])
    expect(statuses.map(({ status }) => status)).toEqual(['lifted', 'moved'])
    expect(statuses[1]).toMatchObject({ id: 'a', position: 2, count: 3 })

    alphaHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))

    expect(sequence.hasAttribute('data-sorting')).toBe(false)
    expect(reorders).toEqual([{
      orderedIds: ['b', 'a', 'c'],
      movedId: 'a',
      input: 'keyboard',
    }])

    const bravoHandle = sequence.querySelector<HTMLButtonElement>(
      '[data-sort-id="b"] [data-sort-handle]',
    )!
    bravoHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))
    bravoHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))
    bravoHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    }))

    expect(ids()).toEqual(['b', 'a', 'c'])
    expect(reorders).toHaveLength(1)
    expect(statuses.at(-1)?.status).toBe('cancelled')
    expect(document.activeElement).toBe(bravoHandle)
  })

  test('restores gutter DOM when sorting returns to the original order', async () => {
    document.body.innerHTML = `
      <rrr-sequence sortable>
        <div data-sequence-item data-sort-id="a" data-sort-label="Alpha">
          <button type="button" data-sort-handle>Move Alpha</button>
        </div>
        <rrr-sequence-gutter data-gutter="b" value="10" unit="s"></rrr-sequence-gutter>
        <div data-sequence-item data-sort-id="b" data-sort-label="Bravo">
          <button type="button" data-sort-handle>Move Bravo</button>
        </div>
      </rrr-sequence>
    `
    await Promise.resolve()

    const sequence = document.querySelector<HTMLElement>('rrr-sequence')!
    const handle = sequence.querySelector<HTMLButtonElement>(
      '[data-sort-id="a"] [data-sort-handle]',
    )!
    const reorder = vi.fn()
    sequence.addEventListener('rrr-sequence-reorder', reorder)

    for (const key of [' ', 'ArrowDown', 'ArrowUp', 'Enter']) {
      handle.dispatchEvent(new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        composed: true,
        cancelable: true,
      }))
    }

    expect(Array.from(sequence.children).map((child) =>
      child.getAttribute('data-sort-id') ?? `gutter-${child.getAttribute('data-gutter')}`,
    )).toEqual(['a', 'gutter-b', 'b'])
    expect(reorder).not.toHaveBeenCalled()
  })

  test('reorders sequence items from pointer movement started on a handle', async () => {
    document.body.innerHTML = `
      <rrr-sequence sortable>
        <div data-sequence-item data-sort-id="a" data-sort-label="Alpha">
          <rrr-list-row label="Alpha"></rrr-list-row>
          <button type="button" data-sort-handle>Move Alpha</button>
        </div>
        <rrr-sequence-gutter value="10" unit="s"></rrr-sequence-gutter>
        <div data-sequence-item data-sort-id="b" data-sort-label="Bravo">
          <rrr-list-row label="Bravo"></rrr-list-row>
          <button type="button" data-sort-handle>Move Bravo</button>
        </div>
        <rrr-sequence-gutter value="10" unit="s"></rrr-sequence-gutter>
        <div data-sequence-item data-sort-id="c" data-sort-label="Charlie">
          <rrr-list-row label="Charlie"></rrr-list-row>
          <button type="button" data-sort-handle>Move Charlie</button>
        </div>
      </rrr-sequence>
    `
    await Promise.resolve()

    const sequence = document.querySelector<HTMLElement>('rrr-sequence')!
    const items = Array.from(sequence.querySelectorAll<HTMLElement>('[data-sort-id]'))
    for (const item of items) {
      item.getBoundingClientRect = () => {
        const index = Array.from(
          sequence.querySelectorAll<HTMLElement>(':scope > [data-sort-id]'),
        ).indexOf(item)
        return {
          x: 0,
          y: index * 100,
          top: index * 100,
          right: 300,
          bottom: index * 100 + 80,
          left: 0,
          width: 300,
          height: 80,
          toJSON: () => ({}),
        }
      }
    }

    const pointerEvent = (
      type: string,
      options: {
        pointerId: number
        clientX: number
        clientY: number
        button?: number
      },
    ): Event => {
      const event = new Event(type, { bubbles: true, composed: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: options.pointerId },
        clientX: { value: options.clientX },
        clientY: { value: options.clientY },
        button: { value: options.button ?? 0 },
        isPrimary: { value: true },
      })
      return event
    }

    const reorder = vi.fn()
    sequence.addEventListener('rrr-sequence-reorder', reorder)
    const alphaHandle = sequence.querySelector<HTMLElement>(
      '[data-sort-id="a"] [data-sort-handle]',
    )!
    alphaHandle.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 1,
      clientX: 10,
      clientY: 40,
    }))
    sequence.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 1,
      clientX: 10,
      clientY: 160,
    }))
    sequence.dispatchEvent(pointerEvent('pointerup', {
      pointerId: 1,
      clientX: 10,
      clientY: 160,
    }))

    expect(Array.from(sequence.querySelectorAll<HTMLElement>(
      ':scope > [data-sort-id]',
    )).map((item) => item.dataset.sortId)).toEqual(['b', 'a', 'c'])
    expect((reorder.mock.calls[0]?.[0] as CustomEvent<SequenceReorderDetail>).detail)
      .toEqual({
        orderedIds: ['b', 'a', 'c'],
        movedId: 'a',
        input: 'pointer',
      })
  })

  test('cancels pointer reordering when the drag leaves the sequence bounds', async () => {
    document.body.innerHTML = `
      <rrr-sequence sortable>
        <div data-sequence-item data-sort-id="a" data-sort-label="Alpha">
          <rrr-list-row label="Alpha"></rrr-list-row>
          <button type="button" data-sort-handle>Move Alpha</button>
        </div>
        <rrr-sequence-gutter value="10" unit="s"></rrr-sequence-gutter>
        <div data-sequence-item data-sort-id="b" data-sort-label="Bravo">
          <rrr-list-row label="Bravo"></rrr-list-row>
          <button type="button" data-sort-handle>Move Bravo</button>
        </div>
      </rrr-sequence>
    `
    await Promise.resolve()

    const sequence = document.querySelector<HTMLElement>('rrr-sequence')!
    sequence.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      right: 300,
      bottom: 180,
      left: 0,
      width: 300,
      height: 180,
      toJSON: () => ({}),
    })

    const items = Array.from(sequence.querySelectorAll<HTMLElement>('[data-sort-id]'))
    for (const item of items) {
      item.getBoundingClientRect = () => {
        const index = Array.from(
          sequence.querySelectorAll<HTMLElement>(':scope > [data-sort-id]'),
        ).indexOf(item)
        return {
          x: 0,
          y: index * 100,
          top: index * 100,
          right: 300,
          bottom: index * 100 + 80,
          left: 0,
          width: 300,
          height: 80,
          toJSON: () => ({}),
        }
      }
    }

    const pointerEvent = (
      type: string,
      options: {
        pointerId: number
        clientX: number
        clientY: number
        button?: number
      },
    ): Event => {
      const event = new Event(type, { bubbles: true, composed: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: options.pointerId },
        clientX: { value: options.clientX },
        clientY: { value: options.clientY },
        button: { value: options.button ?? 0 },
        isPrimary: { value: true },
      })
      return event
    }

    const reorder = vi.fn()
    const statuses: SequenceSortStatusDetail[] = []
    sequence.addEventListener('rrr-sequence-reorder', reorder)
    sequence.addEventListener('rrr-sequence-sort-status', (event) => {
      statuses.push((event as CustomEvent<SequenceSortStatusDetail>).detail)
    })

    const alphaHandle = sequence.querySelector<HTMLElement>('[data-sort-id="a"] [data-sort-handle]')!
    alphaHandle.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 1,
      clientX: 10,
      clientY: 40,
    }))
    sequence.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 1,
      clientX: 10,
      clientY: 140,
    }))
    sequence.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 1,
      clientX: 340,
      clientY: 140,
    }))
    sequence.dispatchEvent(pointerEvent('pointerup', {
      pointerId: 1,
      clientX: 340,
      clientY: 140,
    }))

    expect(Array.from(sequence.querySelectorAll<HTMLElement>(
      ':scope > [data-sort-id]',
    )).map((item) => item.dataset.sortId)).toEqual(['a', 'b'])
    expect(reorder).not.toHaveBeenCalled()
    expect(sequence.hasAttribute('data-sorting')).toBe(false)
    expect(statuses.at(-1)?.status).toBe('cancelled')
  })

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

  test('integrates a native file picker into an action row', async () => {
    const row = document.createElement('rrr-list-row') as RrrListRow
    row.setAttribute('activation', 'file')
    row.setAttribute('name', 'data-file')
    row.setAttribute('accept', 'application/json,.json')
    row.setAttribute('multiple', '')
    row.setAttribute('label', 'Import')
    document.body.appendChild(row)
    await Promise.resolve()

    const input = row.querySelector<HTMLInputElement>('input[type="file"]')
    const file = new File(['{}'], 'data.json', { type: 'application/json' })
    const files = {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null,
    } as unknown as FileList
    Object.defineProperty(input, 'files', { configurable: true, value: files })
    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'data.json' })
    const change = vi.fn()
    row.addEventListener('change', change)

    input?.dispatchEvent(new Event('change', { bubbles: true }))

    expect(row.querySelector(':scope > label.rrr-list-row__row--file')).not.toBeNull()
    expect(input?.name).toBe('data-file')
    expect(input?.accept).toBe('application/json,.json')
    expect(input?.multiple).toBe(true)
    expect(row.files?.[0]).toBe(file)
    expect(change).toHaveBeenCalledOnce()

    row.focus()
    expect(document.activeElement).toBe(input)

    row.clearFileSelection()
    expect(input?.value).toBe('')

    row.setAttribute('disabled', '')
    await Promise.resolve()
    expect(row.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true)
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

  test('renders switch and checkbox rows with interactive identity', async () => {
    document.body.innerHTML = `
      <rrr-list-row control="switch" name="wake-lock" label="Keep screen awake"></rrr-list-row>
      <rrr-list-row control="checkbox" name="show-tips" label="Show tips"></rrr-list-row>
      <rrr-list-row control="radio" name="theme" label="Dark"></rrr-list-row>
    `
    await Promise.resolve()

    const rows = Array.from(document.querySelectorAll<RrrListRow>('rrr-list-row'))
    const switchRow = rows[0]
    const switchInput = switchRow?.querySelector<HTMLInputElement>('input')

    expect(switchInput?.getAttribute('role')).toBe('switch')
    expect(switchRow?.querySelector(':scope > label')?.classList)
      .toContain('rrr-list-row__row--interactive')
    expect(rows[1]?.querySelector(':scope > label')?.classList)
      .toContain('rrr-list-row__row--interactive')
    expect(rows[2]?.querySelector(':scope > label')?.classList)
      .not.toContain('rrr-list-row__row--interactive')

    switchInput?.click()
    expect(switchRow?.checked).toBe(true)
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

  test('supports a structured label without changing the label attribute API', async () => {
    document.body.innerHTML = `
      <rrr-list-row
        activation="button"
        label="Fallback label"
      >
        <span slot="label">
          <span class="sr-only">First set, 10 reps, 6 kilograms</span>
          <span aria-hidden="true">
            <rrr-measurement value="10" unit="reps"></rrr-measurement>
            <span>&middot;</span>
            <rrr-measurement value="6" unit="kg"></rrr-measurement>
          </span>
        </span>
      </rrr-list-row>
    `
    await Promise.resolve()

    const row = document.querySelector<RrrListRow>('rrr-list-row')
    const button = row?.querySelector<HTMLButtonElement>(':scope > button')
    const label = row?.querySelector('.rrr-list-row__label')

    expect(label?.textContent).toContain('10')
    expect(label?.textContent).not.toContain('Fallback label')
    expect(label?.querySelectorAll('rrr-measurement')).toHaveLength(2)
    expect(button?.querySelector('.sr-only')?.textContent)
      .toBe('First set, 10 reps, 6 kilograms')

    row?.setAttribute('description', 'Updated')
    await Promise.resolve()

    expect(row?.querySelector('.rrr-list-row__label [slot="label"]')).not.toBeNull()
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
  test('keeps the dev-only styleguide orphaned above display', () => {
    const settings = document.createElement('rrr-settings')
    settings.setAttribute('styleguide-enabled', 'true')
    document.body.appendChild(settings)

    const sections = Array.from(settings.querySelectorAll('rrr-section'))
    const styleguideSection = sections[0]

    expect(styleguideSection?.querySelector(
      'rrr-list-row[data-action="navigate"][data-href="#/settings/styleguide"]',
    )).not.toBeNull()
    expect(styleguideSection?.querySelector('[slot="heading"]')).toBeNull()
  })

  test('puts import and export first in the data section', () => {
    const settings = document.createElement('rrr-settings')
    document.body.appendChild(settings)

    const dataSection = Array.from(settings.querySelectorAll('rrr-section'))
      .find((section) => section.querySelector('[slot="heading"]')?.textContent === 'Data')
    const rows = Array.from(dataSection?.querySelectorAll<RrrListRow>('rrr-list-row') ?? [])

    expect(rows[0]?.getAttribute('activation')).toBe('button')
    expect(rows[0]?.dataset.action).toBe('navigate')
    expect(rows[0]?.dataset.href).toBe('#/settings/import-export')
    expect(rows[1]?.dataset.action).toBe('delete-app-data')
    expect(settings.querySelector(
      'rrr-list-row[data-href="#/settings/styleguide"]',
    )).toBeNull()
  })

  test('links to the appearance subpage and shows the current theme', () => {
    const settings = document.createElement('rrr-settings')
    settings.setAttribute('theme', 'dark')
    document.body.appendChild(settings)

    const appearanceRow = settings.querySelector<RrrListRow>(
      'rrr-list-row[data-href="#/settings/appearance"]',
    )

    expect(appearanceRow?.getAttribute('activation')).toBe('button')
    expect(appearanceRow?.getAttribute('value-text')).toBe('Dark')
    expect(appearanceRow?.getAttribute('accessory')).toBe('value-chevron')
  })

  test('links to the language subpage and shows the current preference', () => {
    const settings = document.createElement('rrr-settings')
    settings.setAttribute('language', 'nl-NL')
    document.body.appendChild(settings)

    const languageRow = settings.querySelector<RrrListRow>(
      'rrr-list-row[data-href="#/settings/language"]',
    )

    expect(languageRow?.getAttribute('activation')).toBe('button')
    expect(languageRow?.getAttribute('value-text')).toBe('Dutch')
    expect(languageRow?.getAttribute('accessory')).toBe('value-chevron')
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

  test('emits language changes from native radio rows', async () => {
    const settings = document.createElement('rrr-language-settings')
    settings.setAttribute('language', 'auto')
    const preferenceChange = vi.fn()
    settings.addEventListener('rrr-language-preference-change', preferenceChange)
    document.body.appendChild(settings)
    await Promise.resolve()

    const dutchRow = settings.querySelector<RrrListRow>('rrr-list-row[value="nl-NL"]')
    dutchRow?.querySelector<HTMLInputElement>('input')?.click()

    expect(preferenceChange).toHaveBeenCalledOnce()
    expect((preferenceChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      language: 'nl-NL',
    })
  })
})
