import type { PeriodState } from '@/modules/fleet/shared/domain/period'

export interface CouplingApi {
  no: string
  tractorNo: string
  trailerNo: string
  startDate: string
  endDate: string | null
  tractorPlate: string
  trailerPlate: string
  trailerTypeName: string
  state: PeriodState
  durationDays: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type CouplingSearchColumn =
  | 'no'
  | 'tractorPlate'
  | 'trailerPlate'
  | 'no,tractorPlate,trailerPlate'
