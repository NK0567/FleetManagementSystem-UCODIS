import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  LoadingProposalApi,
  ProposalAssignment,
  ProposalCarrierGroup
} from '../types/loadingProposal.types'
import type { TransportOrderApi } from '../types/transportOrder.types'

const basePath = '/planning/transport-orders'
const orderPath = (no: string) => resourcePath(basePath, no)
const replanPath = (no: string, lineNo: number) => `${orderPath(no)}/lines/${lineNo}/replan`

/** Absences, expired documents and couplings over a window, to choose the means (TRS01-US07). */
export interface MeansNotesApi {
  absences: { driverNo: string; reason: string; from: string | null; to: string | null }[]
  expiredVehicles: { vehicleNo: string; documents: string }[]
  couplings: { tractorNo: string; trailerNo: string }[]
}

const unwrap = async <T>(call: Promise<{ data: SingleResponse<T> }>) => (await call).data.data

/** The planning steps of a transport order beyond its lines: plan, replanning and proposal. */
export const orderPlanningService = {
  meansNotes: (from: string, to: string) =>
    unwrap(
      httpClient.get<SingleResponse<MeansNotesApi>>(`${basePath}/means-notes`, {
        params: { from, to }
      })
    ),
  validateRoutePlan: (no: string, corridorKm: number) =>
    unwrap(
      httpClient.post<SingleResponse<TransportOrderApi>>(`${orderPath(no)}/route-plan/validate`, {
        corridorKm
      })
    ),
  changeRoute: (no: string, routeTemplateNo: string, reason: string) =>
    unwrap(
      httpClient.post<SingleResponse<TransportOrderApi>>(`${orderPath(no)}/route-change`, {
        routeTemplateNo,
        reason
      })
    ),
  reschedule: (no: string, plannedDeparture: string) =>
    unwrap(
      httpClient.post<SingleResponse<TransportOrderApi>>(`${orderPath(no)}/reschedule`, {
        plannedDeparture
      })
    ),
  /** Retains a date: the recipient's for an unavailability, the planner's otherwise. */
  replan: (no: string, lineNo: number, date: string | null) =>
    unwrap(
      httpClient.post<SingleResponse<TransportOrderApi>>(
        replanPath(no, lineNo),
        date ? { date } : {}
      )
    ),
  proposeReplanDate: (no: string, lineNo: number, date: string) =>
    unwrap(
      httpClient.post<SingleResponse<TransportOrderApi>>(`${replanPath(no, lineNo)}/propose`, {
        date
      })
    ),
  propose: (date: string) =>
    unwrap(
      httpClient.post<SingleResponse<LoadingProposalApi>>(`${basePath}/loading-proposal`, { date })
    ),
  evaluate: (
    date: string,
    assignments: ProposalAssignment[],
    carrierGroups: ProposalCarrierGroup[]
  ) =>
    unwrap(
      httpClient.post<SingleResponse<LoadingProposalApi>>(`${basePath}/loading-proposal/evaluate`, {
        date,
        assignments,
        carrierGroups
      })
    ),
  validate: (
    date: string,
    assignments: ProposalAssignment[],
    carrierGroups: ProposalCarrierGroup[]
  ) =>
    unwrap(
      httpClient.post<SingleResponse<{ orderNos: string[] }>>(
        `${basePath}/loading-proposal/validate`,
        { date, assignments, carrierGroups }
      )
    )
}
