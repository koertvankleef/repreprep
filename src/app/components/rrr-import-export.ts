import { storageService } from '../storage-instance.ts'
import { t } from '../../i18n/index.ts'
import { exportToJson } from '../../import-export/json-export-service.ts'
import { importFromJson } from '../../import-export/json-import-service.ts'
import styles from './rrr-import-export.css?inline'
import { confirmSheet } from '../../utils/sheet-service.ts'
import { toastService } from '../../foundation/toast.ts'

export class RrrImportExport extends HTMLElement {
  private readonly storageKey = 'repreprep:data'

  connectedCallback(): void {
    this.render()
  }

  private async handleImport(): Promise<void> {
    const input = this.querySelector<HTMLInputElement>('input[type="file"]')
    const file = input?.files?.[0]

    if (!file) {
      toastService.danger(t('importExport.status.chooseFile'))
      return
    }

    const confirmed = await confirmSheet({
      title: t('importExport.dialog.title'),
      message: t('importExport.dialog.message'),
      confirmLabel: t('action.import'),
    })

    if (!confirmed) {
      return
    }

    try {
      const data = await importFromJson(file)
      storageService.setData(data)
      window.dispatchEvent(new CustomEvent('rrr-data-changed'))
      
      if (input) {
        input.value = ''
      }
      
      toastService.success(t('importExport.status.importSuccess'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('importExport.status.importError')
      toastService.danger(message)
    }
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <div class="page">
      <p>${t('importExport.storageDescription')}.</p>
        <rrr-section>
          <div class="rrr-list-card">
        
            <rrr-list-row
              activation="button"
              label="${t('importExport.action.export')}"
              data-action="export"
            >
              <rrr-icon slot="leading" name="arrow-download"></rrr-icon>
            </rrr-list-row>
        
            <rrr-list-row
              activation="button"
              label="${t('action.import')}"
              description="${t('importExport.helper')}"
              data-action="import"
            >
              <rrr-icon slot="leading" name="arrow-export-up"></rrr-icon>
            </rrr-list-row>

          </div>
          <label>
            <input type="file" accept="application/json,.json" aria-describedby="import-helper" />
          </label>
        </rrr-section>
      </div>
    `

    this.querySelector<HTMLElement>('rrr-list-row[data-action="export"]')?.addEventListener('click', () => {
      try {
        exportToJson(storageService.getData())
      } catch (error) {
        const message = error instanceof Error ? error.message : t('importExport.status.exportError')
        toastService.danger(message)
      }
    })

    this.querySelector<HTMLElement>('rrr-list-row[data-action="import"]')?.addEventListener('click', () => {
      void this.handleImport()
    })
  }
}

customElements.define('rrr-import-export', RrrImportExport)
