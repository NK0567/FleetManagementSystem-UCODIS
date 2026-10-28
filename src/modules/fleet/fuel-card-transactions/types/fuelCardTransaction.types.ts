import type { OverrunCode } from '@/modules/fleet/fuel-cards/domain/fuelCard'

export const MATCH_MODES = ['auto', 'manual', 'detached'] as const
export type MatchMode = (typeof MATCH_MODES)[number]

export interface CardOverrun {
  code: OverrunCode
  detail: string
}

export interface FuelCardTransactionApi {
  no: string
  cardNo: string
  transactedAt: string
  station: string
  city: string
  liters: number
  amount: number
  refillNo: string | null
  matched: boolean
  /** How the refill was matched; a detached transaction is never matched again on its own. */
  matchMode: MatchMode | null
  cardNumber: string
  holderName: string
  overruns: CardOverrun[]
  overrunCount: number
  /** The refill an automatic match would pick. */
  candidateNo: string | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type FuelCardTransactionSearchColumn =
  | 'no'
  | 'cardNumber'
  | 'station'
  | 'city'
  | 'no,cardNumber,station,city'
