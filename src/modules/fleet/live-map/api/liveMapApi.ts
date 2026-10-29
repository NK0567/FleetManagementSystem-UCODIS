import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  LivePositionApi,
  OnboardReadingsApi,
  TrackHistoryApi,
  VehicleJournalApi
} from '../types/liveMap.types'

export const liveMapApi = {
  positions: () => httpClient.get<SingleResponse<LivePositionApi[]>>('/fleet/live/positions'),
  history: (vehicleNo: string, from: string, to: string) =>
    httpClient.get<SingleResponse<TrackHistoryApi>>(
      `/fleet/live/history/${encodeURIComponent(vehicleNo)}`,
      { params: { from, to } }
    ),
  journal: (vehicleNo: string, from: string, to: string) =>
    httpClient.get<SingleResponse<VehicleJournalApi>>(
      `/fleet/telematics-journal/${encodeURIComponent(vehicleNo)}`,
      { params: { from, to } }
    ),
  readings: (vehicleNo: string) =>
    httpClient.get<SingleResponse<OnboardReadingsApi>>(
      `/fleet/telematics-readings/${encodeURIComponent(vehicleNo)}`
    ),
  simulation: () => httpClient.get<SingleResponse<SimulationState>>('/fleet/live/simulation'),
  setSimulation: (body: { active?: boolean; reset?: boolean }) =>
    httpClient.post<SingleResponse<SimulationState>>('/fleet/live/simulation', body)
}

/** The demonstration clock that moves the vehicles on the road. */
export interface SimulationState {
  active: boolean
  offsetMin: number
}
