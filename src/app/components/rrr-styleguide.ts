import { getLocale, t } from '../../i18n/index.ts'
import { toastService, type ToastType } from '../../foundation/toast.ts'
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
      { step: '10', token: '--rrr-colors-balpen-blauw-10' },
      { step: '20', token: '--rrr-colors-balpen-blauw-20' },
      { step: '30', token: '--rrr-colors-balpen-blauw-30' },
      { step: '40', token: '--rrr-colors-balpen-blauw-40' },
      { step: '50', token: '--rrr-colors-balpen-blauw-50' },
      { step: '60', token: '--rrr-colors-balpen-blauw-60', isBrandAnchor: true },
      { step: '70', token: '--rrr-colors-balpen-blauw-70' },
      { step: '80', token: '--rrr-colors-balpen-blauw-80' },
      { step: '90', token: '--rrr-colors-balpen-blauw-90' },
    ],
  },
  {
    titleKey: 'styleguide.palette.accent.title',
    descriptionKey: 'styleguide.palette.accent.description',
    isBrandPalette: true,
    entries: [
      { step: '10', token: '--rrr-colors-magenta-10' },
      { step: '20', token: '--rrr-colors-magenta-20' },
      { step: '30', token: '--rrr-colors-magenta-30' },
      { step: '40', token: '--rrr-colors-magenta-40' },
      { step: '50', token: '--rrr-colors-magenta-50' },
      { step: '60', token: '--rrr-colors-magenta-60', isBrandAnchor: true },
      { step: '70', token: '--rrr-colors-magenta-70' },
      { step: '80', token: '--rrr-colors-magenta-80' },
      { step: '90', token: '--rrr-colors-magenta-90' },
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
    return COLOR_PALETTES.map((palette) => {
      const swatches = palette.entries
        .map((entry) => {
          const marker = palette.isBrandPalette && entry.isBrandAnchor
            ? `<span class="swatch-marker">${t('styleguide.brandAnchor')}</span>`
            : ''

          return `
            <li class="swatch" style="--swatch-color: var(${entry.token});">
              <div class="swatch-chip"></div>
              <div class="swatch-meta">
                <span class="swatch-step">${entry.step}</span>
                ${marker}
              </div>
              <code class="token-name">${entry.token}</code>
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
    }).join('')
  }

  private renderTokenScales(): string {
    return TOKEN_SCALES.map((scale) => {
      const items = scale.tokens.map((token) => {
        const scaleVisual = scale.titleKey === 'styleguide.scale.radius'
          ? `<span class="scale-preview radius" style="border-radius: var(${token});"></span>`
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
    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <div class="intro">
            <h2>${t('styleguide.title')}</h2>
            <p>${t('styleguide.subtitle')}</p>
            <p class="sample-text">${t('styleguide.localOnly')}</p>
            <p class="sample-text">${t('styleguide.localeInfo', { browserLocale: navigator.language, activeLocale: getLocale() })}</p>
          </div>
        </rrr-card>

        <div class="stack">
          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.buttons')}</h3>
              <p class="sample-text">${t('styleguide.buttonGuidance')}</p>
              <div class="button-row role-row">
                <rrr-button type="button">${t('action.save')}</rrr-button>
                <rrr-button type="button" variant="secondary">${t('action.edit')}</rrr-button>
                <rrr-button type="button" variant="danger">${t('action.delete')}</rrr-button>
                <rrr-button type="button" disabled>${t('action.archive')}</rrr-button>
              </div>
              <div class="button-row">
                <rrr-button type="button">${t('styleguide.buttons.primary')}</rrr-button>
                <rrr-button type="button" variant="secondary">${t('styleguide.buttons.secondary')}</rrr-button>
                <rrr-button type="button" variant="danger">${t('styleguide.buttons.danger')}</rrr-button>
              </div>
            </div>
          </rrr-card>

          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.inputs')}</h3>
              <div class="showcase-grid">
                <div class="component-column">
                  <rrr-input label="${t('field.name')}" name="sample-name" placeholder="${t('exercise.form.name.placeholder')}" value="Bench Press"></rrr-input>
                  <rrr-input label="${t('field.date')}" type="date" name="sample-date" value="2026-06-14"></rrr-input>
                </div>
                <div class="component-column">
                  <rrr-input label="${t('styleguide.invalidExample')}" invalid error-text="${t('dialog.validation.required')}" value=""></rrr-input>
                  <rrr-input label="${t('styleguide.disabledExample')}" disabled value="${t('action.save')}"></rrr-input>
                </div>
              </div>
            </div>
          </rrr-card>

          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.checkboxes')}</h3>
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
          </rrr-card>

          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.toasts')}</h3>
              <p class="sample-text">${t('styleguide.toasts.description')}</p>
              <div class="button-row trigger-grid">
                <rrr-button type="button" data-toast-trigger="info">${t('styleguide.toasts.trigger.info')}</rrr-button>
                <rrr-button type="button" data-toast-trigger="success">${t('styleguide.toasts.trigger.success')}</rrr-button>
                <rrr-button type="button" data-toast-trigger="warning">${t('styleguide.toasts.trigger.warning')}</rrr-button>
                <rrr-button type="button" data-toast-trigger="danger">${t('styleguide.toasts.trigger.danger')}</rrr-button>
                <rrr-button type="button" data-toast-trigger="neutral">${t('styleguide.toasts.trigger.neutral')}</rrr-button>
                <rrr-button type="button" variant="secondary" data-toast-trigger="closable">${t('styleguide.toasts.trigger.closable')}</rrr-button>
                <rrr-button type="button" variant="secondary" data-toast-trigger="action">${t('styleguide.toasts.trigger.action')}</rrr-button>
                <rrr-button type="button" variant="secondary" data-toast-trigger="burst">${t('styleguide.toasts.trigger.burst')}</rrr-button>
              </div>
            </div>
          </rrr-card>

          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.colors')}</h3>
              <p class="sample-text">${t('styleguide.colors.description')}</p>
              <div class="swatch-groups">${this.renderColorPaletteShowcase()}</div>
            </div>
          </rrr-card>

          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.scales')}</h3>
              <p class="sample-text">${t('styleguide.scales.description')}</p>
              <div class="scale-groups">${this.renderTokenScales()}</div>
            </div>
          </rrr-card>

          <rrr-card size="lg">
            <div class="showcase-block">
              <h3>${t('styleguide.section.typography')}</h3>
              <div class="component-column">
                <h1>${t('styleguide.typography.heading1')}</h1>
                <h2>${t('styleguide.typography.heading2')}</h2>
                <h3>${t('styleguide.typography.heading3')}</h3>
                <p>${t('styleguide.typography.body')}</p>
              </div>
            </div>
          </rrr-card>
        </div>
      </section>
    `
  }
}

customElements.define('rrr-styleguide', RrrStyleguide)
