import { createCrudService } from '@/core/factories'
import { tripApi } from '../api/tripApi'
import type { TripApi, TripSearchColumn } from '../types/trip.types'

export const tripService = {
  ...createCrudService<TripApi, TripSearchColumn>(tripApi),
  async start(no: string, startOdometerKm: number | null): Promise<TripApi> {
    return (await tripApi.start(no, startOdometerKm)).data.data
  },
  async passStop(no: string): Promise<TripApi> {
    return (await tripApi.passStop(no)).data.data
  },
  async complete(no: string, endOdometerKm: number): Promise<TripApi> {
    return (await tripApi.complete(no, endOdometerKm)).data.data
  },
  async close(no: string): Promise<TripApi> {
    return (await tripApi.close(no)).data.data
  },
  async cancel(no: string, reason: string): Promise<TripApi> {
    return (await tripApi.cancel(no, reason)).data.data
  }
}
