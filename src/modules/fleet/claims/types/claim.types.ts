import type { FileMeta } from '@/types/file.types'
import type { ClaimStatus, InsuranceStatus } from '../domain/claim'

export const CLAIM_NATURES = ['accident', 'incident'] as const
export type ClaimNature = (typeof CLAIM_NATURES)[number]

export const CLAIM_SEVERITIES = [
  'minor_damage',
  'major_damage',
  'bodily_injury',
  'environmental'
] as const
export type ClaimSeverity = (typeof CLAIM_SEVERITIES)[number]

export const CLAIM_LIABILITIES = ['to_determine', 'company', 'third_party', 'shared'] as const
export type ClaimLiability = (typeof CLAIM_LIABILITIES)[number]

export interface ClaimEvent {
  at: string
  by: string
  kind: 'reported' | 'insurance' | 'closed'
  insuranceStatus: InsuranceStatus | null
  comment: string
}

export interface ClaimApi {
  /** The work order opened from this record, if any. */
  workOrderNo: string | null
  repairOpen: boolean
  /** Unavailability cause the repair put on the vehicle, from the codification. */
  downtimeCode: string | null
  downtimeCodeName: string
  downtimeOpen: boolean
  no: string
  nature: ClaimNature
  occurredAt: string
  vehicleNo: string
  driverNo: string | null
  location: string
  severity: ClaimSeverity
  odometerKm: number | null
  circumstances: string
  thirdParties: string
  damageAmount: number | null
  liability: ClaimLiability
  /** Policy covering the vehicle that day, found by the server; fixed once declared. */
  policyNo: string | null
  insuranceStatus: InsuranceStatus
  indemnityAmount: number | null
  analysis: string
  sanction: string
  photoFileNos: string[]
  status: ClaimStatus
  closedAt: string | null
  closedBy: string | null
  history: ClaimEvent[]
  vehiclePlate: string
  driverName: string
  policyNumber: string
  insurerName: string
  residualCost: number
  photos: FileMeta[]
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ClaimSearchColumn =
  | 'no'
  | 'vehiclePlate'
  | 'driverName'
  | 'location'
  | 'no,vehiclePlate,driverName,location'
