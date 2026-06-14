import { registerRrrCard } from './rrr-card.ts'
import { registerRrrButton } from './rrr-button.ts'
import { registerRrrCheckbox } from './rrr-checkbox.ts'
import { registerRrrDialogHost } from './rrr-dialog-host.ts'
import { registerRrrInput } from './rrr-input.ts'
import { registerRrrIcon } from './rrr-icon.ts'

export function registerDesignSystemComponents(): void {
  registerRrrButton()
  registerRrrInput()
  registerRrrCheckbox()
  registerRrrIcon()
  registerRrrCard()
  registerRrrDialogHost()
}
