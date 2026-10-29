export const WORK_ORDER_STATUSES = [
  'open',
  'diagnosed',
  'in_progress',
  'awaiting_parts',
  'awaiting_validation',
  'closed',
  'cancelled'
] as const
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

export const MAINTENANCE_TYPES = ['corrective', 'preventive', 'improvement'] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export const WORK_ORDER_SEVERITIES = ['minor', 'major', 'critical'] as const
export type WorkOrderSeverity = (typeof WORK_ORDER_SEVERITIES)[number]

export const WORK_ORDER_ORIGINS = [
  'driver_report',
  'workshop_finding',
  'vehicle_check',
  'road_checklist',
  'inspection',
  'preventive',
  'mobile_team',
  'telematics',
  'claim',
  'history'
] as const
export type WorkOrderOrigin = (typeof WORK_ORDER_ORIGINS)[number]

/** Origins someone may pick by hand; the others come from the record that opened the order. */
export const MANUAL_ORIGINS: readonly WorkOrderOrigin[] = ['driver_report', 'workshop_finding']

/** Most a technician can log on one day, all orders together. */
export const MAX_HOURS_PER_DAY = 12

export interface WorkOrderFacts {
  diagnosedAt: string | null
  startedAt: string | null
  completedAt: string | null
  validatedAt: string | null
  cancelledAt: string | null
  /** Parts of the order; a bought part not received yet holds the order. */
  parts?: readonly { purchaseRequestNo: string | null; receivedAt: string | null }[]
}

/** A part bought for the order and not received yet. */
export function awaitsPart(order: Pick<WorkOrderFacts, 'parts'>): boolean {
  return (order.parts ?? []).some((part) => !!part.purchaseRequestNo && !part.receivedAt)
}

export function workOrderStatus(order: WorkOrderFacts): WorkOrderStatus {
  if (order.cancelledAt) return 'cancelled'
  if (order.validatedAt) return 'closed'
  if (order.completedAt) return 'awaiting_validation'
  if (awaitsPart(order)) return 'awaiting_parts'
  if (order.startedAt) return 'in_progress'
  return order.diagnosedAt ? 'diagnosed' : 'open'
}

/** Work can still be done on it: diagnosed, logged, waiting for a part, declared finished. */
export function isWorkable(status: WorkOrderStatus): boolean {
  return (
    status === 'open' ||
    status === 'diagnosed' ||
    status === 'in_progress' ||
    status === 'awaiting_parts'
  )
}

/**
 * Opening a repair order stops the vehicle at once, whatever the severity: it goes into
 * maintenance under the cause code of the order. A preventive service only stops it once the work
 * starts, or once a part has to be bought for it.
 */
export function immobilizesOnDeclaration(order: {
  maintenanceType: MaintenanceType
  severity?: WorkOrderSeverity
}): boolean {
  return order.maintenanceType !== 'preventive'
}

export type DowntimeRoleOfOrder = 'breakdown' | 'preventive' | 'accident'

export function downtimeRoleOf(order: {
  maintenanceType: MaintenanceType
  origin: WorkOrderOrigin
}): DowntimeRoleOfOrder {
  if (order.origin === 'claim') return 'accident'
  return order.maintenanceType === 'preventive' ? 'preventive' : 'breakdown'
}

export type DiagnosisGap = 'subsystem' | 'mode' | 'cause'

/** A service needs the subsystem worked on; a breakdown also needs how it failed and why. */
export function diagnosisGaps(
  maintenanceType: MaintenanceType,
  diagnosis: { subsystemNo: string | null; modeNo: string | null; causeNo: string | null }
): DiagnosisGap[] {
  const gaps: DiagnosisGap[] = []
  if (!diagnosis.subsystemNo) gaps.push('subsystem')
  if (maintenanceType !== 'preventive') {
    if (!diagnosis.modeNo) gaps.push('mode')
    if (!diagnosis.causeNo) gaps.push('cause')
  }
  return gaps
}

export type FourEyesBlock = 'completedBy' | 'technician'

/** Whoever validates the work did not declare it finished and did not do it. */
export function fourEyesBlock(
  validator: { code: string; employeeNo: string | null },
  order: {
    completedBy: string | null
    labour: readonly { technicianNo: string; loggedBy: string }[]
  }
): FourEyesBlock | null {
  if (order.completedBy === validator.code) return 'completedBy'
  const worked = order.labour.some(
    (line) =>
      line.loggedBy === validator.code ||
      (!!validator.employeeNo && line.technicianNo === validator.employeeNo)
  )
  return worked ? 'technician' : null
}

/** Still at the outside garage: handed over and not back yet. */
export function isAtExternalWorkshop(order: {
  external: { returnedAt: string | null } | null
}): boolean {
  return !!order.external && !order.external.returnedAt
}

/** The final invoice once known, else the quote. */
export function subcontractingCost(
  external: { quoteAmount: number | null; finalAmount: number | null } | null
): number {
  return external ? (external.finalAmount ?? external.quoteAmount ?? 0) : 0
}

export function labourHours(labour: readonly { hours: number }[]): number {
  return Math.round(labour.reduce((total, line) => total + line.hours, 0) * 100) / 100
}
