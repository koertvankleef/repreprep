import { getLocale, t } from '../../../i18n/index.ts'
import { toastService, type ToastType } from '../../../foundation/toast.ts'
import styles from './rrr-styleguide.css?inline'

type PaletteEntry = {
  step: string
  token: string
  isBrandAnchor?: boolean
}

type PaletteGroup = {
  titleKey: string
  descriptionKey: string
  isBrandPalette?: boolean
  entries: PaletteEntry[]
}

type TokenScale = {
  titleKey: string
  tokens: string[]
}

const COLOR_PALETTES: PaletteGroup[] = [
  {
    titleKey: 'styleguide.palette.neutral.title',
    descriptionKey: 'styleguide.palette.neutral.description',
    entries: [
      { step: '00', token: '--rrr-colors-grayscale-00' },
      { step: '10', token: '--rrr-colors-grayscale-10' },
      { step: '20', token: '--rrr-colors-grayscale-20' },
      { step: '30', token: '--rrr-colors-grayscale-30' },
      { step: '40', token: '--rrr-colors-grayscale-40' },
      { step: '50', token: '--rrr-colors-grayscale-50' },
      { step: '60', token: '--rrr-colors-grayscale-60' },
      { step: '70', token: '--rrr-colors-grayscale-70' },
      { step: '80', token: '--rrr-colors-grayscale-80' },
      { step: '90', token: '--rrr-colors-grayscale-90' },
      { step: '100', token: '--rrr-colors-grayscale-100' },
    ],
  },
  {
    titleKey: 'styleguide.palette.primary.title',
    descriptionKey: 'styleguide.palette.primary.description',
    isBrandPalette: true,
    entries: [
      { step: '10', token: '--rrr-colors-activity-indigo-10' },
      { step: '20', token: '--rrr-colors-activity-indigo-20' },
      { step: '30', token: '--rrr-colors-activity-indigo-30' },
      { step: '40', token: '--rrr-colors-activity-indigo-40' },
      { step: '50', token: '--rrr-colors-activity-indigo-50' },
      { step: '60', token: '--rrr-colors-activity-indigo-60', isBrandAnchor: true },
      { step: '70', token: '--rrr-colors-activity-indigo-70' },
      { step: '80', token: '--rrr-colors-activity-indigo-80' },
      { step: '90', token: '--rrr-colors-activity-indigo-90' },
    ],
  },
  {
    titleKey: 'styleguide.palette.accent.title',
    descriptionKey: 'styleguide.palette.accent.description',
    isBrandPalette: true,
    entries: [
      { step: '10', token: '--rrr-colors-serene-mint-10' },
      { step: '20', token: '--rrr-colors-serene-mint-20' },
      { step: '30', token: '--rrr-colors-serene-mint-30' },
      { step: '40', token: '--rrr-colors-serene-mint-40' },
      { step: '50', token: '--rrr-colors-serene-mint-50' },
      { step: '60', token: '--rrr-colors-serene-mint-60', isBrandAnchor: true },
      { step: '70', token: '--rrr-colors-serene-mint-70' },
      { step: '80', token: '--rrr-colors-serene-mint-80' },
      { step: '90', token: '--rrr-colors-serene-mint-90' },
    ],
  },
  {
    titleKey: 'styleguide.palette.info.title',
    descriptionKey: 'styleguide.palette.info.description',
    entries: [
      { step: '10', token: '--rrr-colors-context-info-10' },
      { step: '20', token: '--rrr-colors-context-info-20' },
      { step: '30', token: '--rrr-colors-context-info-30' },
      { step: '40', token: '--rrr-colors-context-info-40' },
      { step: '50', token: '--rrr-colors-context-info-50' },
      { step: '60', token: '--rrr-colors-context-info-60' },
      { step: '70', token: '--rrr-colors-context-info-70' },
      { step: '80', token: '--rrr-colors-context-info-80' },
      { step: '90', token: '--rrr-colors-context-info-90' },
    ],
  },
  {
    titleKey: 'styleguide.palette.success.title',
    descriptionKey: 'styleguide.palette.success.description',
    entries: [
      { step: '10', token: '--rrr-colors-context-success-10' },
      { step: '20', token: '--rrr-colors-context-success-20' },
      { step: '30', token: '--rrr-colors-context-success-30' },
      { step: '40', token: '--rrr-colors-context-success-40' },
      { step: '50', token: '--rrr-colors-context-success-50' },
      { step: '60', token: '--rrr-colors-context-success-60' },
      { step: '70', token: '--rrr-colors-context-success-70' },
      { step: '80', token: '--rrr-colors-context-success-80' },
      { step: '90', token: '--rrr-colors-context-success-90' },
    ],
  },
  {
    titleKey: 'styleguide.palette.warning.title',
    descriptionKey: 'styleguide.palette.warning.description',
    entries: [
      { step: '10', token: '--rrr-colors-context-warning-10' },
      { step: '20', token: '--rrr-colors-context-warning-20' },
      { step: '30', token: '--rrr-colors-context-warning-30' },
      { step: '40', token: '--rrr-colors-context-warning-40' },
      { step: '50', token: '--rrr-colors-context-warning-50' },
      { step: '60', token: '--rrr-colors-context-warning-60' },
      { step: '70', token: '--rrr-colors-context-warning-70' },
      { step: '80', token: '--rrr-colors-context-warning-80' },
      { step: '90', token: '--rrr-colors-context-warning-90' },
    ],
  },
  {
    titleKey: 'styleguide.palette.danger.title',
    descriptionKey: 'styleguide.palette.danger.description',
    entries: [
      { step: '10', token: '--rrr-colors-context-danger-10' },
      { step: '20', token: '--rrr-colors-context-danger-20' },
      { step: '30', token: '--rrr-colors-context-danger-30' },
      { step: '40', token: '--rrr-colors-context-danger-40' },
      { step: '50', token: '--rrr-colors-context-danger-50' },
      { step: '60', token: '--rrr-colors-context-danger-60' },
      { step: '70', token: '--rrr-colors-context-danger-70' },
      { step: '80', token: '--rrr-colors-context-danger-80' },
      { step: '90', token: '--rrr-colors-context-danger-90' },
    ],
  },
]

const TOKEN_SCALES: TokenScale[] = [
  {
    titleKey: 'styleguide.scale.spacing',
    tokens: [
      '--rrr-spacing-2xs',
      '--rrr-spacing-xs',
      '--rrr-spacing-s',
      '--rrr-spacing-m',
      '--rrr-spacing-l',
      '--rrr-spacing-xl',
      '--rrr-spacing-2xl',
    ],
  },
  {
    titleKey: 'styleguide.scale.radius',
    tokens: [
      '--rrr-radius-xs',
      '--rrr-radius-s',
      '--rrr-radius-m',
      '--rrr-radius-l',
      '--rrr-radius-xl',
      '--rrr-radius-2xl',
    ],
  },
  {
    titleKey: 'styleguide.scale.elevation',
    tokens: [
      '--rrr-depth-1-shadow',
      '--rrr-depth-2-shadow',
      '--rrr-depth-3-shadow',
      '--rrr-depth-4-shadow',
      '--rrr-depth-5-shadow',
    ],
  },
]

const CONTEXT_PALETTE_KEYS = new Set([
  'styleguide.palette.info.title',
  'styleguide.palette.success.title',
  'styleguide.palette.warning.title',
  'styleguide.palette.danger.title',
])

export class RrrStyleguide extends HTMLElement {
  private readonly handleClick = (event: Event): void => {
    const trigger = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.toastTrigger !== undefined)

    if (!trigger) {
      return
    }

    const type = trigger.dataset.toastTrigger

    if (type === 'burst') {
      this.spawnToastBurst()
      return
    }

    if (type === 'action') {
      this.showActionToast()
      return
    }

    if (type === 'closable') {
      toastService.info(t('styleguide.toasts.message.closable'), { closable: true })
      return
    }

    if (type && ['info', 'success', 'warning', 'danger', 'neutral'].includes(type)) {
      this.showTypedToast(type as ToastType)
    }
  }

  connectedCallback(): void {
    this.render()
    this.initializeSwatches()
    this.addEventListener('click', this.handleClick)
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.handleClick)
  }

  private showTypedToast(type: ToastType): void {
    const message = t(`styleguide.toasts.message.${type}`)

    if (type === 'info') {
      toastService.info(message)
      return
    }

    if (type === 'success') {
      toastService.success(message)
      return
    }

    if (type === 'warning') {
      toastService.warning(message)
      return
    }

    if (type === 'danger') {
      toastService.danger(message)
      return
    }

    toastService.neutral(message)
  }

  private showActionToast(): void {
    toastService.info(t('styleguide.toasts.message.action'), {
      action: {
        label: t('styleguide.toasts.actionLabel'),
        onClick: () => {
          toastService.success(t('styleguide.toasts.message.actionResult'), { durationMs: 2600 })
        },
      },
      closable: true,
    })
  }

  private spawnToastBurst(): void {
    const burstTypes: ToastType[] = ['info', 'success', 'warning', 'danger', 'neutral']
    for (const type of burstTypes) {
      this.showTypedToast(type)
    }
    toastService.info(t('styleguide.toasts.message.burst'))
  }

  private renderColorPaletteShowcase(): string {
    const renderGroup = (palette: PaletteGroup): string => {
      const swatches = palette.entries
        .map((entry) => {
          const marker = palette.isBrandPalette && entry.isBrandAnchor
            ? `<span class="swatch-marker">${t('styleguide.brandAnchor')}</span>`
            : ''

          return `
            <li class="swatch" data-swatch-token="${entry.token}" style="--swatch-color: var(${entry.token});">
              <div class="swatch-meta">
                <span class="swatch-step">${entry.step}</span>
                ${marker}
              </div>
              <code class="token-name" data-swatch-value>${entry.token}</code>
            </li>
          `
        })
        .join('')

      return `
        <section class="swatch-group" aria-label="${t('styleguide.palette.groupLabel', { name: t(palette.titleKey) })}">
          <h4>${t(palette.titleKey)}</h4>
          <p class="swatch-description">${t(palette.descriptionKey)}</p>
          <ul class="swatch-grid">${swatches}</ul>
        </section>
      `
    }

    const contextGroups = COLOR_PALETTES.filter((palette) => CONTEXT_PALETTE_KEYS.has(palette.titleKey)).map(renderGroup).join('')
    const otherGroups = COLOR_PALETTES.filter((palette) => !CONTEXT_PALETTE_KEYS.has(palette.titleKey)).map(renderGroup).join('')

    return `
      <div class="swatch-row swatch-row--primary">${otherGroups}</div>
      <div class="swatch-row swatch-row--context">${contextGroups}</div>
    `
  }

  private renderTokenScales(): string {
    return TOKEN_SCALES.map((scale) => {
      const items = scale.tokens.map((token) => {
        const scaleVisual = scale.titleKey === 'styleguide.scale.radius'
          ? `<span class="scale-preview radius" style="--scale-preview-radius: var(${token});"></span>`
          : scale.titleKey === 'styleguide.scale.elevation'
            ? `<span class="scale-preview elevation" style="box-shadow: var(${token});"></span>`
            : `<span class="scale-preview spacing" style="inline-size: var(${token});"></span>`

        return `
          <li class="scale-item">
            ${scaleVisual}
            <code class="token-name">${token}</code>
          </li>
        `
      }).join('')

      return `
        <section class="scale-group">
          <h4>${t(scale.titleKey)}</h4>
          <ul class="scale-list">${items}</ul>
        </section>
      `
    }).join('')
  }

  private render(): void {
    const twentySeconds = t('styleguide.sequences.seconds', { count: 20 })
    const fortyFiveSeconds = t('styleguide.sequences.seconds', { count: 45 })
    const setOne = t('styleguide.sequences.set.one')
    const setTwo = t('styleguide.sequences.set.two')
    const setThree = t('styleguide.sequences.set.three')

    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-section>
          <div class="rrr-card">
            <p>${t('styleguide.subtitle')}</p>
            <p class="sample-text">${t('styleguide.localOnly')}</p>
            <p class="sample-text">${t('styleguide.localeInfo', { browserLocale: navigator.language, activeLocale: getLocale() })}</p>
          </div>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('styleguide.section.typography')}</span>
          <div class="rrr-card">
          <div class="showcase-block">
            <div class="component-column">
              <h1>${t('styleguide.typography.heading1')}</h1>
              <h2>${t('styleguide.typography.heading2')}</h2>
              <h3>${t('styleguide.typography.heading3')}</h3>
              <h4>${t('styleguide.typography.heading4')}</h4>
              <p>${t('styleguide.typography.body')}</p>
            </div>
          </div>
          </div>
        </rrr-section>

        <div class="stack">
          <rrr-section>
            <span slot="heading">${t('styleguide.section.tooltips')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.tooltips.description')}</p>
              <div class="button-row">
                <rrr-tooltip>
                  <rrr-button type="button" variant="ghost" tone="primary" aria-label="Settings" title="Settings">
                    <rrr-icon name="settings"></rrr-icon>
                  </rrr-button>
                </rrr-tooltip>
                <rrr-tooltip>
                  <rrr-button type="button" tone="primary" title="${t('styleguide.tooltips.solid')}">${t('styleguide.tooltips.ghost')}</rrr-button>
                </rrr-tooltip>
                <rrr-tooltip>
                  <rrr-button type="button" variant="outline" tone="neutral" disabled title="${t('styleguide.tooltips.disabled')}">${t('styleguide.tooltips.disabled')}</rrr-button>
                </rrr-tooltip>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.buttons')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.buttonGuidance')}</p>
              <div class="button-row">
                <rrr-button type="button" disabled>${t('styleguide.buttons.primary')} (${t('styleguide.disabledExample')})</rrr-button>
                <rrr-button type="button" variant="outline" disabled>${t('styleguide.buttons.secondary')} (${t('styleguide.disabledExample')})</rrr-button>
                <rrr-button type="button" tone="danger" disabled>${t('styleguide.buttons.danger')} (${t('styleguide.disabledExample')})</rrr-button>
              </div>
              <div class="button-row role-row">
                <rrr-button type="button" tone="primary">tone=primary</rrr-button>
                <rrr-button type="button" tone="accent">tone=accent</rrr-button>
                <rrr-button type="button" tone="neutral">tone=neutral</rrr-button>
                <rrr-button type="button" tone="info">tone=info</rrr-button>
                <rrr-button type="button" tone="success">tone=success</rrr-button>
                <rrr-button type="button" tone="warning">tone=warning</rrr-button>
                <rrr-button type="button" tone="danger">tone=danger</rrr-button>
              </div>
              <div class="button-row role-row">
                <rrr-button type="button" variant="outline" tone="primary">outline primary</rrr-button>
                <rrr-button type="button" variant="outline" tone="accent">outline accent</rrr-button>
                <rrr-button type="button" variant="outline" tone="neutral">outline neutral</rrr-button>
                <rrr-button type="button" variant="outline" tone="info">outline info</rrr-button>
                <rrr-button type="button" variant="outline" tone="success">outline success</rrr-button>
                <rrr-button type="button" variant="outline" tone="warning">outline warning</rrr-button>
                <rrr-button type="button" variant="outline" tone="danger">outline danger</rrr-button>
              </div>
              <div class="button-row">
                <rrr-button type="button" variant="ghost" tone="primary">ghost primary</rrr-button>
                <rrr-button type="button" variant="ghost" tone="accent">ghost accent</rrr-button>
                <rrr-button type="button" variant="ghost" tone="neutral">ghost neutral</rrr-button>
                <rrr-button type="button" variant="ghost" tone="info">ghost info</rrr-button>
                <rrr-button type="button" variant="ghost" tone="success">ghost success</rrr-button>
                <rrr-button type="button" variant="ghost" tone="warning">ghost warning</rrr-button>
                <rrr-button type="button" variant="ghost" tone="danger">ghost danger</rrr-button>
                <rrr-tooltip><rrr-button type="button" variant="ghost" tone="primary" aria-label="icon only ghost button" title="icon only ghost button"><rrr-icon name="settings"></rrr-icon></rrr-button></rrr-tooltip>
                <rrr-button type="button" variant="ghost" tone="primary"><rrr-icon name="settings"></rrr-icon>icon before text</rrr-button>
                <rrr-button type="button" variant="ghost" tone="primary">icon after text<rrr-icon name="settings"></rrr-icon></rrr-button>
              </div>
              <div class="button-row role-row">
                <rrr-button type="button" rounded tone="accent">rounded regular</rrr-button>
                <rrr-button type="button" rounded variant="outline" tone="primary" aria-label="rounded icon only button" title="rounded icon only button"><rrr-icon name="settings"></rrr-icon></rrr-button>
              </div>
              <div class="button-row">
                <rrr-button type="button" size="s">size=s</rrr-button>
                <rrr-button type="button" size="s" variant="outline" tone="neutral">small outline</rrr-button>
                <rrr-button type="button" size="s" rounded tone="accent">small rounded</rrr-button>
                <rrr-button type="button" size="s" rounded variant="ghost" tone="primary" aria-label="small rounded icon button" title="small rounded icon button"><rrr-icon name="settings"></rrr-icon></rrr-button>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.badges')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.badges.description')}</p>
              <div class="button-row role-row">
                <rrr-badge>default</rrr-badge>
                <rrr-badge tone="neutral">neutral</rrr-badge>
                <rrr-badge tone="accent">accent</rrr-badge>
                <rrr-badge tone="info">info</rrr-badge>
                <rrr-badge tone="success">success</rrr-badge>
                <rrr-badge tone="warning">warning</rrr-badge>
                <rrr-badge tone="danger">danger</rrr-badge>
              </div>
              <div class="button-row">
                <rrr-badge variant="outline">outline</rrr-badge>
                <rrr-badge variant="solid">solid</rrr-badge>
                <rrr-badge variant="solid" tone="success">solid success</rrr-badge>
                <rrr-badge variant="outline" tone="danger">outline danger</rrr-badge>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.listRows')}</span>
            <span slot="description">${t('styleguide.listRows.description')}</span>
            <div class="list-showcase">
              <div class="showcase-block">
                <h3>${t('styleguide.listRows.identityHeading')}</h3>
                <p class="sample-text">${t('styleguide.listRows.identityDescription')}</p>
              </div>

              <div class="rrr-list-card">
                <rrr-list-row
                  href="#/settings"
                  label="${t('styleguide.listRows.navigation')}"
                  accessory="chevron"
                >
                  <rrr-icon slot="leading" name="settings"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row
                  href="#/settings"
                  label="${t('styleguide.listRows.currentValue')}"
                  value-text="${t('app.theme.dark')}"
                  accessory="value-chevron"
                >
                  <rrr-icon slot="leading" name="weather-moon"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row
                  control="switch"
                  name="styleguide-wake-lock"
                  label="${t('styleguide.listRows.switch')}"
                  description="${t('styleguide.listRows.switchDescription')}"
                  checked
                >
                  <rrr-icon slot="leading" name="weather-sunny"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row
                  label="${t('styleguide.listRows.informational')}"
                  description="${t('styleguide.listRows.informationalDescription')}"
                  accessory="badge"
                  value-text="${t('styleguide.listRows.badge')}"
                ></rrr-list-row>
              </div>

              <rrr-list-card role="radiogroup" aria-label="${t('styleguide.listRows.radioGroup')}">
                <rrr-list-row control="radio" name="styleguide-theme" value="auto" label="${t('app.theme.auto')}">
                  <rrr-icon slot="leading" name="arrow-sync"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row control="radio" name="styleguide-theme" value="light" label="${t('app.theme.light')}">
                  <rrr-icon slot="leading" name="weather-sunny"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row control="radio" name="styleguide-theme" value="dark" label="${t('app.theme.dark')}" checked>
                  <rrr-icon slot="leading" name="weather-moon"></rrr-icon>
                </rrr-list-row>
              </rrr-list-card>

              <div class="rrr-list-card">
                <rrr-list-row
                  control="checkbox"
                  name="styleguide-checkbox-row"
                  label="${t('styleguide.listRows.checkbox')}"
                  checked
                ></rrr-list-row>
                <rrr-list-row
                  activation="button"
                  label="${t('styleguide.listRows.action')}"
                >
                  <rrr-icon slot="leading" name="arrow-export-up"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row
                  activation="file"
                  label="${t('styleguide.listRows.file')}"
                  description="${t('styleguide.listRows.fileDescription')}"
                  accept=".json"
                >
                  <rrr-icon slot="leading" name="attach"></rrr-icon>
                </rrr-list-row>
                <rrr-list-row
                  activation="button"
                  label="${t('styleguide.listRows.disabled')}"
                  disabled
                ></rrr-list-row>
                <rrr-list-row
                  activation="button"
                  label="${t('styleguide.listRows.destructive')}"
                  tone="danger"
                ></rrr-list-row>
              </div>

              <div class="rrr-list-card">
                <rrr-list-row
                  label="${t('styleguide.listRows.custom')}"
                  description="${t('styleguide.listRows.customDescription')}"
                  accessory="custom"
                >
                  <rrr-badge slot="trailing" tone="success">${t('styleguide.listRows.ready')}</rrr-badge>
                </rrr-list-row>
              </div>

              <div class="showcase-block">
                <h3>${t('styleguide.listRows.propertyHeading')}</h3>
                <p class="sample-text">${t('styleguide.listRows.propertyDescription')}</p>
                <dl class="rrr-property-list">
                  <div class="rrr-property-row">
                    <dt>${t('styleguide.listRows.propertyLastStarted')}</dt>
                    <dd>${t('styleguide.listRows.propertyLastStartedValue')}</dd>
                  </div>
                  <div class="rrr-property-row">
                    <dt>${t('styleguide.listRows.propertyDefaultUnit')}</dt>
                    <dd>${t('styleguide.listRows.propertyDefaultUnitValue')}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.sequences')}</span>
            <span slot="description">${t('styleguide.sequences.description')}</span>
            <div class="sequence-showcase">
              <div class="showcase-block">
                <h3>${t('styleguide.sequences.routineHeading')}</h3>
                <p class="sample-text">${t('styleguide.sequences.routineDescription')}</p>
                <rrr-sequence aria-label="${t('styleguide.sequences.routineAria')}">
                  <rrr-list-row
                    activation="button"
                    label="${t('styleguide.sequences.exercise.pushups')}"
                    description="${t('styleguide.sequences.exercise.sets.three')}"
                  ></rrr-list-row>
                  <rrr-sequence-gutter
                    value="20"
                    unit="s"
                    aria-label="${t('styleguide.sequences.transitionAria', {
                      duration: twentySeconds,
                      exercise: t('styleguide.sequences.exercise.rows'),
                    })}"
                  ></rrr-sequence-gutter>
                  <rrr-list-row
                    activation="button"
                    label="${t('styleguide.sequences.exercise.rows')}"
                    description="${t('styleguide.sequences.exercise.sets.three')}"
                  ></rrr-list-row>
                  <rrr-sequence-gutter
                    value="45"
                    unit="s"
                    description="${t('styleguide.sequences.custom')}"
                    aria-label="${t('styleguide.sequences.transitionAria', {
                      duration: fortyFiveSeconds,
                      exercise: t('styleguide.sequences.exercise.lunges'),
                    })}"
                  ></rrr-sequence-gutter>
                  <rrr-list-row
                    activation="button"
                    label="${t('styleguide.sequences.exercise.lunges')}"
                    description="${t('styleguide.sequences.exercise.sets.two')}"
                  ></rrr-list-row>
                </rrr-sequence>
              </div>

              <div class="showcase-block">
                <h3>${t('styleguide.sequences.setHeading')}</h3>
                <p class="sample-text">${t('styleguide.sequences.setDescription')}</p>
                <rrr-sequence aria-label="${t('styleguide.sequences.setAria')}">
                  <rrr-list-row
                    label="${setOne}"
                    value-text="${t('styleguide.sequences.set.value')}"
                    accessory="value"
                  ></rrr-list-row>
                  <rrr-sequence-gutter
                    value="20"
                    unit="s"
                    aria-label="${t('styleguide.sequences.restAria', {
                      duration: twentySeconds,
                      from: setOne,
                      to: setTwo,
                    })}"
                  ></rrr-sequence-gutter>
                  <rrr-list-row
                    label="${setTwo}"
                    value-text="${t('styleguide.sequences.set.value')}"
                    accessory="value"
                  ></rrr-list-row>
                  <rrr-sequence-gutter
                    value="20"
                    unit="s"
                    aria-label="${t('styleguide.sequences.restAria', {
                      duration: twentySeconds,
                      from: setTwo,
                      to: setThree,
                    })}"
                  ></rrr-sequence-gutter>
                  <rrr-list-row
                    label="${setThree}"
                    value-text="${t('styleguide.sequences.set.value')}"
                    accessory="value"
                  ></rrr-list-row>
                </rrr-sequence>
              </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.inputs')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <div class="showcase-grid">
                <div class="component-column">
                  <rrr-input label="${t('field.name')}" name="sample-name" placeholder="${t('exercise.form.name.placeholder')}" value="Bench Press"></rrr-input>
                  <rrr-date-field
                    label="${t('field.date')}"
                    name="sample-date"
                    value="2026-06-14"
                    locale="${getLocale()}"
                    picker-title="${t('datePicker.title')}"
                    confirm-label="${t('action.confirm')}"
                    dismiss-label="${t('action.close')}"
                    day-label="${t('datePicker.day')}"
                    month-label="${t('datePicker.month')}"
                    year-label="${t('datePicker.year')}"
                    placeholder="${t('datePicker.placeholder')}"
                  ></rrr-date-field>
                  <rrr-input label="${t('exercise.search.label')}" type="search" variant="outline" rounded placeholder="${t('exercise.search.placeholder')}" value="bench">
                    <rrr-icon slot="start" name="search"></rrr-icon>
                    <rrr-icon slot="end" name="dismiss-circle"></rrr-icon>
                  </rrr-input>
                  <rrr-select label="${t('exercise.form.kind.label')}" name="sample-kind" value="reps">
                    <option value="reps">${t('exercise.form.kind.repsWeight')}</option>
                    <option value="time">${t('exercise.form.kind.duration')}</option>
                  </rrr-select>
                  <rrr-textarea label="${t('workout.form.notes')}" name="sample-notes" rows="3" placeholder="${t('workout.form.notes.placeholder')}" value="Focus on controlled tempo and full range of motion."></rrr-textarea>
                </div>
                <div class="component-column">
                  <rrr-input label="${t('styleguide.invalidExample')}" invalid error-text="${t('dialog.validation.required')}" value=""></rrr-input>
                  <rrr-input label="${t('styleguide.disabledExample')}" disabled value="${t('action.save')}"></rrr-input>
                  <rrr-select label="${t('styleguide.disabledExample')}" name="sample-kind-disabled" value="time" disabled>
                    <option value="reps">${t('exercise.form.kind.repsWeight')}</option>
                    <option value="time">${t('exercise.form.kind.duration')}</option>
                  </rrr-select>
                  <rrr-textarea label="${t('styleguide.invalidExample')}" invalid error-text="${t('dialog.validation.required')}" rows="3" value=""></rrr-textarea>
                </div>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.icons')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.icons.description')}</p>
              <div class="icon-grid" aria-label="${t('styleguide.section.icons')}">
                <div class="icon-item">
                  <rrr-icon name="circle-half-fill"></rrr-icon>
                  <span>circle-half-fill</span>
                </div>
                <div class="icon-item">
                  <rrr-icon name="weather-sunny"></rrr-icon>
                  <span>weather-sunny</span>
                </div>
                <div class="icon-item">
                  <rrr-icon name="weather-moon"></rrr-icon>
                  <span>weather-moon</span>
                </div>
                <div class="icon-item">
                  <rrr-icon name="chevron-down"></rrr-icon>
                  <span>chevron-down</span>
                </div>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.checkboxes')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <div class="showcase-grid">
                <div class="component-column">
                  <rrr-checkbox name="sample-checkbox">${t('styleguide.checkbox.default')}</rrr-checkbox>
                  <rrr-checkbox name="sample-checkbox-checked" checked>${t('styleguide.checkbox.checked')}</rrr-checkbox>
                </div>
                <div class="component-column">
                  <rrr-checkbox name="sample-checkbox-invalid" invalid error-text="${t('dialog.validation.required')}">${t('styleguide.checkbox.invalid')}</rrr-checkbox>
                  <rrr-checkbox name="sample-checkbox-disabled" disabled>${t('styleguide.checkbox.disabled')}</rrr-checkbox>
                </div>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.toasts')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.toasts.description')}</p>
              <div class="button-row trigger-grid">
                <rrr-button type="button" tone="info" data-toast-trigger="info">${t('styleguide.toasts.trigger.info')}</rrr-button>
                <rrr-button type="button" tone="success" data-toast-trigger="success">${t('styleguide.toasts.trigger.success')}</rrr-button>
                <rrr-button type="button" tone="warning" data-toast-trigger="warning">${t('styleguide.toasts.trigger.warning')}</rrr-button>
                <rrr-button type="button" tone="danger" data-toast-trigger="danger">${t('styleguide.toasts.trigger.danger')}</rrr-button>
                <rrr-button type="button" variant="outline" tone="neutral" data-toast-trigger="neutral">${t('styleguide.toasts.trigger.neutral')}</rrr-button>
                <rrr-button type="button" variant="outline" tone="neutral" data-toast-trigger="closable">${t('styleguide.toasts.trigger.closable')}</rrr-button>
                <rrr-button type="button" variant="ghost" tone="accent" data-toast-trigger="action">${t('styleguide.toasts.trigger.action')}</rrr-button>
                <rrr-button type="button" variant="ghost" tone="primary" data-toast-trigger="burst">${t('styleguide.toasts.trigger.burst')}</rrr-button>
              </div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.colors')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.colors.description')}</p>
              <div class="swatch-groups">${this.renderColorPaletteShowcase()}</div>
            </div>
            </div>
          </rrr-section>

          <rrr-section>
            <span slot="heading">${t('styleguide.section.scales')}</span>
            <div class="rrr-card">
            <div class="showcase-block">
              <p class="sample-text">${t('styleguide.scales.description')}</p>
              <div class="scale-groups">${this.renderTokenScales()}</div>
            </div>
            </div>
          </rrr-section>
        </div>
      </section>
    `

    this.initializeSwatches()
  }

  private initializeSwatches(): void {
    const swatches = this.querySelectorAll<HTMLElement>('.swatch[data-swatch-token]')
    if (swatches.length === 0) {
      return
    }

    const rootStyles = getComputedStyle(document.documentElement)

    swatches.forEach((swatch) => {
      const tokenName = swatch.dataset.swatchToken
      const tokenValue = tokenName ? rootStyles.getPropertyValue(tokenName).trim() : ''
      const backgroundColor = tokenValue || getComputedStyle(swatch).backgroundColor
      const rgb = parseColorToRgb(backgroundColor)
      if (!rgb) {
        return
      }

      const valueElement = swatch.querySelector<HTMLElement>('[data-swatch-value]')
      if (valueElement) {
        valueElement.textContent = rgbToHslLabel(rgb.r, rgb.g, rgb.b)
      }

      const luminance = toRelativeLuminance(rgb.r, rgb.g, rgb.b)
      swatch.dataset.swatchDark = luminance < 0.45 ? 'true' : 'false'
    })
  }
}

function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  const rgb = parseRgbColor(color)
  if (rgb) {
    return rgb
  }

  const oklch = parseOklchColor(color)
  if (oklch) {
    return oklchToRgb(oklch.l, oklch.c, oklch.h)
  }

  return null
}

function parseRgbColor(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/rgba?\(([^)]+)\)/i)
  const channelSource = match?.[1]
  if (!channelSource) {
    return null
  }

  const channels = channelSource
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()))

  if (channels.length < 3 || channels.some((channel) => Number.isNaN(channel))) {
    return null
  }

  const [r, g, b] = channels
  if (r === undefined || g === undefined || b === undefined) {
    return null
  }

  return {
    r,
    g,
    b,
  }
}

function parseOklchColor(color: string): { l: number; c: number; h: number } | null {
  const match = color.match(/oklch\(\s*([-\d.]+)%\s+([-\d.]+)\s+([-\d.]+)(?:deg)?(?:\s*\/\s*[-\d.%]+)?\s*\)/i)
  const lightnessText = match?.[1]
  const chromaText = match?.[2]
  const hueText = match?.[3]

  if (!lightnessText || !chromaText || !hueText) {
    return null
  }

  const lightness = Number.parseFloat(lightnessText) / 100
  const chroma = Number.parseFloat(chromaText)
  const hue = Number.parseFloat(hueText)

  if (Number.isNaN(lightness) || Number.isNaN(chroma) || Number.isNaN(hue)) {
    return null
  }

  return {
    l: lightness,
    c: chroma,
    h: hue,
  }
}

function oklchToRgb(lightness: number, chroma: number, hue: number): { r: number; g: number; b: number } {
  const hueRadians = hue * Math.PI / 180
  const a = chroma * Math.cos(hueRadians)
  const b = chroma * Math.sin(hueRadians)

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b

  const l = lPrime ** 3
  const m = mPrime ** 3
  const s = sPrime ** 3

  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const toSrgb = (channel: number): number => {
    const clampedLinear = Math.max(0, Math.min(1, channel))
    const srgb = clampedLinear <= 0.0031308
      ? 12.92 * clampedLinear
      : 1.055 * (clampedLinear ** (1 / 2.4)) - 0.055

    return Math.max(0, Math.min(255, srgb * 255))
  }

  return {
    r: toSrgb(linearR),
    g: toSrgb(linearG),
    b: toSrgb(linearB),
  }
}

function rgbToHslLabel(r: number, g: number, b: number): string {
  const red = r / 255
  const green = g / 255
  const blue = b / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  const lightness = (max + min) / 2
  let saturation = 0

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))

    switch (max) {
      case red:
        hue = 60 * (((green - blue) / delta) % 6)
        break
      case green:
        hue = 60 * ((blue - red) / delta + 2)
        break
      default:
        hue = 60 * ((red - green) / delta + 4)
        break
    }
  }

  if (hue < 0) {
    hue += 360
  }

  return `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}, ${Math.round(lightness * 100)})`
}

function toRelativeLuminance(r: number, g: number, b: number): number {
  const normalize = (channel: number): number => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  const red = normalize(r)
  const green = normalize(g)
  const blue = normalize(b)

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

customElements.define('rrr-styleguide', RrrStyleguide)
