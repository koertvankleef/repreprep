import { getLocale, t } from '../../i18n/index.ts'
import styles from './rrr-styleguide.css?inline'

type ColorToken = {
  name: string
  value: string
  textColor?: string
}

const colorTokens: ColorToken[] = [
  { name: '--rrr-color-primary', value: 'var(--rrr-color-primary)', textColor: 'var(--rrr-color-primary-contrast)' },
  { name: '--rrr-color-secondary', value: 'var(--rrr-color-secondary)', textColor: '#ffffff' },
  { name: '--rrr-color-background', value: 'var(--rrr-color-background)' },
  { name: '--rrr-color-surface', value: 'var(--rrr-color-surface)' },
  { name: '--rrr-color-text', value: 'var(--rrr-color-text)', textColor: '#ffffff' },
  { name: '--rrr-color-text-muted', value: 'var(--rrr-color-text-muted)', textColor: '#ffffff' },
  { name: '--rrr-color-border', value: 'var(--rrr-color-border)' },
  { name: '--rrr-color-danger', value: 'var(--rrr-color-danger)', textColor: '#ffffff' },
  { name: '--rrr-color-success', value: 'var(--rrr-color-success)', textColor: '#ffffff' },
]

export class RrrStyleguide extends HTMLElement {
  connectedCallback(): void {
    this.render()
  }

  private renderColorSwatches(): string {
    return colorTokens
      .map(
        (token) => `
          <article class="swatch">
            <div class="swatch-chip" style="background:${token.value}; color:${token.textColor ?? 'var(--rrr-color-text)'};"></div>
            <div class="token-name">${token.name}</div>
          </article>
        `,
      )
      .join('')
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
              <div class="button-row">
                <rrr-button type="button">${t('action.save')}</rrr-button>
                <rrr-button type="button" variant="secondary">${t('action.edit')}</rrr-button>
                <rrr-button type="button" variant="danger">${t('action.delete')}</rrr-button>
                <rrr-button type="button" disabled>${t('action.archive')}</rrr-button>
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
              <h3>${t('styleguide.section.colors')}</h3>
              <div class="swatch-grid">${this.renderColorSwatches()}</div>
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
