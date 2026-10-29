export const OPERATION_NATURES = ['check', 'lubricate', 'replace'] as const
export type OperationNature = (typeof OPERATION_NATURES)[number]

export interface MaintenanceOperation {
  /** Numbered by the server when the operation is added; kept for life so its passages stay attached. */
  no: string
  label: string
  subsystemNo: string
  nature: OperationNature
  intervalKm: number | null
  /** Engine hours between two passages, read on the hour meter of the vehicle. */
  intervalHours: number | null
  intervalDays: number | null
}

export type OperationIssue = 'label' | 'subsystem' | 'interval' | 'intervalPositive'

type IntervalFields = 'intervalKm' | 'intervalHours' | 'intervalDays'

export function operationIssues(
  operation: Pick<MaintenanceOperation, 'label' | 'subsystemNo' | 'intervalKm' | 'intervalDays'> &
    Partial<Pick<MaintenanceOperation, 'intervalHours'>>
): OperationIssue[] {
  const issues: OperationIssue[] = []
  if (!operation.label.trim()) issues.push('label')
  if (!operation.subsystemNo) issues.push('subsystem')
  const intervals = (['intervalKm', 'intervalHours', 'intervalDays'] as IntervalFields[]).map(
    (field) => operation[field] ?? null
  )
  if (intervals.some((value) => value !== null && !(value > 0))) issues.push('intervalPositive')
  else if (intervals.every((value) => value === null)) issues.push('interval')
  return issues
}

/** A model is its make and its model name: every vehicle of the model follows the model's plan. */
export function modelCode(vehicle: { make: string; model: string }): string {
  return `${vehicle.make}|${vehicle.model}`
}

export function modelLabel(code: string): string {
  return code.replace('|', ' ')
}
