import type {
  MaintenanceType,
  WorkOrderOrigin,
  WorkOrderSeverity,
  WorkOrderStatus
} from '../domain/workOrder'

export interface WorkOrderDiagnosis {
  subsystemNo: string
  modeNo: string | null
  causeNo: string | null
  by: string
  at: string
}

export interface LabourLine {
  technicianNo: string
  date: string
  hours: number
  loggedBy: string
}

/** The order handed to an outside garage: the order keeps its diagnosis, only who does the work changes. */
export interface ExternalWork {
  providerNo: string
  handedOverAt: string
  expectedReturnOn: string | null
  quoteAmount: number | null
  progress: string
  returnedAt: string | null
  finalAmount: number | null
}

export interface WorkOrderEvent {
  at: string
  by: string
  kind:
    | 'declared'
    | 'diagnosed'
    | 'started'
    | 'labour'
    | 'handed_over'
    | 'external_update'
    | 'returned'
    | 'completed'
    | 'refused'
    | 'validated'
    | 'cancelled'
  comment: string
}

export interface WorkOrderApi {
  no: string
  vehicleNo: string
  maintenanceType: MaintenanceType
  severity: WorkOrderSeverity
  origin: WorkOrderOrigin
  /** The record that opened the order: a check, an inspection, a claim, an event… */
  originNo: string | null
  symptom: string
  declaredAt: string
  declaredBy: string
  odometerKmAtOpening: number | null
  diagnosis: WorkOrderDiagnosis | null
  labour: LabourLine[]
  startedAt: string | null
  completedAt: string | null
  completedBy: string | null
  workDone: string
  odometerKmAtCompletion: number | null
  validatedAt: string | null
  validatedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string
  /** The downtime this order keeps open; it ends when the order is validated or cancelled. */
  downtimeNo: string | null
  external: ExternalWork | null
  history: WorkOrderEvent[]
  vehiclePlate: string
  subsystemName: string
  modeName: string
  causeName: string
  technicianNames: string
  labourHours: number
  labourCost: number
  providerName: string
  subcontractingCost: number
  totalCost: number
  status: WorkOrderStatus
  diagnosedAt: string | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type WorkOrderSearchColumn = 'no' | 'vehiclePlate' | 'symptom' | 'no,vehiclePlate,symptom'
