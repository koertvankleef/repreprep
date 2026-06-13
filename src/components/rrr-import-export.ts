import { storageService } from '../app/storage-instance.ts'
import { exportToJson } from '../import-export/json-export-service.ts'
import { importFromJson } from '../import-export/json-import-service.ts'

const styles = `
  .status-success {
    color: var(--rrr-color-success);
  }

  .status-error {
    color: var(--rrr-color-danger);
  }
`

export class RrrImportExport extends HTMLElement {
  private statusMessage = ''
  private statusType: 'success' | 'error' | null = null

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
      this.setStatus('Choose a JSON export file to import', 'error')
      return
    }

    if (!window.confirm('Importing will replace your current local data. Continue?')) {
      return
    }

    try {
      const data = await importFromJson(file)
      storageService.setData(data)
      window.dispatchEvent(new CustomEvent('rrr-data-changed'))
      this.setStatus('Import completed successfully', 'success')
      if (input) {
        input.value = ''
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import the selected file'
      this.setStatus(message, 'error')
    }
  }

  private render(): void {
    this.innerHTML = `
      <style>${styles}</style>
      <section class="page">
        <rrr-card size="lg">
          <h2>Import & Export</h2>
          <p>Your data is stored locally in this browser under <code>repreprep:data</code>.</p>
          <div>
            <button type="button" data-action="export">Export Data</button>
          </div>
          <label>
            Import Data
            <input type="file" accept="application/json,.json" />
          </label>
          <div>
            <button type="button" data-action="import">Import Data</button>
          </div>
          ${
            this.statusType
              ? `<p class="status-${this.statusType}">${this.statusMessage}</p>`
              : '<p>Select a file to replace your current local data.</p>'
          }
        </rrr-card>
      </section>
    `

    this.querySelector<HTMLButtonElement>('button[data-action="export"]')?.addEventListener('click', () => {
      exportToJson(storageService.getData())
      this.setStatus('Export started', 'success')
    })

    this.querySelector<HTMLButtonElement>('button[data-action="import"]')?.addEventListener('click', () => {
      void this.handleImport()
    })
  }
}

customElements.define('rrr-import-export', RrrImportExport)
