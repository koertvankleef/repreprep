import { t } from '../../i18n/index.ts'
import styles from './rrr-appearance-settings.css?inline'

export class RrrAppearanceSettings extends HTMLElement {
  static observedAttributes = ['theme', 'contrast']

  private readonly handleChange = (event: Event): void => {
    const row = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement
        && node.tagName.toLowerCase() === 'rrr-list-row'
        && node.dataset.preference !== undefined)

    const preference = row?.dataset.preference
    const value = row?.getAttribute('value')
    if (!preference || !value) {
      return
    }

    this.dispatchEvent(new CustomEvent('rrr-display-preference-change', {
      bubbles: true,
      composed: true,
      detail: { preference, value },
    }))
  }

  connectedCallback(): void {
    this.addEventListener('change', this.handleChange)
    this.render()
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.handleChange)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render()
    }
  }

  private render(): void {
    const theme = this.getAttribute('theme') ?? 'auto'
    const contrast = this.getAttribute('contrast') ?? 'normal'

    this.innerHTML = `
      <style>${styles}</style>
      <div class="page">
        <rrr-section>
          <span slot="heading">${t('app.theme.mode')}</span>
          <rrr-list-card role="radiogroup" aria-label="${t('app.theme.mode')}">
            <rrr-list-row
              control="radio"
              name="theme"
              value="auto"
              label="${t('app.theme.auto')}"
              ${theme === 'auto' ? 'checked' : ''}
              data-preference="theme"
            >
              <rrr-icon slot="leading" name="arrow-sync"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              control="radio"
              name="theme"
              value="light"
              label="${t('app.theme.light')}"
              ${theme === 'light' ? 'checked' : ''}
              data-preference="theme"
            >
              <rrr-icon slot="leading" name="weather-sunny"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              control="radio"
              name="theme"
              value="dark"
              label="${t('app.theme.dark')}"
              ${theme === 'dark' ? 'checked' : ''}
              data-preference="theme"
            >
              <rrr-icon slot="leading" name="weather-moon"></rrr-icon>
            </rrr-list-row>
          </rrr-list-card>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('app.theme.contrast')}</span>
          <rrr-list-card role="radiogroup" aria-label="${t('app.theme.contrast')}">
            <rrr-list-row
              control="radio"
              name="contrast"
              value="normal"
              label="${t('app.theme.contrastNormal')}"
              ${contrast === 'normal' ? 'checked' : ''}
              data-preference="contrast"
            >
              <rrr-icon slot="leading" name="circle-half-fill"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              control="radio"
              name="contrast"
              value="high"
              label="${t('app.theme.contrastHigh')}"
              ${contrast === 'high' ? 'checked' : ''}
              data-preference="contrast"
            >
              <rrr-icon slot="leading" name="shield"></rrr-icon>
            </rrr-list-row>
          </rrr-list-card>
        </rrr-section>
      </div>
    `
  }
}

customElements.define('rrr-appearance-settings', RrrAppearanceSettings)
