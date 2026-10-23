import { addDays } from '@/utils/date'
import type { EquipmentDueState } from '../types/vehicle.types'

/** Due state of an equipment check or replacement; null when the equipment has no due date. */
export function equipmentDueState(
  dueDate: string | null,
  noticeDays: number,
  today: string
): EquipmentDueState | null {
  if (!dueDate) return null
  if (dueDate < today) return 'overdue'
  return dueDate <= addDays(today, noticeDays) ? 'due_soon' : 'ok'
}
