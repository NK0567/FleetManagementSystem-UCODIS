import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DriverDrivingTimeApi, TripDrivingTimeApi } from '../types/drivingTime.types'

/** Driving time of a trip or of a driver, checked against the limits of the fleet settings. */
export const drivingTimeService = {
  async ofTrip(no: string): Promise<TripDrivingTimeApi> {
    const path = `${resourcePath('/fleet/trips', no)}/driving-time`
    return (await httpClient.get<SingleResponse<TripDrivingTimeApi>>(path)).data.data
  },
  async ofDriver(no: string): Promise<DriverDrivingTimeApi> {
    const path = `${resourcePath('/fleet/drivers', no)}/driving-time`
    return (await httpClient.get<SingleResponse<DriverDrivingTimeApi>>(path)).data.data
  }
}
