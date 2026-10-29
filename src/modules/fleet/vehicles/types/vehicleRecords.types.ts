import type {
  MaintenanceType,
  WorkOrderStatus
} from '@/modules/maintenance/work-orders/domain/workOrder'

/** One line of the maintenance log of a vehicle: a work order or a plan operation done. */
export interface VehicleMaintenanceEntry {
  kind: 'work_order' | 'service'
  no: string
  date: string
  label: string
  maintenanceType: MaintenanceType
  status: WorkOrderStatus | null
  km: number | null
  cost: number | null
  workOrderNo?: string | null
}

/** Total cost of ownership: the acquisition plus the running costs since the vehicle came in. */
export interface VehicleOwnershipCostApi {
  vehicleNo: string
  from: string
  to: string
  km: number
  acquisition: number
  /** False when no acquisition cost is recorded on the vehicle: the total then lacks it. */
  acquisitionKnown: boolean
  maintenance: number
  fuel: number
  tyres: number
  insurance: number
  total: number
  costPerKm: number | null
  /** Shown beside the total, not deducted from it. */
  residualValue: number | null
}
