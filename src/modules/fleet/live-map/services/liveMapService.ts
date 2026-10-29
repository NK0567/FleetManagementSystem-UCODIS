import { liveMapApi } from '../api/liveMapApi'
import type {
  LivePositionApi,
  OnboardReadingsApi,
  TrackHistoryApi,
  VehicleJournalApi
} from '../types/liveMap.types'

export const liveMapService = {
  async positions(): Promise<LivePositionApi[]> {
    return (await liveMapApi.positions()).data.data
  },
  async history(vehicleNo: string, from: string, to: string): Promise<TrackHistoryApi> {
    return (await liveMapApi.history(vehicleNo, from, to)).data.data
  },
  async readings(vehicleNo: string): Promise<OnboardReadingsApi> {
    return (await liveMapApi.readings(vehicleNo)).data.data
  },
  async journal(vehicleNo: string, from: string, to: string): Promise<VehicleJournalApi> {
    return (await liveMapApi.journal(vehicleNo, from, to)).data.data
  }
}
