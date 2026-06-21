import { t } from '../../i18n/index.ts'
import { shadowTypographyStyles } from '../../design-system/shadow-styles.ts'
import styles from './rrr-settings.css?inline'

const componentStyles = `${shadowTypographyStyles}\n${styles}`

export class RrrSettings extends HTMLElement {
  static observedAttributes = ['return-href', 'theme', 'contrast']

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' })
    this.render()
  }

  attributeChangedCallback(): void {
    if (!this.shadowRoot) return
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot) return

    const returnHref = this.getAttribute('return-href') ?? '#/workouts'
    const theme = this.getAttribute('theme') ?? 'auto'
    const contrast = this.getAttribute('contrast') ?? 'normal'

    this.shadowRoot.innerHTML = `
      <style>${componentStyles}</style>
      <div class="page">
        <header class="settings-header">
          <a class="back-link" href="${returnHref}" aria-label="${t('app.settings.back')}">
            <rrr-icon name="arrow-left"></rrr-icon>
            <span>${t('app.settings.back')}</span>
          </a>
          <h1 class="settings-title">${t('app.settings.title')}</h1>
        </header>

        <section class="settings-section">
          <h2 class="settings-section-title">${t('app.settings.display')}</h2>
          <div class="settings-card">
            <div class="control-row">
              <span class="control-label">${t('app.theme.mode')}</span>
              <div class="control-group" role="group" aria-label="${t('app.theme.mode')}">
                <rrr-tooltip><rrr-button
                  type="button"
                  variant="ghost"
                  data-action="theme-light"
                  aria-pressed="${theme === 'light'}"
                  aria-label="${t('app.theme.light')}"
                  title="${t('app.theme.light')}"
                ><rrr-icon name="weather-sunny"></rrr-icon></rrr-button></rrr-tooltip>
                <rrr-tooltip><rrr-button
                  type="button"
                  variant="ghost"
                  data-action="theme-dark"
                  aria-pressed="${theme === 'dark'}"
                  aria-label="${t('app.theme.dark')}"
                  title="${t('app.theme.dark')}"
                ><rrr-icon name="weather-moon"></rrr-icon></rrr-button></rrr-tooltip>
                <rrr-tooltip><rrr-button
                  type="button"
                  variant="ghost"
                  data-action="theme-auto"
                  aria-pressed="${theme === 'auto'}"
                  aria-label="${t('app.theme.auto')}"
                  title="${t('app.theme.auto')}"
                ><rrr-icon name="arrow-sync"></rrr-icon></rrr-button></rrr-tooltip>
              </div>
            </div>
            <div class="control-row">
              <span class="control-label">${t('app.theme.contrast')}</span>
              <div class="control-group" role="group" aria-label="${t('app.theme.contrast')}">
                <rrr-tooltip><rrr-button
                  type="button"
                  variant="ghost"
                  data-action="contrast-normal"
                  aria-pressed="${contrast === 'normal'}"
                  aria-label="${t('app.theme.contrastNormal')}"
                  title="${t('app.theme.contrastNormal')}"
                ><rrr-icon name="circle-half-fill"></rrr-icon></rrr-button></rrr-tooltip>
                <rrr-tooltip><rrr-button
                  type="button"
                  variant="ghost"
                  data-action="contrast-high"
                  aria-pressed="${contrast === 'high'}"
                  aria-label="${t('app.theme.contrastHigh')}"
                  title="${t('app.theme.contrastHigh')}"
                ><rrr-icon name="shield"></rrr-icon></rrr-button></rrr-tooltip>
              </div>
            </div>
          </div>
        </section>
      </div>
    `
  }
}

customElements.define('rrr-settings', RrrSettings)
