import { createCrudService } from '@/core/factories'
import { tripDebriefApi } from '../api/tripDebriefApi'
import type { TripDebriefApi, TripDebriefSearchColumn } from '../types/tripDebrief.types'

export const tripDebriefService = {
  ...createCrudService<TripDebriefApi, TripDebriefSearchColumn>(tripDebriefApi),
  async sign(no: string, party: 'driver' | 'manager'): Promise<TripDebriefApi> {
    return (await tripDebriefApi.sign(no, party)).data.data
  },
  async close(no: string): Promise<TripDebriefApi> {
    return (await tripDebriefApi.close(no)).data.data
  }
}
