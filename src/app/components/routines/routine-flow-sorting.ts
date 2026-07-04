import type {
  SequenceSortStatusDetail,
} from '../../../design-system/components/rrr-sequence.ts'
import { announcePolite } from '../../../foundation/announcer.ts'
import { t } from '../../../i18n/index.ts'

export function announceRoutineFlowSort(detail: SequenceSortStatusDetail): void {
  announcePolite(t(`routineDetail.reorder.${detail.status}`, {
    exercise: detail.label,
    position: detail.position,
    count: detail.count,
  }))
}
