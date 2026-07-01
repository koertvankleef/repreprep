import { registerRrrBadge } from './rrr-badge.ts'
import { registerRrrButton } from './rrr-button.ts'
import { registerRrrCheckbox } from './rrr-checkbox.ts'
import { registerRrrDialogHost } from './rrr-dialog-host.ts'
import { registerRrrDateField } from './rrr-date-field.ts'
import { registerRrrDatePicker } from './rrr-date-picker.ts'
import { registerRrrInput } from './rrr-input.ts'
import { registerRrrIcon } from './rrr-icon.ts'
import { registerRrrListCard } from './rrr-list-card.ts'
import { registerRrrListRow } from './rrr-list-row.ts'
import { registerRrrSection } from './rrr-section.ts'
import { registerRrrSequence } from './rrr-sequence.ts'
import { registerRrrSequenceGutter } from './rrr-sequence-gutter.ts'
import { registerRrrSelect } from './rrr-select.ts'
import { registerRrrSheet } from './rrr-sheet.ts'
import { registerRrrTextarea } from './rrr-textarea.ts'
import { registerRrrTooltip } from './rrr-tooltip.ts'

export function registerDesignSystemComponents(): void {
  registerRrrBadge()
  registerRrrButton()
  registerRrrInput()
  registerRrrTextarea()
  registerRrrSelect()
  registerRrrCheckbox()
  registerRrrDatePicker()
  registerRrrDateField()
  registerRrrIcon()
  registerRrrSection()
  registerRrrSequence()
  registerRrrSequenceGutter()
  registerRrrListCard()
  registerRrrListRow()
  registerRrrSheet()
  registerRrrDialogHost()
  registerRrrTooltip()
}
