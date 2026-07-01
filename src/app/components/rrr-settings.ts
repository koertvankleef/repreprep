import type { RrrSheet } from '../../design-system/components/rrr-sheet.ts'
import { getLocale, t } from '../../i18n/index.ts'
import { presentSheet } from '../../utils/sheet-service.ts'
import styles from './rrr-settings.css?inline'

export class RrrSettings extends HTMLElement {
  static observedAttributes = ['styleguide-enabled', 'theme', 'language']

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return
    this.render()
  }

  private async deleteAppData(): Promise<void> {
    const sheet = document.createElement('rrr-sheet') as RrrSheet
    const todayDigits = this.getTodayDigits()
    const dateFormat = this.getLocalizedDateFormat()

    sheet.innerHTML = `
      <h3 slot="heading" class="sheet-title">${t('app.settings.resetData.title')}</h3>
      <p slot="description" class="sheet-message">${t('app.settings.resetData.description')}</p>
      <div slot="body">
      <p class="reset-sheet-warning">${t('app.settings.resetData.warning')}</p>
        <div class="rrr-card reset-sheet-card">
          <label class="reset-confirm-label" for="reset-date-confirm">${t('app.settings.resetData.prompt', { format: dateFormat })}</label>
          <input
            id="reset-date-confirm"
            class="reset-confirm-input"
            name="reset-date-confirm"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            spellcheck="false"
            maxlength="8"
            placeholder="${dateFormat}"
            aria-describedby="reset-confirm-hint"
            autofocus
          >
          <p id="reset-confirm-hint" class="reset-confirm-hint">${t('app.settings.resetData.validation')}</p>
        </div>
      </div>
      <rrr-button
        slot="actions"
        type="button"
        tone="danger"
        data-sheet-result="confirm"
        disabled
      >${t('app.settings.resetData.confirm')}</rrr-button>
    `

    const input = sheet.querySelector<HTMLInputElement>('input[name="reset-date-confirm"]')
    const hint = sheet.querySelector<HTMLElement>('.reset-confirm-hint')
    const confirmButton = sheet.querySelector<HTMLElement>('[data-sheet-result="confirm"]')

    const syncConfirmationState = (): void => {
      if (!input || !hint || !confirmButton) {
        return
      }

      const ready = input.value === todayDigits
      confirmButton.toggleAttribute('disabled', !ready)
      hint.hidden = ready
    }

    input?.addEventListener('input', () => {
      const digitsOnly = input.value.replace(/\D/g, '').slice(0, 8)
      if (input.value !== digitsOnly) {
        input.value = digitsOnly
      }
      syncConfirmationState()
    })

    const result = await presentSheet(sheet, { owner: this })
    if (result !== 'confirm' || input?.value !== todayDigits) {
      return
    }

    this.dispatchEvent(new CustomEvent('rrr-clear-data-request', {
      bubbles: true,
      composed: true,
    }))
  }

  private getTodayDigits(): string {
    const locale = getLocale()
    const parts = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date())

    return parts
      .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
      .map((part) => part.value.replace(/\D/g, ''))
      .join('')
  }

  private getLocalizedDateFormat(): string {
    const parts = new Intl.DateTimeFormat(getLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date())

    return parts
      .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
      .map((part) => {
        if (part.type === 'day') return 'DD'
        if (part.type === 'month') return 'MM'
        return 'YYYY'
      })
      .join('')
  }

  private render(): void {
    const styleguideEnabled = this.getAttribute('styleguide-enabled') === 'true'
    const theme = this.getAttribute('theme') ?? 'auto'
    const language = this.getAttribute('language') ?? 'auto'
    const themeLabel = theme === 'light'
      ? t('app.theme.light')
      : theme === 'dark'
        ? t('app.theme.dark')
        : t('app.theme.auto')
    const languageLabel = language === 'en-US'
      ? t('app.language.english')
      : language === 'nl-NL'
        ? t('app.language.dutch')
        : t('app.language.auto')

    this.innerHTML = `
      <style>${styles}</style>
      <div class="page">
        ${styleguideEnabled ? `
          <rrr-section>
            <div class="rrr-list-card">
              <rrr-list-row
                href="#/settings/styleguide"
                label="${t('app.settings.styleguide')}"
                accessory="chevron"
              >
                <rrr-icon slot="leading" name="braces"></rrr-icon>
              </rrr-list-row>
            </div>
          </rrr-section>
        ` : ''}

        <rrr-section>
          <span slot="heading">${t('app.settings.display')}</span>
          <div class="rrr-list-card">
            <rrr-list-row
              href="#/settings/appearance"
              label="${t('app.settings.appearance')}"
              description="${t('app.settings.appearanceDescription')}"
              value-text="${themeLabel}"
              accessory="value-chevron"
            >
              <rrr-icon slot="leading" name="color"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              href="#/settings/language"
              label="${t('app.settings.language')}"
              value-text="${languageLabel}"
              accessory="value-chevron"
            >
              <rrr-icon slot="leading" name="language"></rrr-icon>
            </rrr-list-row>
          </div>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('app.settings.data')}</span>
          <div class="rrr-list-card">
            <rrr-list-row
              href="#/settings/import-export"
              label="${t('app.settings.importExport')}"
              accessory="chevron"
            >
              <rrr-icon slot="leading" name="arrow-export-up"></rrr-icon>
            </rrr-list-row>
            <rrr-list-row
              activation="button"
              label="${t('app.settings.resetData.open')}"
              description="${t('app.settings.resetData.description')}"
              data-action="delete-app-data"
              tone="danger"
            >
              <rrr-icon slot="leading" name="delete"></rrr-icon>
            </rrr-list-row>
          </div>
        </rrr-section>
      </div>
    `

    this.querySelector<HTMLElement>('rrr-list-row[data-action="delete-app-data"]')
      ?.addEventListener('click', () => void this.deleteAppData())
  }
}

customElements.define('rrr-settings', RrrSettings)
