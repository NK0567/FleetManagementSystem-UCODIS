import type { FileMeta } from '@/types/file.types'
import type { RefillChannel, RefillCheckCode, RefillStatus } from '../domain/refill'

export interface RefillQualification {
  causeNo: string
  comment: string
  by: string
  at: string
}

export interface RefillCheck {
  code: RefillCheckCode
  ok: boolean
  /** What was found, in the language of the request. */
  detail: string
}

export interface FuelRefillApi {
  no: string
  refueledAt: string
  vehicleNo: string
  driverNo: string | null
  tripNo: string | null
  stationSiteNo: string | null
  stationName: string
  latitude: number | null
  longitude: number | null
  liters: number
  unitPrice: number
  odometerKm: number
  fullTank: boolean
  channel: RefillChannel
  receiptFileNo: string | null
  transactionNo: string | null
  qualification: RefillQualification | null
  vehiclePlate: string
  driverName: string
  stationLabel: string
  amount: number
  checks: RefillCheck[]
  status: RefillStatus
  receipt: FileMeta | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type FuelRefillSearchColumn =
  | 'no'
  | 'vehiclePlate'
  | 'driverName'
  | 'stationLabel'
  | 'no,vehiclePlate,driverName,stationLabel'

/** What happened to one line of an imported file. */
export interface RefillImportResult {
  line: number
  no: string | null
  error: string | null
}

export interface RefillImportReport {
  created: number
  rejected: number
  results: RefillImportResult[]
}
