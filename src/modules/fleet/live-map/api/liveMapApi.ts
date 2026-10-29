import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { LivePositionApi } from '../types/liveMap.types'

export const liveMapApi = {
  positions: () => httpClient.get<SingleResponse<LivePositionApi[]>>('/fleet/live/positions'),
  simulation: () => httpClient.get<SingleResponse<SimulationState>>('/fleet/live/simulation'),
  setSimulation: (body: { active?: boolean; reset?: boolean }) =>
    httpClient.post<SingleResponse<SimulationState>>('/fleet/live/simulation', body)
}

/** The demonstration clock that moves the vehicles on the road. */
export interface SimulationState {
  active: boolean
  offsetMin: number
}
