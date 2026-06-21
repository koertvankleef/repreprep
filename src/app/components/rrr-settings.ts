import { t } from '../../i18n/index.ts'
import { shadowTypographyStyles } from '../../design-system/shadow-styles.ts'
import styles from './rrr-settings.css?inline'

const componentStyles = `${shadowTypographyStyles}\n${styles}`

export class RrrSettings extends HTMLElement {
  static observedAttributes = ['styleguide-enabled', 'contrast']

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

    const styleguideEnabled = this.getAttribute('styleguide-enabled') === 'true'
    const contrast = this.getAttribute('contrast') ?? 'normal'

    this.shadowRoot.innerHTML = `
      <style>${componentStyles}</style>
      <div class="page">
        <section class="settings-section">
          <h2 class="settings-section-title">${t('app.settings.navigation')}</h2>
          <div class="settings-card">
            <a class="settings-link" href="#/import-export">
              <rrr-icon name="arrow-export-up"></rrr-icon>
              <span>${t('app.nav.importExport')}</span>
            </a>
            ${styleguideEnabled ? `
              <a class="settings-link" href="#/styleguide">
                <rrr-icon name="braces"></rrr-icon>
                <span>${t('app.nav.styleguide')}</span>
              </a>
            ` : ''}
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section-title">${t('app.settings.display')}</h2>
          <div class="settings-card">
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
