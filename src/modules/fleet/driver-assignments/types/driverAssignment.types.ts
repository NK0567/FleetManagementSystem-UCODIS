import type { PeriodState } from '@/modules/fleet/shared/domain/period'

export interface DriverAssignmentApi {
  no: string
  employeeNo: string
  vehicleNo: string
  startDate: string
  endDate: string | null
  employeeName: string
  vehiclePlate: string
  coupledTrailerPlate: string
  state: PeriodState
  durationDays: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DriverAssignmentSearchColumn =
  | 'no'
  | 'employeeName'
  | 'vehiclePlate'
  | 'no,employeeName,vehiclePlate'
