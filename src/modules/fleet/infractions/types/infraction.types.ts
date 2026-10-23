import type { InfractionSeverity } from '@/modules/fleet/infraction-types'
import type { InfractionOutcome, InfractionSource, InfractionStatus } from '../domain/infraction'

export interface InfractionEvent {
  at: string
  by: string
  kind: 'recorded' | 'taken' | 'closed'
  comment: string
}

export interface InfractionApi {
  no: string
  infractionTypeNo: string
  occurredAt: string
  location: string
  vehicleNo: string
  driverNo: string | null
  severity: InfractionSeverity
  fineAmount: number | null
  detail: string
  source: InfractionSource
  handlerCode: string | null
  outcome: InfractionOutcome | null
  outcomeComment: string
  closedAt: string | null
  history: InfractionEvent[]
  infractionTypeName: string
  vehiclePlate: string
  driverName: string
  status: InfractionStatus
  upheld: boolean
  /** Training the outcome sent the driver to. */
  trainingNo: string | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type InfractionSearchColumn =
  | 'no'
  | 'vehiclePlate'
  | 'driverName'
  | 'location'
  | 'no,vehiclePlate,driverName,location'
