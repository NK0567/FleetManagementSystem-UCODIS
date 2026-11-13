import type { InfractionLevel, PlanStop, TripDebriefStatus } from '../domain/tripDebrief'

export type TripDebriefApi = {
  no: string
  voucherNo: string
  employeeNo: string
  employeeName: string
  vehicleNo: string
  vehiclePlate: string
  tankNo: string
  loadedOn: string | null
  unloadedOn: string | null
  deliveryPlace: string
  /** Liters gained (positive) or lost (negative) between loading and delivery. */
  gainLoss: number | null
  startKm: number | null
  endKm: number | null
  distanceKm: number | null
  infractionTotal: number
  /** Infractions per 1000 km driven. */
  infractionRate: number | null
  plan: PlanStop[]
  events: string
  actionText: string
  actionOwner: string
  actionDueOn: string | null
  driverSignedOn: string | null
  managerSignedOn: string | null
  closedOn: string | null
  status: TripDebriefStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
} & Record<InfractionLevel, number>

export type TripDebriefSearchColumn =
  | 'no'
  | 'voucherNo'
  | 'employeeName'
  | 'vehiclePlate'
  | 'no,voucherNo,employeeName,vehiclePlate'
