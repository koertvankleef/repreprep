import { registerRrrCard } from './rrr-card.ts'
import { registerRrrButton } from './rrr-button.ts'
import { registerRrrCheckbox } from './rrr-checkbox.ts'
import { registerRrrDialogHost } from './rrr-dialog-host.ts'
import { registerRrrInput } from './rrr-input.ts'
import { registerRrrIcon } from './rrr-icon.ts'
import { registerRrrSelect } from './rrr-select.ts'
import { registerRrrTextarea } from './rrr-textarea.ts'

export function registerDesignSystemComponents(): void {
  registerRrrButton()
  registerRrrInput()
  registerRrrTextarea()
  registerRrrSelect()
  registerRrrCheckbox()
  registerRrrIcon()
  registerRrrCard()
  registerRrrDialogHost()
}
