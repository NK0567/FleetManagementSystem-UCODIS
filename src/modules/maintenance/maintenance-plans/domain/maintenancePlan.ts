export const OPERATION_NATURES = ['check', 'lubricate', 'replace'] as const
export type OperationNature = (typeof OPERATION_NATURES)[number]

export interface MaintenanceOperation {
  /** Numbered by the server when the operation is added; kept for life so its passages stay attached. */
  no: string
  label: string
  subsystemNo: string
  nature: OperationNature
  intervalKm: number | null
  intervalDays: number | null
}

export type OperationIssue = 'label' | 'subsystem' | 'interval' | 'intervalPositive'

export function operationIssues(
  operation: Pick<MaintenanceOperation, 'label' | 'subsystemNo' | 'intervalKm' | 'intervalDays'>
): OperationIssue[] {
  const issues: OperationIssue[] = []
  if (!operation.label.trim()) issues.push('label')
  if (!operation.subsystemNo) issues.push('subsystem')
  const intervals = [operation.intervalKm, operation.intervalDays]
  if (intervals.some((value) => value !== null && !(value > 0))) issues.push('intervalPositive')
  else if (intervals.every((value) => value === null)) issues.push('interval')
  return issues
}
