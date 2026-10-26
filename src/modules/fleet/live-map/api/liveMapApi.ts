import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { LivePositionApi } from '../types/liveMap.types'

export const liveMapApi = {
  positions: () => httpClient.get<SingleResponse<LivePositionApi[]>>('/fleet/live/positions')
}
