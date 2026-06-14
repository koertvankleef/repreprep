import { storageService } from '../app/storage-instance.ts'
import { t } from '../i18n/index.ts'
import { exportToJson } from '../import-export/json-export-service.ts'
import { importFromJson } from '../import-export/json-import-service.ts'
import { confirmDialog } from '../utils/dialog-service.ts'
import styles from './rrr-import-export.css?inline'

export class RrrImportExport extends HTMLElement {
  private statusMessage = ''
  private statusType: 'success' | 'error' | null = null
  private readonly storageKey = 'repreprep:data'

  connectedCallback(): void {
    this.render()
  }

  private setStatus(message: string, type: 'success' | 'error'): void {
    this.statusMessage = message
    this.statusType = type
    this.render()
  }

  private async handleImport(): Promise<void> {
    const input = this.querySelector<HTMLInputElement>('input[type="file"]')
    const file = input?.files?.[0]

    if (!file) {
      this.setStatus(t('importExport.status.chooseFile'), 'error')
      return
    }

    const confirmed = await confirmDialog({
      title: t('importExport.dialog.title'),
      message: t('importExport.dialog.message'),
      confirmLabel: t('action.import'),
      cancelLabel: t('action.cancel'),
    })

    if (!confirmed) {
      return
    }

    try {
      const data = await importFromJson(file)
      storageService.setData(data)
      window.dispatchEvent(new CustomEvent('rrr-data-changed'))
      this.setStatus(t('importExport.status.importSuccess'), 'success')
      if (input) {
        input.value = ''
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('importExport.status.importError')
      this.setStatus(message, 'error')
    }
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <h2>${t('importExport.title')}</h2>
          <p id="storage-description">${t('importExport.storageDescription')} <code>${this.storageKey}</code>.</p>
          <div>
            <button type="button" data-action="export">${t('importExport.action.export')}</button>
          </div>
          <label>
            ${t('action.import')}
            <input type="file" accept="application/json,.json" aria-describedby="import-helper storage-description" />
          </label>
          <p id="import-helper" class="helper-text">${t('importExport.helper')}</p>
          <div>
            <button type="button" data-action="import">${t('action.import')}</button>
          </div>
          ${
            this.statusType
              ? `<p class="status-message status-${this.statusType}" role="status" aria-live="polite" aria-atomic="true">${this.statusMessage}</p>`
              : `<p class="status-message" role="status" aria-live="polite" aria-atomic="true">${t('importExport.status.default')}</p>`
          }
        </rrr-card>
      </section>
    `

    this.querySelector<HTMLButtonElement>('button[data-action="export"]')?.addEventListener('click', () => {
      exportToJson(storageService.getData())
      this.setStatus(t('importExport.status.exportStarted'), 'success')
    })

    this.querySelector<HTMLButtonElement>('button[data-action="import"]')?.addEventListener('click', () => {
      void this.handleImport()
    })
  }
}

customElements.define('rrr-import-export', RrrImportExport)
