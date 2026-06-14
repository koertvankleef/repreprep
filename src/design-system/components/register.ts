import { registerRrrCard } from './rrr-card.ts'
import { registerRrrDialogHost } from './rrr-dialog-host.ts'

export function registerDesignSystemComponents(): void {
  registerRrrCard()
  registerRrrDialogHost()
}
