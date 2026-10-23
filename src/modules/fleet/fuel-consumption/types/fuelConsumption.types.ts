import type { FuelGapStatus, ReferenceSource } from '../domain/consumption'

/** What was decided about a consumption gap, kept under the stable key of its period. */
export interface FuelGapFile {
  causeNo: string | null
  comment: string
  qualifiedBy: string | null
  qualifiedAt: string | null
  proposedAmount: number | null
  proposedBy: string | null
  proposedAt: string | null
  decisionComment: string
  decidedBy: string | null
  decidedAt: string | null
}

export interface FuelConsumptionApi extends FuelGapFile {
  /** The vehicle and the refill closing the period: it never changes. */
  no: string
  vehicleNo: string
  vehiclePlate: string
  driverName: string
  openingNo: string
  closingNo: string
  from: string
  to: string
  km: number
  liters: number
  l100: number | null
  referenceL100: number
  referenceSource: ReferenceSource
  gapPct: number | null
  excessCost: number
  co2Kg: number
  status: FuelGapStatus
  causeName: string
  /** A deduction can be charged for this cause. */
  chargeable: boolean
}

export interface FuelConsumptionSummary {
  liters: number
  amount: number
  /** Total litres over total distance of the measured periods. */
  averageL100: number | null
  co2Kg: number
  refillsToQualify: number
  gapsToQualify: number
}

export type FuelConsumptionSearchColumn = 'vehiclePlate' | 'driverName' | 'vehiclePlate,driverName'
