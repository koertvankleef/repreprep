import { getLocale, t } from '../../i18n/index.ts'
import styles from './rrr-settings.css?inline'

export class RrrSettings extends HTMLElement {
  static observedAttributes = ['styleguide-enabled', 'theme']
  private resetPanelOpen = false
  private resetDateInput = ''

  private readonly handleClick = (event: Event): void => {
    const actionTarget = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.dataset.action !== undefined)

    if (!actionTarget) {
      return
    }

    const action = actionTarget.dataset.action

    if (action === 'open-reset-data') {
      this.resetPanelOpen = true
      this.resetDateInput = ''
      this.render()
      return
    }

    if (action === 'cancel-reset-data') {
      this.resetPanelOpen = false
      this.resetDateInput = ''
      this.render()
      return
    }

    if (action === 'confirm-reset-data' && this.canConfirmReset()) {
      this.dispatchEvent(new CustomEvent('rrr-clear-data-request', { bubbles: true, composed: true }))
      this.resetPanelOpen = false
      this.resetDateInput = ''
      this.render()
    }
  }

  private readonly handleInput = (event: Event): void => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || target.name !== 'reset-date-confirm') {
      return
    }

    const digitsOnly = target.value.replace(/\D/g, '').slice(0, 8)
    if (target.value !== digitsOnly) {
      target.value = digitsOnly
    }

    this.resetDateInput = digitsOnly
    this.syncResetConfirmationState()
  }

  connectedCallback(): void {
    this.addEventListener('click', this.handleClick)
    this.addEventListener('input', this.handleInput)
    this.render()
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('input', this.handleInput)
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return
    this.render()
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

  private getTodayLocalizedDate(): string {
    return new Intl.DateTimeFormat(getLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date())
  }

  private canConfirmReset(): boolean {
    return this.resetDateInput.length === 8 && this.resetDateInput === this.getTodayDigits()
  }

  private syncResetConfirmationState(): void {
    const confirmButton = this.querySelector<HTMLButtonElement>('[data-action="confirm-reset-data"]')
    if (confirmButton) {
      confirmButton.disabled = !this.canConfirmReset()
    }

    const hint = this.querySelector<HTMLElement>('.reset-confirm-hint')
    if (hint) {
      hint.textContent = this.canConfirmReset() ? t('app.settings.resetData.ready') : t('app.settings.resetData.validation')
      hint.dataset.state = this.canConfirmReset() ? 'ready' : 'pending'
    }
  }

  private render(): void {
    const styleguideEnabled = this.getAttribute('styleguide-enabled') === 'true'
    const theme = this.getAttribute('theme') ?? 'auto'
    const themeLabel = theme === 'light'
      ? t('app.theme.light')
      : theme === 'dark'
        ? t('app.theme.dark')
        : t('app.theme.auto')

    this.innerHTML = `
      <style>${styles}</style>
      <div class="page">
        <rrr-section>
          <span slot="heading">${t('app.settings.navigation')}</span>
          <rrr-list-card>
            <rrr-list-row
              href="#/import-export"
              label="${t('app.nav.importExport')}"
              accessory="chevron"
            >
              <rrr-icon slot="leading" name="arrow-export-up"></rrr-icon>
            </rrr-list-row>
            ${styleguideEnabled ? `
              <rrr-list-row
                href="#/styleguide"
                label="${t('app.nav.styleguide')}"
                accessory="chevron"
              >
                <rrr-icon slot="leading" name="braces"></rrr-icon>
              </rrr-list-row>
            ` : ''}
          </rrr-list-card>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('app.settings.display')}</span>
          <rrr-list-card>
            <rrr-list-row
              href="#/settings/appearance"
              label="${t('app.settings.appearance')}"
              description="${t('app.settings.appearanceDescription')}"
              value-text="${themeLabel}"
              accessory="value-chevron"
            >
              <rrr-icon slot="leading" name="color"></rrr-icon>
            </rrr-list-row>
          </rrr-list-card>
        </rrr-section>

        <rrr-section>
          <span slot="heading">${t('app.settings.data')}</span>
          <rrr-list-card class="danger-card">
            <div class="danger-card-content">
              <h3 class="danger-title">${t('app.settings.resetData.title')}</h3>
              <p class="danger-copy">${t('app.settings.resetData.description')}</p>
              <p class="danger-warning">${t('app.settings.resetData.warning')}</p>
            </div>
            <div class="danger-actions">
              <rrr-button type="button" tone="danger" variant="outline" data-action="open-reset-data">${t('app.settings.resetData.open')}</rrr-button>
            </div>
            ${this.resetPanelOpen ? `
              <div class="reset-confirm-panel">
                <label class="reset-confirm-label" for="reset-date-confirm">${t('app.settings.resetData.prompt', { date: this.getTodayLocalizedDate() })}</label>
                <input
                  id="reset-date-confirm"
                  class="reset-confirm-input"
                  name="reset-date-confirm"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  spellcheck="false"
                  maxlength="8"
                  placeholder="${this.getTodayDigits()}"
                  value="${this.resetDateInput}"
                  aria-describedby="reset-confirm-hint"
                >
                <p id="reset-confirm-hint" class="reset-confirm-hint" data-state="${this.canConfirmReset() ? 'ready' : 'pending'}">${this.canConfirmReset() ? t('app.settings.resetData.ready') : t('app.settings.resetData.validation')}</p>
                <div class="reset-confirm-actions">
                  <rrr-button type="button" variant="ghost" data-action="cancel-reset-data">${t('action.cancel')}</rrr-button>
                  <rrr-button type="button" tone="danger" data-action="confirm-reset-data" ${this.canConfirmReset() ? '' : 'disabled'}>${t('app.settings.resetData.confirm')}</rrr-button>
                </div>
              </div>
            ` : ''}
          </rrr-list-card>
        </rrr-section>
      </div>
    `

    this.syncResetConfirmationState()
  }
}

customElements.define('rrr-settings', RrrSettings)
