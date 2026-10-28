import { liveMapApi } from '../api/liveMapApi'
import type { LivePositionApi } from '../types/liveMap.types'

export const liveMapService = {
  async positions(): Promise<LivePositionApi[]> {
    return (await liveMapApi.positions()).data.data
  }
}
