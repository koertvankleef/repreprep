import { t } from '../../../i18n/index.ts'
import styles from './rrr-language-settings.css?inline'

export class RrrLanguageSettings extends HTMLElement {
  static observedAttributes = ['language']

  private readonly handleChange = (event: Event): void => {
    const row = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement
        && node.tagName.toLowerCase() === 'rrr-list-row'
        && node.dataset.language !== undefined)

    const language = row?.getAttribute('value')
    if (!language) {
      return
    }

    this.dispatchEvent(new CustomEvent('rrr-language-preference-change', {
      bubbles: true,
      composed: true,
      detail: { language },
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
    const language = this.getAttribute('language') ?? 'auto'

    this.innerHTML = `
      <style>${styles}</style>
      <div class="page">
        <rrr-section>
          <rrr-list-card role="radiogroup" aria-label="${t('app.settings.language')}">
            <rrr-list-row
              control="radio"
              name="language"
              value="auto"
              label="${t('app.language.auto')}"
              ${language === 'auto' ? 'checked' : ''}
              data-language
            >
              <rrr-icon slot="leading" name="arrow-sync"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              control="radio"
              name="language"
              value="en-US"
              label="${t('app.language.english')}"
              ${language === 'en-US' ? 'checked' : ''}
              data-language
            >
              <rrr-icon slot="leading" name="language"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              control="radio"
              name="language"
              value="nl-NL"
              label="${t('app.language.dutch')}"
              ${language === 'nl-NL' ? 'checked' : ''}
              data-language
            >
              <rrr-icon slot="leading" name="language"></rrr-icon>
            </rrr-list-row>
          </rrr-list-card>
        </rrr-section>
      </div>
    `
  }
}

customElements.define('rrr-language-settings', RrrLanguageSettings)
