import type { CardHolderType, CardStatus } from '../domain/fuelCard'

export interface CardEvent {
  at: string
  by: string
  kind: 'created' | 'blocked' | 'unblocked' | 'limits'
  comment: string
}

export interface FuelCardApi {
  no: string
  number: string
  supplierNo: string
  holderType: CardHolderType
  vehicleNo: string | null
  driverNo: string | null
  expiresOn: string
  monthlyAmount: number | null
  monthlyVolumeL: number | null
  transactionsPerDay: number | null
  zones: string[]
  startHour: number | null
  endHour: number | null
  blockedAt: string | null
  blockReason: string
  history: CardEvent[]
  holderName: string
  supplierName: string
  status: CardStatus
  monthAmount: number
  monthLiters: number
  /** Share of the monthly cap used: in amount, else in volume; none without a cap. */
  usagePct: number | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type FuelCardSearchColumn = 'no' | 'number' | 'holderName' | 'no,number,holderName'
