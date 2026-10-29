import type { TyreStatus } from '../domain/tyre'

export type TyreAlert = 'none' | 'safety' | 'rotation'

export interface TyreStint {
  vehicleNo: string
  positionCode: string
  fromKm: number
  toKm: number | null
  mountedAt: string
  dismountedAt: string | null
}

export interface TyreReading {
  at: string
  pressureBar: number
  treadMm: number
  by: string
}

export interface TyreEvent {
  at: string
  kind:
    | 'purchased'
    | 'mounted'
    | 'dismounted'
    | 'reading'
    | 'rotated'
    | 'sent_retreading'
    | 'back_retreading'
    | 'scrapped'
  detail: string
  by: string
}

export interface TyreApi {
  no: string
  serialNumber: string
  make: string
  size: string
  dotCode: string
  retreaded: boolean
  supplierNo: string | null
  price: number
  purchaseDate: string
  stints: TyreStint[]
  /** Where the rotation clock starts: the last mounting or rotation. */
  rotationFrom: { km: number; date: string } | null
  readings: TyreReading[]
  retreadCount: number
  retreadCost: number
  retreadingSince: string | null
  scrappedAt: string | null
  scrapReason: string
  history: TyreEvent[]
  status: TyreStatus
  vehicleNo: string | null
  vehiclePlate: string
  positionCode: string
  kmRun: number
  totalCost: number
  costPerKm: number | null
  lastReading: TyreReading | null
  safetyIssues: ('pressure' | 'tread')[]
  alert: TyreAlert
  supplierName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TyreSearchColumn =
  | 'no'
  | 'serialNumber'
  | 'make'
  | 'vehiclePlate'
  | 'no,serialNumber,make,vehiclePlate'

export interface TyrePositionSlot {
  code: string
  axleLabel: string
  axleRank: number | null
  side: string | null
  spare: boolean
  tyreNo: string | null
  /** The tyre mounted there, if any, and what it calls for. */
  serialNumber?: string | null
  alert?: TyreAlert | null
}
